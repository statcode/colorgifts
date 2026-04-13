import { Router, type IRouter } from "express";
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
import { randomBytes } from "crypto";

const router: IRouter = Router();

router.get("/books", async (_req, res): Promise<void> => {
  const books = await db.select().from(booksTable).orderBy(booksTable.createdAt);
  const booksWithPageCount = await Promise.all(
    books.map(async (book) => {
      const pages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, book.id));
      return { ...book, pageCount: pages.length };
    })
  );
  res.json(booksWithPageCount);
});

router.post("/books", async (req, res): Promise<void> => {
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [book] = await db.insert(booksTable).values(parsed.data).returning();
  res.status(201).json({ ...book, pageCount: 0 });
});

router.get("/books/:id", async (req, res): Promise<void> => {
  const params = GetBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const pages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, book.id));
  res.json({ ...book, pageCount: pages.length });
});

router.patch("/books/:id", async (req, res): Promise<void> => {
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
  const [book] = await db.update(booksTable).set(parsed.data).where(eq(booksTable.id, params.data.id)).returning();
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const pages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, book.id));
  res.json({ ...book, pageCount: pages.length });
});

router.delete("/books/:id", async (req, res): Promise<void> => {
  const params = DeleteBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [book] = await db.delete(booksTable).where(eq(booksTable.id, params.data.id)).returning();
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/books/:id/pages", async (req, res): Promise<void> => {
  const params = ListBookPagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
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

router.post("/books/:id/generate", async (req, res): Promise<void> => {
  const params = GenerateBookPagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const photos = await db.select().from(photosTable).where(eq(photosTable.bookId, params.data.id));

  await db.update(booksTable).set({ status: "generating" }).where(eq(booksTable.id, params.data.id));

  const shareToken = randomBytes(16).toString("hex");
  await db.update(booksTable).set({ shareToken }).where(eq(booksTable.id, params.data.id));

  let sortOrder = 0;
  const createdPages: number[] = [];

  for (const photo of photos) {
    const [page] = await db.insert(coloringPagesTable).values({
      bookId: params.data.id,
      photoId: photo.id,
      originalImagePath: photo.objectPath,
      status: "pending",
      sortOrder: sortOrder++,
    }).returning();
    createdPages.push(page.id);
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
