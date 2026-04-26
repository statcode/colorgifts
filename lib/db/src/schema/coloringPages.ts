import { mysqlTable, int, text, varchar, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coloringPagesTable = mysqlTable("coloring_pages", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("book_id").notNull(),
  photoId: int("photo_id").notNull(),
  originalImagePath: text("original_image_path").notNull(),
  coloringImagePath: text("coloring_image_path"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  sortOrder: int("sort_order").notNull().default(0),
  caption: text("caption"),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
});

export const insertColoringPageSchema = createInsertSchema(coloringPagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertColoringPage = z.infer<typeof insertColoringPageSchema>;
export type ColoringPage = typeof coloringPagesTable.$inferSelect;
