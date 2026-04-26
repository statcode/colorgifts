import { mysqlTable, int, text, varchar, datetime, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const booksTable = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 255 }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  dedication: text("dedication"),
  style: varchar("style", { length: 50 }).notNull().default("simple"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  coverImagePath: text("cover_image_path"),
  shareToken: varchar("share_token", { length: 255 }),
  pdfPath: text("pdf_path"),
  coverPdfPath: text("cover_pdf_path"),
  luluPrintJobId: varchar("lulu_print_job_id", { length: 255 }),
  luluStatus: varchar("lulu_status", { length: 100 }),
  coverTemplate: varchar("cover_template", { length: 100 }).notNull().default("classic"),
  coverTagline: text("cover_tagline"),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("books_user_id_idx").on(table.userId),
}));

export const insertBookSchema = createInsertSchema(booksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;
