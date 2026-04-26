import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, booksTable, photosTable } from "@workspace/db";
import {
  CreatePhotoBody,
  DeletePhotoParams,
} from "@workspace/api-zod";
import { requireUser } from "../middlewares/requireUser";
import { deletePhotoWithFile } from "../lib/bookCleanup";

const router: IRouter = Router();

router.use(requireUser());

async function loadOwnedBook(bookId: number, userId: string | undefined) {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId));
  if (!book) return null;
  if (userId && book.userId !== userId) return null;
  return book;
}

router.post("/photos", async (req: Request, res: Response): Promise<void> => {
  const parsed = CreatePhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const book = await loadOwnedBook(parsed.data.bookId, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const [{ id }] = await db.insert(photosTable).values(parsed.data).$returningId();
  const [photo] = await db.select().from(photosTable).where(eq(photosTable.id, id));
  res.status(201).json(photo);
});

router.delete("/photos/:id", async (req: Request, res: Response): Promise<void> => {
  const params = DeletePhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [photo] = await db.select().from(photosTable).where(eq(photosTable.id, params.data.id));
  if (!photo) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  const book = await loadOwnedBook(photo.bookId, req.userId);
  if (!book) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  await deletePhotoWithFile(params.data.id, req.log);
  res.sendStatus(204);
});

export default router;
