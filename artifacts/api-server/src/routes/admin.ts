import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, booksTable, coloringPagesTable, photosTable } from "@workspace/db";
import { eq, count, desc, isNotNull } from "drizzle-orm";
import { createHmac } from "crypto";

const router: IRouter = Router();

function getAdminToken(): string {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) throw new Error("ADMIN_PASSWORD not set");
  return createHmac("sha256", pwd).update("colorgifts-admin-session").digest("hex");
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    const expected = getAdminToken();
    const provided = req.headers["x-admin-token"];
    if (!provided || provided !== expected) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: "ADMIN_PASSWORD not configured" });
  }
}

router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body as { password?: string };
  const adminPwd = process.env.ADMIN_PASSWORD;
  if (!adminPwd) {
    res.status(500).json({ error: "ADMIN_PASSWORD not configured on server" });
    return;
  }
  if (!password || password !== adminPwd) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  const token = getAdminToken();
  res.json({ token });
});

router.get("/admin/stats", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const [{ bookCount }] = await db.select({ bookCount: count() }).from(booksTable);
  const [{ pageCount }] = await db.select({ pageCount: count() }).from(coloringPagesTable);
  const [{ photoCount }] = await db.select({ photoCount: count() }).from(photosTable);
  const [{ orderCount }] = await db
    .select({ orderCount: count() })
    .from(booksTable)
    .where(isNotNull(booksTable.luluPrintJobId));
  const [{ readyCount }] = await db
    .select({ readyCount: count() })
    .from(coloringPagesTable)
    .where(eq(coloringPagesTable.status, "ready"));
  const [{ failedCount }] = await db
    .select({ failedCount: count() })
    .from(coloringPagesTable)
    .where(eq(coloringPagesTable.status, "failed"));

  let userCount: number | null = null;
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (clerkKey) {
    try {
      const r = await fetch("https://api.clerk.com/v1/users?limit=1", {
        headers: { Authorization: `Bearer ${clerkKey}` },
      });
      const total = r.headers.get("x-total-count");
      if (total) userCount = parseInt(total, 10);
    } catch {}
  }

  res.json({ bookCount, pageCount, photoCount, orderCount, readyCount, failedCount, userCount });
});

router.get("/admin/books", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const books = await db.select().from(booksTable).orderBy(desc(booksTable.createdAt));
  const withCounts = await Promise.all(
    books.map(async (book) => {
      const [{ pg }] = await db
        .select({ pg: count() })
        .from(coloringPagesTable)
        .where(eq(coloringPagesTable.bookId, book.id));
      return { ...book, pageCount: pg };
    })
  );
  res.json(withCounts);
});

router.patch("/admin/books/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const allowed = ["title", "subtitle", "dedication", "style", "status", "coverTemplate", "coverTagline"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) update[key] = req.body[key];
  }
  if (!Object.keys(update).length) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [book] = await db.update(booksTable).set(update as any).where(eq(booksTable.id, id)).returning();
  if (!book) { res.status(404).json({ error: "Not found" }); return; }
  res.json(book);
});

router.delete("/admin/books/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(coloringPagesTable).where(eq(coloringPagesTable.bookId, id));
  await db.delete(photosTable).where(eq(photosTable.bookId, id));
  await db.delete(booksTable).where(eq(booksTable.id, id));
  res.json({ success: true });
});

router.get("/admin/pages", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const pages = await db.select().from(coloringPagesTable).orderBy(desc(coloringPagesTable.createdAt));
  res.json(pages);
});

router.patch("/admin/pages/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const allowed = ["caption", "status", "sortOrder"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) update[key] = req.body[key];
  }
  if (!Object.keys(update).length) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [page] = await db.update(coloringPagesTable).set(update as any).where(eq(coloringPagesTable.id, id)).returning();
  if (!page) { res.status(404).json({ error: "Not found" }); return; }
  res.json(page);
});

router.delete("/admin/pages/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(coloringPagesTable).where(eq(coloringPagesTable.id, id));
  res.json({ success: true });
});

router.get("/admin/orders", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const orders = await db
    .select()
    .from(booksTable)
    .where(isNotNull(booksTable.luluPrintJobId))
    .orderBy(desc(booksTable.updatedAt));
  res.json(orders);
});

router.get("/admin/users", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (!clerkKey) {
    res.status(501).json({ error: "CLERK_SECRET_KEY not configured — user management unavailable" });
    return;
  }
  try {
    const r = await fetch("https://api.clerk.com/v1/users?limit=100&order_by=-created_at", {
      headers: { Authorization: `Bearer ${clerkKey}` },
    });
    const data = await r.json() as any;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/admin/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (!clerkKey) { res.status(501).json({ error: "CLERK_SECRET_KEY not configured" }); return; }
  try {
    const r = await fetch(`https://api.clerk.com/v1/users/${req.params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${clerkKey}` },
    });
    const data = await r.json() as any;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
