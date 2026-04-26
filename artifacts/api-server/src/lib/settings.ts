import { db, settingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const ALL_STYLES = ["simple", "cartoon", "detailed"] as const;
export type StyleId = (typeof ALL_STYLES)[number];

export interface PricingTier {
  /** Upper bound of page count for this tier, inclusive. `null` = "and above". */
  maxPages: number | null;
  /** Price in cents, per style. */
  prices: Partial<Record<StyleId, number>>;
}

export interface PublicSettings {
  enabledStyles: StyleId[];
  pricing: PricingTier[];
}

const DEFAULT_ENABLED_STYLES: StyleId[] = ["simple", "cartoon"];

const DEFAULT_PRICING: PricingTier[] = [
  { maxPages: 20, prices: { simple: 2495, cartoon: 2495, detailed: 2495 } },
  { maxPages: 30, prices: { simple: 2995, cartoon: 2995, detailed: 2995 } },
  { maxPages: 40, prices: { simple: 3495, cartoon: 3495, detailed: 3495 } },
  { maxPages: null, prices: { simple: 4995, cartoon: 4995, detailed: 4995 } },
];

function parseEnabledStyles(raw: string | undefined): StyleId[] {
  if (!raw) return DEFAULT_ENABLED_STYLES;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ENABLED_STYLES;
    const valid = parsed.filter((s): s is StyleId => ALL_STYLES.includes(s as StyleId));
    return valid.length > 0 ? valid : DEFAULT_ENABLED_STYLES;
  } catch {
    return DEFAULT_ENABLED_STYLES;
  }
}

function parsePricing(raw: string | undefined): PricingTier[] {
  if (!raw) return DEFAULT_PRICING;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PRICING;
    const cleaned = parsed
      .map((t: any): PricingTier | null => {
        if (!t || typeof t !== "object") return null;
        const maxPages = t.maxPages === null || t.maxPages === undefined
          ? null
          : Number.isFinite(Number(t.maxPages)) ? Math.max(1, Math.floor(Number(t.maxPages))) : null;
        const prices: Partial<Record<StyleId, number>> = {};
        for (const style of ALL_STYLES) {
          const cents = Number(t.prices?.[style]);
          if (Number.isFinite(cents) && cents >= 0) prices[style] = Math.round(cents);
        }
        return { maxPages, prices };
      })
      .filter((t): t is PricingTier => t !== null);
    return cleaned.length > 0 ? cleaned : DEFAULT_PRICING;
  } catch {
    return DEFAULT_PRICING;
  }
}

export async function loadPublicSettings(): Promise<PublicSettings> {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(inArray(settingsTable.key, ["enabledStyles", "pricing"]));
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    enabledStyles: parseEnabledStyles(byKey.enabledStyles),
    pricing: parsePricing(byKey.pricing),
  };
}

async function upsert(key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

export async function saveEnabledStyles(styles: StyleId[]): Promise<StyleId[]> {
  const valid = styles.filter((s): s is StyleId => ALL_STYLES.includes(s));
  const clean = valid.length > 0 ? valid : DEFAULT_ENABLED_STYLES;
  await upsert("enabledStyles", JSON.stringify(clean));
  return clean;
}

export async function savePricing(tiers: PricingTier[]): Promise<PricingTier[]> {
  const clean = parsePricing(JSON.stringify(tiers));
  await upsert("pricing", JSON.stringify(clean));
  return clean;
}

export { ALL_STYLES };
