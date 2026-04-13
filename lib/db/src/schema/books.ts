import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const booksTable = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  dedication: text("dedication"),
  style: text("style").notNull().default("simple"),
  status: text("status").notNull().default("draft"),
  coverImagePath: text("cover_image_path"),
  shareToken: text("share_token"),
  pdfPath: text("pdf_path"),
  coverPdfPath: text("cover_pdf_path"),
  luluPrintJobId: text("lulu_print_job_id"),
  luluStatus: text("lulu_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookSchema = createInsertSchema(booksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;
