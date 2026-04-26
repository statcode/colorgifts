import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  BarChart3, Users, BookOpen, ImageIcon, ShoppingBag,
  Trash2, Pencil, Check, X, LogOut, RefreshCw, Eye, EyeOff, Settings as SettingsIcon,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

type Tab = "overview" | "books" | "images" | "orders" | "users" | "settings";

const STYLE_DESCRIPTIONS: Record<string, { name: string; desc: string }> = {
  simple: { name: "Simple", desc: "For toddlers & crayons" },
  cartoon: { name: "Cartoon", desc: "For kids & markers" },
  detailed: { name: "Detailed", desc: "For older kids & pencils" },
};

function useAdminFetch(token: string) {
  return useCallback(
    async (path: string, opts: RequestInit = {}) => {
      const res = await fetch(`${API}/api/admin${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
          ...opts.headers,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? res.statusText);
      }
      return res.json();
    },
    [token]
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string | null; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 flex items-center gap-4 shadow-sm">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value ?? "—"}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await onSave(val); setEditing(false); } finally { setSaving(false); }
  };
  if (!editing) return (
    <span className="flex items-center gap-1 group cursor-pointer" onClick={() => setEditing(true)}>
      {value || <span className="italic text-muted-foreground text-xs">—</span>}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </span>
  );
  return (
    <span className="flex items-center gap-1">
      <Input value={val} onChange={e => setVal(e.target.value)} className="h-7 text-sm py-0 px-2 w-40" onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} autoFocus />
      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={saving} onClick={save}><Check className="w-3 h-3 text-green-600" /></Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}><X className="w-3 h-3 text-red-500" /></Button>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    generating: "bg-yellow-100 text-yellow-700",
    ready: "bg-green-100 text-green-700",
    ordered: "bg-blue-100 text-blue-700",
    pending: "bg-gray-100 text-gray-600",
    failed: "bg-red-100 text-red-700",
  };
  return <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", map[status] ?? "bg-gray-100")}>{status}</span>;
}

function OverviewTab({ token }: { token: string }) {
  const fetch = useAdminFetch(token);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setStats(await fetch("/stats")); } finally { setLoading(false); }
  }, [fetch]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-muted-foreground py-12 text-center">Loading stats…</div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Platform Overview</h2>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Registered Users" value={stats?.userCount ?? "N/A"} icon={Users} color="bg-indigo-500" />
        <StatCard label="Books Created" value={stats?.bookCount} icon={BookOpen} color="bg-primary" />
        <StatCard label="Photos Uploaded" value={stats?.photoCount} icon={ImageIcon} color="bg-amber-500" />
        <StatCard label="Coloring Pages" value={stats?.pageCount} icon={ImageIcon} color="bg-teal-500" />
        <StatCard label="Pages Generated" value={stats?.readyCount} icon={Check} color="bg-green-500" />
        <StatCard label="Print Orders" value={stats?.orderCount} icon={ShoppingBag} color="bg-rose-500" />
      </div>
      {stats?.userCount === null && (
        <p className="mt-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          User count unavailable — set <code className="font-mono">CLERK_SECRET_KEY</code> in Replit Secrets to enable user management.
        </p>
      )}
    </div>
  );
}

function BooksTab({ token }: { token: string }) {
  const apiFetch = useAdminFetch(token);
  const { toast } = useToast();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBooks(await apiFetch("/books")); } finally { setLoading(false); }
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  const updateBook = async (id: number, field: string, value: string) => {
    await apiFetch(`/books/${id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
    setBooks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const deleteBook = async (id: number) => {
    if (!confirm("Delete this book and all its pages?")) return;
    try {
      await apiFetch(`/books/${id}`, { method: "DELETE" });
      setBooks(prev => prev.filter(b => b.id !== id));
      toast({ title: "Book deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="text-muted-foreground py-12 text-center">Loading books…</div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">All Books ({books.length})</h2>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">ID</th>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Style</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Pages</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {books.map(book => (
              <tr key={book.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{book.id}</td>
                <td className="px-4 py-3 font-medium">
                  <InlineEdit value={book.title} onSave={v => updateBook(book.id, "title", v)} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{book.style}</td>
                <td className="px-4 py-3"><StatusBadge status={book.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{book.pageCount}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(book.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteBook(book.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {books.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No books yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImagesTab({ token }: { token: string }) {
  const apiFetch = useAdminFetch(token);
  const { toast } = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPages(await apiFetch("/pages")); } finally { setLoading(false); }
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  const deletePage = async (id: number) => {
    if (!confirm("Delete this coloring page?")) return;
    try {
      await apiFetch(`/pages/${id}`, { method: "DELETE" });
      setPages(prev => prev.filter(p => p.id !== id));
      toast({ title: "Page deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const updateCaption = async (id: number, caption: string) => {
    await apiFetch(`/pages/${id}`, { method: "PATCH", body: JSON.stringify({ caption }) });
    setPages(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  if (loading) return <div className="text-muted-foreground py-12 text-center">Loading images…</div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">All Coloring Pages ({pages.length})</h2>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">ID</th>
              <th className="text-left px-4 py-3 font-medium">Book</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Caption</th>
              <th className="text-left px-4 py-3 font-medium">Order</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pages.map(page => (
              <tr key={page.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{page.id}</td>
                <td className="px-4 py-3 text-muted-foreground">Book #{page.bookId}</td>
                <td className="px-4 py-3"><StatusBadge status={page.status} /></td>
                <td className="px-4 py-3">
                  <InlineEdit value={page.caption ?? ""} onSave={v => updateCaption(page.id, v)} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{page.sortOrder}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(page.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deletePage(page.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {pages.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No pages yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersTab({ token }: { token: string }) {
  const apiFetch = useAdminFetch(token);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await apiFetch("/orders")); } finally { setLoading(false); }
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-muted-foreground py-12 text-center">Loading orders…</div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Print Orders ({orders.length})</h2>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Book ID</th>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Lulu Job ID</th>
              <th className="text-left px-4 py-3 font-medium">Lulu Status</th>
              <th className="text-left px-4 py-3 font-medium">Ordered At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{order.id}</td>
                <td className="px-4 py-3 font-medium">{order.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{order.luluPrintJobId}</td>
                <td className="px-4 py-3"><StatusBadge status={order.luluStatus ?? "unknown"} /></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(order.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No orders yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ token }: { token: string }) {
  const apiFetch = useAdminFetch(token);
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setUsers(await apiFetch("/users")); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}? This is permanent.`)) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== id));
      toast({ title: "User deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="text-muted-foreground py-12 text-center">Loading users…</div>;
  if (error) return (
    <div className="py-12 text-center">
      <p className="text-red-500 mb-2">{error}</p>
      <p className="text-sm text-muted-foreground">Add <code className="font-mono bg-muted px-1 rounded">CLERK_SECRET_KEY</code> to Replit Secrets to enable user management.</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Users ({users.length})</h2>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Clerk ID</th>
              <th className="text-left px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user: any) => {
              const email = user.email_addresses?.[0]?.email_address ?? "—";
              const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";
              return (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.id}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteUser(user.id, email)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type PricingTier = {
  maxPages: number | null;
  prices: Record<string, number | undefined>;
};

function centsToDollars(cents: number | undefined): string {
  if (cents === undefined || cents === null) return "";
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars: string): number | undefined {
  const trimmed = dollars.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function SettingsTab({ token }: { token: string }) {
  const apiFetch = useAdminFetch(token);
  const { toast } = useToast();
  const [allStyles, setAllStyles] = useState<string[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await apiFetch("/settings");
      setAllStyles(s.allStyles ?? []);
      setEnabled(s.enabledStyles ?? []);
      setPricing(s.pricing ?? []);
    } finally { setLoading(false); }
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  const toggle = (style: string) => {
    setEnabled(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
  };

  const updateTier = (idx: number, patch: Partial<PricingTier>) => {
    setPricing(prev => prev.map((t, i) => i === idx ? { ...t, ...patch, prices: { ...t.prices, ...(patch.prices ?? {}) } } : t));
  };

  const updateTierPrice = (idx: number, style: string, value: string) => {
    updateTier(idx, { prices: { [style]: dollarsToCents(value) } });
  };

  const updateTierMax = (idx: number, value: string) => {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "∞") {
      updateTier(idx, { maxPages: null });
      return;
    }
    const n = Number(trimmed);
    updateTier(idx, { maxPages: Number.isFinite(n) && n > 0 ? Math.floor(n) : null });
  };

  const addTier = () => {
    const prices: Record<string, number | undefined> = {};
    allStyles.forEach(s => { prices[s] = 0; });
    setPricing(prev => [...prev, { maxPages: null, prices }]);
  };

  const removeTier = (idx: number) => {
    setPricing(prev => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (enabled.length === 0) {
      toast({ title: "At least one style must be enabled", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify({ enabledStyles: enabled, pricing }),
      });
      setEnabled(result.enabledStyles ?? []);
      setPricing(result.pricing ?? []);
      toast({ title: "Settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-muted-foreground py-12 text-center">Loading settings…</div>;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Control which options end users see when creating a book.</p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 max-w-2xl">
        <h3 className="font-semibold mb-1">Coloring Styles</h3>
        <p className="text-sm text-muted-foreground mb-4">Toggle which styles appear in the "Choose a Style" section on the Book Details step.</p>
        <div className="space-y-2">
          {allStyles.map(style => {
            const info = STYLE_DESCRIPTIONS[style] ?? { name: style, desc: "" };
            const isOn = enabled.includes(style);
            return (
              <label key={style} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
                <input type="checkbox" checked={isOn} onChange={() => toggle(style)} className="w-4 h-4" />
                <div className="flex-1">
                  <div className="font-medium capitalize">{info.name}</div>
                  <div className="text-xs text-muted-foreground">{info.desc}</div>
                </div>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", isOn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                  {isOn ? "Visible" : "Hidden"}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="font-semibold mb-1">Pricing</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set the book price per style at each page-count tier. "Max pages" is the upper bound (inclusive) — leave blank for "and above". Enter dollars (e.g. <code>24.95</code>).
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Max pages</th>
                {allStyles.map(s => (
                  <th key={s} className="text-left px-4 py-2 font-medium capitalize">{STYLE_DESCRIPTIONS[s]?.name ?? s}</th>
                ))}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pricing.map((tier, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-8 w-24 text-sm"
                      value={tier.maxPages === null ? "" : String(tier.maxPages)}
                      placeholder="∞"
                      onChange={e => updateTierMax(idx, e.target.value)}
                    />
                  </td>
                  {allStyles.map(style => (
                    <td key={style} className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="h-8 w-24 text-sm"
                          value={centsToDollars(tier.prices[style])}
                          onChange={e => updateTierPrice(idx, style, e.target.value)}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeTier(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {pricing.length === 0 && (
                <tr><td colSpan={allStyles.length + 2} className="text-center py-6 text-muted-foreground">No tiers — add one below.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={addTier} className="rounded-xl">+ Add tier</Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="rounded-xl">{saving ? "Saving…" : "Save changes"}</Button>
        <Button variant="outline" onClick={load} disabled={saving} className="rounded-xl gap-2"><RefreshCw className="w-3.5 h-3.5" /> Reload</Button>
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "books", label: "Books", icon: BookOpen },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "users", label: "Users", icon: Users },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("admin_token"));
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { toast } = useToast();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true); setLoginError("");
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        setLoginError(error ?? "Invalid password");
        return;
      }
      const { token: t } = await res.json();
      sessionStorage.setItem("admin_token", t);
      setToken(t);
    } catch {
      setLoginError("Could not reach server");
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("admin_token");
    setToken(null);
    setPassword("");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-border shadow-sm p-10 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">ColorGifts Admin</h1>
              <p className="text-xs text-muted-foreground">Restricted access</p>
            </div>
          </div>
          <form onSubmit={login} className="space-y-4">
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="Admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10 rounded-xl"
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPwd(v => !v)}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <Button type="submit" className="w-full rounded-xl" disabled={loggingIn || !password}>
              {loggingIn ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-border flex flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">Admin Panel</span>
        </div>
        <nav className="flex-1 py-3">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors text-left",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-red-600" onClick={logout}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === "overview" && <OverviewTab token={token} />}
        {activeTab === "books" && <BooksTab token={token} />}
        {activeTab === "images" && <ImagesTab token={token} />}
        {activeTab === "orders" && <OrdersTab token={token} />}
        {activeTab === "users" && <UsersTab token={token} />}
        {activeTab === "settings" && <SettingsTab token={token} />}
      </main>
    </div>
  );
}
