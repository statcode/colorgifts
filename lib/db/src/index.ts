import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const url = new URL(process.env.DATABASE_URL);
const socketPath = url.searchParams.get("socket") ?? undefined;

export const pool = mysql.createPool({
  host: socketPath ? undefined : url.hostname,
  port: socketPath ? undefined : url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  socketPath,
});

export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";
