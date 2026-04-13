import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, coloringPagesTable } from "@workspace/db";
import {
  GetPageParams,
  DeletePageParams,
  RegeneratePageParams,
} from "@workspace/api-zod";
import { generateColoringPage } from "../lib/aiProcessing";

const router: IRouter = Router();

router.get("/pages/:id", async (req, res): Promise<void> => {
  const params = GetPageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [page] = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.id, params.data.id));
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.json(page);
});

router.delete("/pages/:id", async (req, res): Promise<void> => {
  const params = DeletePageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [page] = await db.delete(coloringPagesTable).where(eq(coloringPagesTable.id, params.data.id)).returning();
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/pages/:id/regenerate", async (req, res): Promise<void> => {
  const params = RegeneratePageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [page] = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.id, params.data.id));
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  await db.update(coloringPagesTable).set({ status: "generating" }).where(eq(coloringPagesTable.id, page.id));

  try {
    const coloringPath = await generateColoringPage(page.originalImagePath, "detailed");
    const [updated] = await db.update(coloringPagesTable).set({
      status: "ready",
      coloringImagePath: coloringPath,
    }).where(eq(coloringPagesTable.id, page.id)).returning();
    res.json(updated);
  } catch (err) {
    await db.update(coloringPagesTable).set({ status: "failed" }).where(eq(coloringPagesTable.id, page.id));
    res.status(500).json({ error: "Generation failed" });
  }
});

export default router;
