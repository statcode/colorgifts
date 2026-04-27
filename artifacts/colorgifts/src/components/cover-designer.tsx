import { Input } from "@/components/ui/input";
import { Book as BookIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/image-utils";

export type CoverTemplateId = "classic" | "sunshine" | "ocean" | "garden" | "starlight" | "rainbow";

export interface CoverTemplateConfig {
  id: CoverTemplateId;
  name: string;
  description: string;
  bg: string;
  border: string;
  titleColor: string;
  subtitleColor: string;
  taglineColor: string;
  accentColor: string;
}

export const COVER_TEMPLATES: CoverTemplateConfig[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Timeless & elegant",
    bg: "#FFFFFF",
    border: "#4A4A4A",
    titleColor: "#141414",
    subtitleColor: "#555",
    taglineColor: "#888",
    accentColor: "#333",
  },
  {
    id: "sunshine",
    name: "Sunshine",
    description: "Warm & cheerful",
    bg: "#FFF8D0",
    border: "#D4890A",
    titleColor: "#6B3200",
    subtitleColor: "#8A5008",
    taglineColor: "#A06010",
    accentColor: "#C07010",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool & serene",
    bg: "#E0F4FF",
    border: "#2080CC",
    titleColor: "#053A80",
    subtitleColor: "#0D5AA0",
    taglineColor: "#1A70B8",
    accentColor: "#0D5AA0",
  },
  {
    id: "garden",
    name: "Garden",
    description: "Fresh & natural",
    bg: "#E8FBE8",
    border: "#3C9A3C",
    titleColor: "#0F4D0F",
    subtitleColor: "#1E6B1E",
    taglineColor: "#2A7A2A",
    accentColor: "#258025",
  },
  {
    id: "starlight",
    name: "Starlight",
    description: "Bold & magical",
    bg: "#13103D",
    border: "#9A8FE8",
    titleColor: "#FFFFFF",
    subtitleColor: "#D8D4FF",
    taglineColor: "#B8B2F0",
    accentColor: "#B0A8FF",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    description: "Vibrant & fun",
    bg: "#FFFFFF",
    border: "#DD3333",
    titleColor: "#8B18B0",
    subtitleColor: "#3030BB",
    taglineColor: "#198050",
    accentColor: "#E07800",
  },
];

export function CoverPreview({
  template,
  title,
  subtitle,
  tagline,
  coverImagePath,
  small = false,
}: {
  template: CoverTemplateConfig;
  title: string;
  subtitle?: string;
  tagline?: string;
  coverImagePath?: string | null;
  small?: boolean;
}) {
  const starDots = template.id === "starlight"
    ? [{ x: 20, y: 15 }, { x: 75, y: 10 }, { x: 60, y: 35 }, { x: 10, y: 50 }, { x: 85, y: 55 }]
    : [];
  const rainbowStripes = template.id === "rainbow"
    ? ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6"]
    : [];

  return (
    <div
      className="relative rounded-lg overflow-hidden flex flex-col"
      style={{
        background: template.bg,
        border: `2px solid ${template.border}`,
        width: small ? 80 : "100%",
        height: small ? 104 : "100%",
        minHeight: small ? 104 : 160,
      }}
    >
      {starDots.map((s, i) => (
        <div key={i} className="absolute rounded-full" style={{ left: `${s.x}%`, top: `${s.y}%`, width: 3, height: 3, background: template.border }} />
      ))}
      {rainbowStripes.length > 0 && (
        <div className="absolute top-0 left-0 right-0 flex" style={{ height: small ? 8 : 12 }}>
          {rainbowStripes.map((c, i) => (
            <div key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>
      )}
      <div
        className="absolute inset-1.5 rounded flex flex-col items-center text-center px-2 py-2"
        style={{ border: `1px solid ${template.border}40` }}
      >
        <div
          className="font-bold leading-tight"
          style={{
            color: template.titleColor,
            fontSize: small ? 8 : 15,
            fontFamily: "Georgia, serif",
          }}
        >
          {title || "Book Title"}
        </div>
        {subtitle && !small && (
          <div style={{ color: template.subtitleColor, fontSize: 10, marginTop: 3, fontStyle: "italic" }}>
            {subtitle}
          </div>
        )}
        {coverImagePath && !small ? (
          <div
            className="my-2 rounded overflow-hidden bg-white/60 flex items-center justify-center"
            style={{
              border: `1px solid ${template.border}60`,
              width: "75%",
              flex: "1 1 auto",
              minHeight: 0,
            }}
          >
            <img
              src={`${getImageUrl(coverImagePath)}?watermark=1`}
              alt="Cover"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        ) : (
          <div style={{ flex: "1 1 auto" }} />
        )}
        <div style={{ color: template.taglineColor, fontSize: small ? 5 : 8, marginTop: small ? 3 : 4 }}>
          {tagline || "A Personalized Coloring Book"}
        </div>
        <div style={{ color: template.accentColor, fontSize: small ? 5 : 8, marginTop: small ? 2 : 4, fontWeight: "bold" }}>
          ColorGifts
        </div>
      </div>
    </div>
  );
}

export function CoverDesigner({
  template,
  onTemplateChange,
  title,
  onTitleChange,
  subtitle,
  onSubtitleChange,
  tagline,
  onTaglineChange,
  coverImagePath,
  showHeader = true,
}: {
  template: CoverTemplateId;
  onTemplateChange: (id: CoverTemplateId) => void;
  title: string;
  onTitleChange: (v: string) => void;
  subtitle: string;
  onSubtitleChange: (v: string) => void;
  tagline: string;
  onTaglineChange: (v: string) => void;
  coverImagePath?: string | null;
  showHeader?: boolean;
}) {
  const selectedTpl = COVER_TEMPLATES.find((t) => t.id === template) ?? COVER_TEMPLATES[0];

  return (
    <div>
      {showHeader && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold">Design Your Cover</h2>
            <p className="text-sm text-muted-foreground">Choose a template and personalise the text.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Choose a Template</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {COVER_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onTemplateChange(tpl.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl p-2 border-2 transition-all duration-200",
                  template === tpl.id ? "border-primary shadow-md scale-105" : "border-transparent hover:border-border",
                )}
              >
                <div style={{ width: 80, height: 104 }}>
                  <CoverPreview template={tpl} title={title || "Title"} subtitle={subtitle} tagline={tagline} small />
                </div>
                <span className="text-xs font-medium">{tpl.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Cover Title</label>
              <Input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. Adventures of Tommy & Rex"
                className="h-11 bg-muted/50 border-transparent focus-visible:bg-background rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                Subtitle <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                value={subtitle}
                onChange={(e) => onSubtitleChange(e.target.value)}
                placeholder="e.g. Summer 2024"
                className="h-11 bg-muted/50 border-transparent focus-visible:bg-background rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                Tagline <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                value={tagline}
                onChange={(e) => onTaglineChange(e.target.value)}
                placeholder="e.g. Made with Love · A Family Coloring Book"
                className="h-11 bg-muted/50 border-transparent focus-visible:bg-background rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">Shown below the title on the cover. Defaults to "A Personalized Coloring Book".</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground self-start">Live Preview</h3>
          <div className="w-full max-w-[220px] aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border border-border/50">
            <CoverPreview template={selectedTpl} title={title || "Book Title"} subtitle={subtitle} tagline={tagline} coverImagePath={coverImagePath} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {selectedTpl.name} — {selectedTpl.description}
          </p>
        </div>
      </div>
    </div>
  );
}
