import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, booksTable, photosTable, coloringPagesTable } from "@workspace/db";
import {
  CreateBookBody,
  GetBookParams,
  UpdateBookParams,
  UpdateBookBody,
  DeleteBookParams,
  ListBookPagesParams,
  GenerateBookPagesParams,
} from "@workspace/api-zod";
import { generateColoringPage } from "../lib/aiProcessing";
import { requireUser } from "../middlewares/requireUser";
import { cascadeDeleteBook } from "../lib/bookCleanup";
import { randomBytes } from "crypto";

const router: IRouter = Router();

// All book routes require an authenticated user.
router.use(requireUser());

async function loadOwnedBook(bookId: number, userId: string | undefined) {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId));
  if (!book) return null;
  // When auth is enabled, only the owner can see the book.
  if (userId && book.userId !== userId) return null;
  return book;
}

router.get("/books", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  const rows = userId
    ? await db.select().from(booksTable).where(eq(booksTable.userId, userId)).orderBy(booksTable.createdAt)
    : await db.select().from(booksTable).orderBy(booksTable.createdAt);

  const booksWithPageCount = await Promise.all(
    rows.map(async (book) => {
      const pages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, book.id));
      return { ...book, pageCount: pages.length };
    })
  );
  res.json(booksWithPageCount);
});

router.post("/books", async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [{ id }] = await db
    .insert(booksTable)
    .values({ ...parsed.data, userId: req.userId ?? null })
    .$returningId();
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, id));
  res.status(201).json({ ...book, pageCount: 0 });
});

router.get("/books/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const book = await loadOwnedBook(params.data.id, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const pages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, book.id));
  res.json({ ...book, pageCount: pages.length });
});

router.patch("/books/:id", async (req: Request, res: Response): Promise<void> => {
  const params = UpdateBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await loadOwnedBook(params.data.id, req.userId);
  if (!existing) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  await db.update(booksTable).set(parsed.data).where(eq(booksTable.id, params.data.id));
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
  const pages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, book.id));
  res.json({ ...book, pageCount: pages.length });
});

router.delete("/books/:id", async (req: Request, res: Response): Promise<void> => {
  const params = DeleteBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const book = await loadOwnedBook(params.data.id, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  await cascadeDeleteBook(params.data.id, req.log);
  res.sendStatus(204);
});

router.get("/books/:id/pages", async (req: Request, res: Response): Promise<void> => {
  const params = ListBookPagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const book = await loadOwnedBook(params.data.id, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const pages = await db
    .select()
    .from(coloringPagesTable)
    .where(eq(coloringPagesTable.bookId, params.data.id))
    .orderBy(coloringPagesTable.sortOrder);
  res.json(pages);
});

router.post("/books/:id/generate", async (req: Request, res: Response): Promise<void> => {
  const params = GenerateBookPagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const book = await loadOwnedBook(params.data.id, req.userId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const photos = await db.select().from(photosTable).where(eq(photosTable.bookId, params.data.id));
  const existingPages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, params.data.id));
  const photosWithPage = new Set(existingPages.map(p => p.photoId));
  const newPhotos = photos.filter(p => !photosWithPage.has(p.id));

  if (newPhotos.length === 0) {
    res.json({ message: "No new photos to generate", pagesQueued: 0 });
    return;
  }

  await db.update(booksTable).set({ status: "generating" }).where(eq(booksTable.id, params.data.id));

  if (!book.shareToken) {
    const shareToken = randomBytes(16).toString("hex");
    await db.update(booksTable).set({ shareToken }).where(eq(booksTable.id, params.data.id));
  }

  let sortOrder = existingPages.reduce((max, p) => Math.max(max, p.sortOrder + 1), 0);
  const createdPages: number[] = [];

  for (const photo of newPhotos) {
    const [{ id: pageId }] = await db.insert(coloringPagesTable).values({
      bookId: params.data.id,
      photoId: photo.id,
      originalImagePath: photo.objectPath,
      status: "pending",
      sortOrder: sortOrder++,
    }).$returningId();
    createdPages.push(pageId);
  }

  res.json({ message: "Generation started", pagesQueued: createdPages.length });

  setImmediate(async () => {
    for (const pageId of createdPages) {
      try {
        await db.update(coloringPagesTable).set({ status: "generating" }).where(eq(coloringPagesTable.id, pageId));
        const [page] = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.id, pageId));
        if (!page) continue;

        const coloringPath = await generateColoringPage(page.originalImagePath, book.style);

        await db.update(coloringPagesTable).set({
          status: "ready",
          coloringImagePath: coloringPath,
        }).where(eq(coloringPagesTable.id, pageId));
      } catch (err) {
        req.log.error({ err, pageId }, "Coloring page generation failed");
        await db.update(coloringPagesTable).set({ status: "failed" }).where(eq(coloringPagesTable.id, pageId));
      }
    }

    const pages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, params.data.id));
    const allReady = pages.every(p => p.status === "ready" || p.status === "failed");
    if (allReady) {
      await db.update(booksTable).set({ status: "ready" }).where(eq(booksTable.id, params.data.id));
    }
  });
});

export default router;
