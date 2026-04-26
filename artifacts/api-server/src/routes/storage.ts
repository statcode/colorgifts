import express, { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import {
  newLocalUploadId,
  localObjectPath,
  writeLocalUploadStream,
  readLocalUploadStream,
  LocalUploadNotFoundError,
} from "../lib/localObjectStorage";
import { requireUser } from "../middlewares/requireUser";
import { watermarkImage } from "../lib/watermark";

const router: IRouter = Router();

/**
 * POST /storage/uploads/request-url
 *
 * Issue a per-file upload URL. The client sends JSON metadata (name, size,
 * contentType) — NOT the file — then PUTs the bytes to the returned URL.
 */
router.post("/storage/uploads/request-url", requireUser(), async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;
  const id = newLocalUploadId();
  res.json(
    RequestUploadUrlResponse.parse({
      uploadURL: `/api/storage/local-upload/${id}?contentType=${encodeURIComponent(contentType)}`,
      objectPath: localObjectPath(id),
      metadata: { name, size, contentType },
    }),
  );
});

/**
 * PUT /storage/local-upload/:id
 *
 * Target for the upload URL returned by /storage/uploads/request-url. The
 * client PUTs raw file bytes; we persist them to the uploads directory with
 * a sidecar content-type record.
 */
router.put(
  "/storage/local-upload/:id",
  requireUser(),
  express.raw({ type: "*/*", limit: "50mb" }),
  async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const contentType =
        (typeof req.query.contentType === "string" && req.query.contentType) ||
        req.header("content-type") ||
        "application/octet-stream";

      const body = Readable.from(req.body as Buffer);
      await writeLocalUploadStream(id, body, contentType);
      res.sendStatus(204);
    } catch (error) {
      if (error instanceof LocalUploadNotFoundError) {
        res.status(404).json({ error: "Invalid upload id" });
        return;
      }
      req.log.error({ err: error }, "Error writing local upload");
      res.status(500).json({ error: "Failed to write upload" });
    }
  },
);

/**
 * GET /storage/objects/uploads/:id
 *
 * Serve a previously uploaded object. Wildcard form preserved for URL
 * compatibility, but only `uploads/<id>` is a valid shape.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

  const match = /^uploads\/([^/]+)$/.exec(wildcardPath);
  if (!match) {
    res.status(404).json({ error: "Object not found" });
    return;
  }

  try {
    const { stream, size, contentType } = await readLocalUploadStream(match[1]);

    // Direct-navigation accesses (typing URL, right-click "Open image in new tab",
    // "Save image as") should not hand out the clean artwork. Browsers set
    // Sec-Fetch-Dest: image only when the URL is used inside <img>. Anything
    // else — document, empty, or absent — gets a baked-in watermark.
    // Callers can also opt in via ?watermark=1 to force watermarking even for
    // embedded <img> usage (e.g., the book-preview page).
    const fetchDest = String(req.header("sec-fetch-dest") ?? "").toLowerCase();
    const isEmbeddedImage = fetchDest === "image";
    const isImageFile = contentType.startsWith("image/");
    const forceWatermark = req.query.watermark === "1";

    if (isImageFile && (forceWatermark || !isEmbeddedImage)) {
      try {
        const { buffer, contentType: outType } = await watermarkImage(stream);
        res.setHeader("Content-Type", outType);
        res.setHeader("Content-Length", String(buffer.length));
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(buffer);
        return;
      } catch (err) {
        req.log.error({ err }, "Watermarking failed; refusing direct access");
        res.status(403).json({ error: "Direct image access is not permitted" });
        return;
      }
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(size));
    res.setHeader("Cache-Control", "private, max-age=3600");
    stream.on("error", (err) => {
      req.log.error({ err }, "Error streaming local upload");
      if (!res.headersSent) res.status(500).end();
      else res.destroy(err);
    });
    stream.pipe(res);
  } catch (error) {
    if (error instanceof LocalUploadNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error reading local upload");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
