import { mysqlTable, int, text, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const photosTable = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("book_id").notNull(),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name"),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPhotoSchema = createInsertSchema(photosTable).omit({ id: true, createdAt: true });
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photosTable.$inferSelect;
