import { eq } from "drizzle-orm";
import type { Logger } from "pino";
import { db, booksTable, coloringPagesTable, photosTable } from "@workspace/db";
import { deleteLocalUpload } from "./localObjectStorage";

/**
 * Collect every unique uploaded-file path attached to a book. Pages and photos
 * often share the same original image, so dedupe via Set.
 */
async function collectBookFilePaths(bookId: number): Promise<string[]> {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId));
  const pages = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.bookId, bookId));
  const photos = await db.select().from(photosTable).where(eq(photosTable.bookId, bookId));

  const paths = new Set<string>();
  if (book?.coverImagePath) paths.add(book.coverImagePath);
  if (book?.pdfPath) paths.add(book.pdfPath);
  for (const p of pages) {
    if (p.originalImagePath) paths.add(p.originalImagePath);
    if (p.coloringImagePath) paths.add(p.coloringImagePath);
  }
  for (const photo of photos) {
    if (photo.objectPath) paths.add(photo.objectPath);
  }
  return [...paths];
}

async function deletePathsBestEffort(paths: string[], log?: Logger): Promise<void> {
  await Promise.all(
    paths.map(async (p) => {
      try {
        await deleteLocalUpload(p);
      } catch (err) {
        log?.warn({ err, path: p }, "Failed to delete uploaded file");
      }
    }),
  );
}

/**
 * Cascade-delete a book: gather file paths first, delete child rows, delete the
 * book row, then best-effort delete files on disk. DB is the source of truth —
 * if row deletion fails, files stay; if file deletion fails, rows are already
 * gone (acceptable orphan).
 */
export async function cascadeDeleteBook(bookId: number, log?: Logger): Promise<void> {
  const paths = await collectBookFilePaths(bookId);
  await db.delete(coloringPagesTable).where(eq(coloringPagesTable.bookId, bookId));
  await db.delete(photosTable).where(eq(photosTable.bookId, bookId));
  await db.delete(booksTable).where(eq(booksTable.id, bookId));
  await deletePathsBestEffort(paths, log);
}

/**
 * Delete a single coloring page and its generated line-art file. Does NOT
 * remove `originalImagePath` — that file is owned by the `photos` row.
 */
export async function deletePageWithFile(pageId: number, log?: Logger): Promise<void> {
  const [page] = await db.select().from(coloringPagesTable).where(eq(coloringPagesTable.id, pageId));
  if (!page) return;
  const toDelete = page.coloringImagePath ? [page.coloringImagePath] : [];
  await db.delete(coloringPagesTable).where(eq(coloringPagesTable.id, pageId));
  await deletePathsBestEffort(toDelete, log);
}

/**
 * Delete a single photo and its uploaded file.
 */
export async function deletePhotoWithFile(photoId: number, log?: Logger): Promise<void> {
  const [photo] = await db.select().from(photosTable).where(eq(photosTable.id, photoId));
  if (!photo) return;
  const toDelete = photo.objectPath ? [photo.objectPath] : [];
  await db.delete(photosTable).where(eq(photosTable.id, photoId));
  await deletePathsBestEffort(toDelete, log);
}
