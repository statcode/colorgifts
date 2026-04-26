import { mysqlTable, varchar, text, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const settingsTable = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export type Setting = typeof settingsTable.$inferSelect;
