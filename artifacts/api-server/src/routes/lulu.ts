import { Router, type IRouter, type Request } from "express";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db, booksTable, coloringPagesTable } from "@workspace/db";
import {
  generateInteriorPdf,
  generateCoverPdf,
  generateSimpleCoverPdf,
  uploadPdfBuffer,
} from "../lib/pdfGeneration";
import {
  createLuluPrintJob,
  getLuluPrintJobStatus,
  getLuluPrintJob,
  getLuluCoverDimensions,
  calculateLuluCost,
  getLuluShippingOptions,
  COLORING_BOOK_POD_PACKAGE_ID,
  type ShippingAddress,
  type ShippingLevel,
} from "../lib/lulu";
import { logger } from "../lib/logger";
import { requireUser } from "../middlewares/requireUser";

const router: IRouter = Router();

router.use(requireUser());

async function loadOwnedBook(bookId: number, userId: string | undefined) {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId));
  if (!book) return null;
  if (userId && book.userId !== userId) return null;
  return book;
}

function getPublicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  // Behind Apache/NGINX the original public host comes via X-Forwarded-Host.
  // It can be a comma-separated list (NGINX in front of Apache may both set
  // it) — first value is the client-visible host. Fall back to the raw Host
  // header for non-proxied requests (e.g. local dev).
  const xfh = req.get("x-forwarded-host");
  const host = xfh ? xfh.split(",")[0].trim() : req.get("host");
  return `${req.protocol}://${host}`;
}

router.post("/books/:id/generate-pdf", async (req, res): Promise<void> => {
  const bookId = parseInt(req.params.id, 10);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book ID" });
    return;
  }

  const book = await loadOwnedBook(bookId, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const pages = await db
    .select()
    .from(coloringPagesTable)
    .where(eq(coloringPagesTable.bookId, bookId))
    .orderBy(asc(coloringPagesTable.sortOrder));

  const readyPages = pages.filter((p) => p.status === "ready" && p.coloringImagePath);
  if (readyPages.length < 2) {
    res.status(400).json({ error: "At least 2 ready coloring pages are required to generate a PDF" });
    return;
  }

  try {
    logger.info({ bookId }, "Generating interior PDF");
    const interiorBuffer = await generateInteriorPdf(readyPages, book.title, book.dedication);
    const pdfPath = await uploadPdfBuffer(interiorBuffer, `${book.title}-interior.pdf`);

    logger.info({ bookId }, "Generating cover PDF");
    let coverPdfBuffer: Buffer;
    const templateId = (book.coverTemplate ?? "classic") as import("../lib/pdfGeneration").CoverTemplate;

    try {
      const coverDimensions = await getLuluCoverDimensions(readyPages.length);
      coverPdfBuffer = await generateCoverPdf(
        book.title,
        book.subtitle,
        readyPages.length,
        coverDimensions,
        {
          templateId,
          tagline: book.coverTagline,
          coverImagePath: book.coverImagePath,
        }
      );
    } catch (err) {
      logger.warn({ err }, "Failed to get Lulu cover dimensions, using simple cover");
      coverPdfBuffer = await generateSimpleCoverPdf(
        book.title,
        book.subtitle,
        readyPages.length,
        templateId,
        book.coverTagline,
        book.coverImagePath
      );
    }

    const coverPdfPath = await uploadPdfBuffer(coverPdfBuffer, `${book.title}-cover.pdf`);

    await db
      .update(booksTable)
      .set({ pdfPath, coverPdfPath })
      .where(eq(booksTable.id, bookId));

    const base = getPublicBaseUrl(req);
    const interiorUrl = `${base}/api/storage/objects${pdfPath.replace(/^\/objects/, "")}`;
    const coverUrl = `${base}/api/storage/objects${coverPdfPath.replace(/^\/objects/, "")}`;

    res.json({
      pdfPath,
      coverPdfPath,
      interiorUrl,
      coverUrl,
      pageCount: readyPages.length,
    });
  } catch (err) {
    logger.error({ err, bookId }, "Failed to generate PDF");
    res.status(500).json({ error: `Failed to generate PDF: ${(err as Error).message}` });
  }
});

const ShippingAddressSchema = z.object({
  name: z.string().min(1),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state_code: z.string().optional(),
  country_code: z.string().length(2),
  postcode: z.string().min(1),
  phone_number: z.string().min(8),
  email: z.string().email(),
  is_business: z.boolean().optional(),
});

const LuluOrderBodySchema = z.object({
  contactEmail: z.string().email(),
  shippingAddress: ShippingAddressSchema,
  shippingLevel: z.enum(["MAIL", "PRIORITY_MAIL", "GROUND", "EXPEDITED", "EXPRESS"]),
});

router.post("/books/:id/lulu-order", async (req, res): Promise<void> => {
  const bookId = parseInt(req.params.id, 10);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book ID" });
    return;
  }

  const parsed = LuluOrderBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const book = await loadOwnedBook(bookId, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  if (!book.pdfPath || !book.coverPdfPath) {
    res.status(400).json({ error: "Book PDF not generated yet. Call /books/:id/generate-pdf first." });
    return;
  }

  const base = getPublicBaseUrl(req);
  const interiorUrl = `${base}/api/storage/objects${book.pdfPath!.replace(/^\/objects/, "")}`;
  const coverUrl = `${base}/api/storage/objects${book.coverPdfPath!.replace(/^\/objects/, "")}`;

  const pages = await db
    .select()
    .from(coloringPagesTable)
    .where(eq(coloringPagesTable.bookId, bookId));

  const pageCount = pages.filter((p) => p.status === "ready").length;

  try {
    const { contactEmail, shippingAddress, shippingLevel } = parsed.data;

    logger.info({ bookId, interiorUrl, coverUrl }, "Creating Lulu print job");

    const printJob = await createLuluPrintJob({
      bookTitle: book.title,
      externalId: `colorgifts-${bookId}`,
      interiorPdfUrl: interiorUrl,
      coverPdfUrl: coverUrl,
      pageCount,
      shippingAddress: shippingAddress as ShippingAddress,
      contactEmail,
      shippingLevel: shippingLevel as ShippingLevel,
    });

    await db
      .update(booksTable)
      .set({
        luluPrintJobId: String(printJob.id),
        luluStatus: printJob.status?.name ?? "CREATED",
        status: "ordered",
      })
      .where(eq(booksTable.id, bookId));

    res.json({
      printJobId: printJob.id,
      status: printJob.status,
      estimatedShipping: printJob.estimated_shipping_dates,
      costs: printJob.costs,
    });
  } catch (err) {
    logger.error({ err, bookId }, "Failed to create Lulu print job");
    res.status(500).json({ error: `Failed to create print order: ${(err as Error).message}` });
  }
});

router.get("/books/:id/lulu-status", async (req, res): Promise<void> => {
  const bookId = parseInt(req.params.id, 10);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book ID" });
    return;
  }

  const book = await loadOwnedBook(bookId, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  if (!book.luluPrintJobId) {
    res.status(404).json({ error: "No Lulu print job associated with this book" });
    return;
  }

  try {
    const printJob = await getLuluPrintJob(book.luluPrintJobId);

    await db
      .update(booksTable)
      .set({ luluStatus: printJob.status?.name })
      .where(eq(booksTable.id, bookId));

    res.json({
      printJobId: printJob.id,
      status: printJob.status,
      estimatedShipping: printJob.estimated_shipping_dates,
      lineItems: printJob.line_items,
    });
  } catch (err) {
    logger.error({ err, bookId }, "Failed to get Lulu status");
    res.status(500).json({ error: `Failed to get order status: ${(err as Error).message}` });
  }
});

// Returns Lulu's available shipping options + per-option pricing for a given
// destination country and a book's current page count. Use this on checkout to
// let the buyer pick a shipping level before placing the print order.
router.post("/books/:id/shipping-options", async (req, res): Promise<void> => {
  const bookId = parseInt(req.params.id, 10);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book ID" });
    return;
  }

  const parsed = z
    .object({
      countryCode: z.string().length(2),
      currency: z.string().length(3).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const book = await loadOwnedBook(bookId, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const pages = await db
    .select()
    .from(coloringPagesTable)
    .where(eq(coloringPagesTable.bookId, bookId));

  const pageCount = pages.filter((p) => p.status === "ready").length;
  if (pageCount === 0) {
    res.status(400).json({ error: "No ready pages found" });
    return;
  }

  try {
    const options = await getLuluShippingOptions(pageCount, parsed.data.countryCode, parsed.data.currency);
    res.json({ options });
  } catch (err) {
    logger.error({ err, bookId }, "Failed to get Lulu shipping options");
    res.status(500).json({ error: `Failed to get shipping options: ${(err as Error).message}` });
  }
});

router.post("/books/:id/lulu-cost", async (req, res): Promise<void> => {
  const bookId = parseInt(req.params.id, 10);
  if (isNaN(bookId)) {
    res.status(400).json({ error: "Invalid book ID" });
    return;
  }

  const parsed = z
    .object({
      shippingAddress: ShippingAddressSchema,
      shippingLevel: z.enum(["MAIL", "PRIORITY_MAIL", "GROUND", "EXPEDITED", "EXPRESS"]),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const book = await loadOwnedBook(bookId, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const pages = await db
    .select()
    .from(coloringPagesTable)
    .where(eq(coloringPagesTable.bookId, bookId));

  const pageCount = pages.filter((p) => p.status === "ready").length;
  if (pageCount === 0) {
    res.status(400).json({ error: "No ready pages found" });
    return;
  }

  try {
    const cost = await calculateLuluCost(
      pageCount,
      parsed.data.shippingAddress as ShippingAddress,
      parsed.data.shippingLevel as ShippingLevel
    );
    res.json(cost);
  } catch (err) {
    res.status(500).json({ error: `Failed to calculate cost: ${(err as Error).message}` });
  }
});

export default router;
