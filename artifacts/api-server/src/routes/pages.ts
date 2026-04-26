import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, booksTable, coloringPagesTable } from "@workspace/db";
import {
  GetPageParams,
  DeletePageParams,
  RegeneratePageParams,
  UpdatePageParams,
  UpdatePageBody,
} from "@workspace/api-zod";
import { generateColoringPage } from "../lib/aiProcessing";
import { requireUser } from "../middlewares/requireUser";
import { deletePageWithFile } from "../lib/bookCleanup";

const router: IRouter = Router();

router.use(requireUser());

async function loadOwnedPage(pageId: number, userId: string | undefined) {
  const [page] = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.id, pageId));
  if (!page) return null;
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, page.bookId));
  if (!book) return null;
  if (userId && book.userId !== userId) return null;
  return page;
}

router.get("/pages/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetPageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const page = await loadOwnedPage(params.data.id, req.userId);
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.json(page);
});

router.patch("/pages/:id", async (req: Request, res: Response): Promise<void> => {
  const params = UpdatePageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await loadOwnedPage(params.data.id, req.userId);
  if (!existing) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  await db.update(coloringPagesTable).set(parsed.data).where(eq(coloringPagesTable.id, params.data.id));
  const [page] = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.id, params.data.id));
  res.json(page);
});

router.delete("/pages/:id", async (req: Request, res: Response): Promise<void> => {
  const params = DeletePageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const page = await loadOwnedPage(params.data.id, req.userId);
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  await deletePageWithFile(params.data.id, req.log);
  res.sendStatus(204);
});

router.post("/pages/:id/regenerate", async (req: Request, res: Response): Promise<void> => {
  const params = RegeneratePageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const page = await loadOwnedPage(params.data.id, req.userId);
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  await db.update(coloringPagesTable).set({ status: "generating" }).where(eq(coloringPagesTable.id, page.id));

  try {
    const coloringPath = await generateColoringPage(page.originalImagePath, "detailed");
    await db.update(coloringPagesTable).set({
      status: "ready",
      coloringImagePath: coloringPath,
    }).where(eq(coloringPagesTable.id, page.id));
    const [updated] = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.id, page.id));
    res.json(updated);
  } catch (err) {
    req.log.error({ err, pageId: page.id }, "Coloring page generation failed");
    await db.update(coloringPagesTable).set({ status: "failed" }).where(eq(coloringPagesTable.id, page.id));
    res.status(500).json({ error: "Generation failed" });
  }
});

export default router;
