import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, photosTable } from "@workspace/db";
import {
  CreatePhotoBody,
  DeletePhotoParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/photos", async (req, res): Promise<void> => {
  const parsed = CreatePhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [photo] = await db.insert(photosTable).values(parsed.data).returning();
  res.status(201).json(photo);
});

router.delete("/photos/:id", async (req, res): Promise<void> => {
  const params = DeletePhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [photo] = await db.delete(photosTable).where(eq(photosTable.id, params.data.id)).returning();
  if (!photo) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
