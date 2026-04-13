import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coloringPagesTable = pgTable("coloring_pages", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  photoId: integer("photo_id").notNull(),
  originalImagePath: text("original_image_path").notNull(),
  coloringImagePath: text("coloring_image_path"),
  status: text("status").notNull().default("pending"),
  sortOrder: integer("sort_order").notNull().default(0),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertColoringPageSchema = createInsertSchema(coloringPagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertColoringPage = z.infer<typeof insertColoringPageSchema>;
export type ColoringPage = typeof coloringPagesTable.$inferSelect;
