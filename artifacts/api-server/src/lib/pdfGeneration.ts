import { PDFDocument, rgb, StandardFonts, degrees, type RGB } from "pdf-lib";
import { readLocalUploadBuffer, saveLocalUploadBuffer } from "./localObjectStorage";
import { logger } from "./logger";
import type { ColoringPage } from "@workspace/db";
import {
  COVER_SPEC,
  INTERIOR_SPEC,
  calculateSpineWidthInches,
  getInteriorGutterInches,
  type CoverDimensions,
} from "./lulu";

// Lulu interior page dimensions (US Letter Paperback, file-with-bleed).
// Trim 8.5" x 11", final PDF page 8.75" x 11.25" to include 0.125" bleed on all sides.
const PT = INTERIOR_SPEC.pointsPerInch;
const INTERIOR_BLEED_PT = INTERIOR_SPEC.bleedInches * PT;       // 9pt
const INTERIOR_SAFETY_PT = INTERIOR_SPEC.safetyInches * PT;     // 36pt
const INTERIOR_TRIM_W_PT = INTERIOR_SPEC.trimWidthInches * PT;  // 612pt
const INTERIOR_TRIM_H_PT = INTERIOR_SPEC.trimHeightInches * PT; // 792pt
const INTERIOR_PAGE_W_PT = INTERIOR_TRIM_W_PT + INTERIOR_BLEED_PT * 2; // 630pt
const INTERIOR_PAGE_H_PT = INTERIOR_TRIM_H_PT + INTERIOR_BLEED_PT * 2; // 810pt

// Lulu cover safety/barcode constants
const COVER_BLEED_PT = COVER_SPEC.bleedInches * COVER_SPEC.pointsPerInch;       // 9pt
const SAFETY_PT = COVER_SPEC.safetyInches * COVER_SPEC.pointsPerInch;           // 36pt
const BARCODE_W_PT = COVER_SPEC.barcodeWidthInches * COVER_SPEC.pointsPerInch;  // 261pt
const BARCODE_H_PT = COVER_SPEC.barcodeHeightInches * COVER_SPEC.pointsPerInch; // 90pt

export type CoverTemplate = "classic" | "sunshine" | "ocean" | "garden" | "starlight" | "rainbow";

interface TemplateConfig {
  bgColor: RGB;
  titleColor: RGB;
  subtitleColor: RGB;
  taglineColor: RGB;
  borderColor: RGB;
  accentColor: RGB;
  darkText: boolean;
}

const TEMPLATES: Record<CoverTemplate, TemplateConfig> = {
  classic: {
    bgColor: rgb(1, 1, 1),
    titleColor: rgb(0.08, 0.08, 0.08),
    subtitleColor: rgb(0.35, 0.35, 0.35),
    taglineColor: rgb(0.5, 0.5, 0.5),
    borderColor: rgb(0.3, 0.3, 0.3),
    accentColor: rgb(0.2, 0.2, 0.2),
    darkText: true,
  },
  sunshine: {
    bgColor: rgb(1.0, 0.97, 0.82),
    titleColor: rgb(0.45, 0.22, 0.0),
    subtitleColor: rgb(0.6, 0.35, 0.05),
    taglineColor: rgb(0.65, 0.4, 0.1),
    borderColor: rgb(0.9, 0.65, 0.1),
    accentColor: rgb(0.85, 0.55, 0.05),
    darkText: true,
  },
  ocean: {
    bgColor: rgb(0.88, 0.96, 1.0),
    titleColor: rgb(0.02, 0.25, 0.55),
    subtitleColor: rgb(0.05, 0.38, 0.65),
    taglineColor: rgb(0.1, 0.45, 0.7),
    borderColor: rgb(0.15, 0.5, 0.8),
    accentColor: rgb(0.05, 0.38, 0.65),
    darkText: true,
  },
  garden: {
    bgColor: rgb(0.9, 0.98, 0.9),
    titleColor: rgb(0.06, 0.3, 0.06),
    subtitleColor: rgb(0.12, 0.42, 0.12),
    taglineColor: rgb(0.18, 0.5, 0.18),
    borderColor: rgb(0.25, 0.6, 0.25),
    accentColor: rgb(0.15, 0.48, 0.15),
    darkText: true,
  },
  starlight: {
    bgColor: rgb(0.08, 0.07, 0.25),
    titleColor: rgb(1.0, 1.0, 1.0),
    subtitleColor: rgb(0.85, 0.85, 1.0),
    taglineColor: rgb(0.75, 0.75, 0.95),
    borderColor: rgb(0.6, 0.55, 0.95),
    accentColor: rgb(0.7, 0.65, 1.0),
    darkText: false,
  },
  rainbow: {
    bgColor: rgb(1.0, 1.0, 1.0),
    titleColor: rgb(0.55, 0.1, 0.7),
    subtitleColor: rgb(0.2, 0.2, 0.75),
    taglineColor: rgb(0.1, 0.5, 0.35),
    borderColor: rgb(0.85, 0.25, 0.25),
    accentColor: rgb(0.9, 0.5, 0.0),
    darkText: true,
  },
};

async function fetchImageBytes(objectPath: string): Promise<{ bytes: Uint8Array; isPng: boolean }> {
  const cleanPath = objectPath.startsWith("/objects/") ? objectPath : `/objects/${objectPath}`;
  const fileContents = await readLocalUploadBuffer(cleanPath);
  const isPng = objectPath.toLowerCase().includes(".png") || !objectPath.toLowerCase().includes(".jpg");
  return { bytes: new Uint8Array(fileContents), isPng };
}

export async function generateInteriorPdf(
  pages: ColoringPage[],
  bookTitle: string,
  dedication?: string | null
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const readyPages = pages.filter((p) => p.coloringImagePath && p.status === "ready");

  if (readyPages.length === 0) {
    throw new Error("No ready coloring pages found to generate PDF");
  }

  // Estimate the final page count so the gutter table picks the right inside
  // margin. Includes the optional dedication page and a possible blank trailing
  // page added for even pagination at the end.
  const estimatedPageCount =
    readyPages.length + (dedication ? 1 : 0);
  const gutterInches = getInteriorGutterInches(estimatedPageCount);
  const gutterPt = gutterInches * PT;

  // Compute the safe-content rectangle for a recto (right-hand) or verso
  // (left-hand) page. Recto = gutter on the LEFT (binding side). Verso = gutter
  // on the RIGHT. Outside edges keep the standard 0.5" safety inset.
  function safeRect(isRecto: boolean) {
    const innerInset = gutterPt;            // binding side
    const outerInset = INTERIOR_SAFETY_PT;  // outer safety
    const left = isRecto ? innerInset : outerInset;
    const right = isRecto ? outerInset : innerInset;
    return {
      x: INTERIOR_BLEED_PT + left,
      y: INTERIOR_BLEED_PT + INTERIOR_SAFETY_PT,
      w: INTERIOR_TRIM_W_PT - left - right,
      h: INTERIOR_TRIM_H_PT - INTERIOR_SAFETY_PT * 2,
    };
  }

  let pageNumber = 0; // 1-based after increment; recto when odd
  const addPage = () => {
    pageNumber += 1;
    return {
      page: pdfDoc.addPage([INTERIOR_PAGE_W_PT, INTERIOR_PAGE_H_PT]),
      isRecto: pageNumber % 2 === 1,
    };
  };

  if (dedication) {
    const { page: dedPage, isRecto } = addPage();
    const r = safeRect(isRecto);
    dedPage.drawText("Dedication", {
      x: r.x + r.w / 2 - 60,
      y: r.y + r.h - 60,
      font: helveticaBold,
      size: 22,
      color: rgb(0.1, 0.1, 0.1),
    });
    const lines = wrapText(dedication, 60);
    lines.forEach((line, i) => {
      dedPage.drawText(line, {
        x: r.x,
        y: r.y + r.h / 2 + 40 - i * 28,
        font: helvetica,
        size: 16,
        color: rgb(0.2, 0.2, 0.2),
      });
    });
  }

  for (const page of readyPages) {
    const { page: pdfPage, isRecto } = addPage();
    const r = safeRect(isRecto);

    try {
      const { bytes, isPng } = await fetchImageBytes(page.coloringImagePath!);
      const image = isPng
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);

      const hasCaption = page.caption && page.caption.trim().length > 0;
      const captionHeight = hasCaption ? 28 : 0;

      const imageAreaW = r.w;
      const imageAreaH = r.h - captionHeight;
      const imgDims = image.scaleToFit(imageAreaW, imageAreaH);
      const ix = r.x + (imageAreaW - imgDims.width) / 2;
      const iy = r.y + captionHeight + (imageAreaH - imgDims.height) / 2;

      pdfPage.drawImage(image, { x: ix, y: iy, width: imgDims.width, height: imgDims.height });

      if (hasCaption) {
        const captionFontSize = 13;
        const captionText = page.caption!.trim();
        const captionWidth = helvetica.widthOfTextAtSize(captionText, captionFontSize);
        pdfPage.drawText(captionText, {
          x: r.x + (r.w - captionWidth) / 2,
          y: r.y + 4,
          font: helvetica,
          size: captionFontSize,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
    } catch (err) {
      logger.error({ pageId: page.id, err }, "Failed to embed image for page, inserting blank page");
      pdfPage.drawText(`Page ${page.sortOrder + 1}`, {
        x: r.x + r.w / 2 - 30,
        y: r.y + r.h / 2,
        font: helvetica,
        size: 14,
        color: rgb(0.7, 0.7, 0.7),
      });
    }
  }

  // Lulu requires an even page count for perfect-bound paperbacks.
  if (pdfDoc.getPageCount() % 2 !== 0) {
    pdfDoc.addPage([INTERIOR_PAGE_W_PT, INTERIOR_PAGE_H_PT]);
  }

  logger.info(
    { pageCount: pdfDoc.getPageCount(), bookTitle, gutterInches },
    "Interior PDF generated"
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

interface CoverFonts {
  helveticaBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  helvetica: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  timesRomanBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  timesRoman: Awaited<ReturnType<PDFDocument["embedFont"]>>;
}

// Mirrors the rainbow stripe band rendered in the frontend cover preview
// (artifacts/colorgifts/src/components/cover-designer.tsx).
const RAINBOW_STRIPES: RGB[] = [
  rgb(0.937, 0.267, 0.267), // #EF4444 red
  rgb(0.976, 0.451, 0.086), // #F97316 orange
  rgb(0.918, 0.702, 0.031), // #EAB308 yellow
  rgb(0.133, 0.773, 0.369), // #22C55E green
  rgb(0.231, 0.510, 0.965), // #3B82F6 blue
  rgb(0.545, 0.361, 0.965), // #8B5CF6 purple
];

// Draws the rainbow band along the top of a cover panel from (x, y) with
// width w; band height ~18pt. Stripes span full width to bleed for clean trim.
function drawRainbowStripeBand(
  coverPage: ReturnType<PDFDocument["addPage"]>,
  x: number,
  y: number,
  w: number,
  bandHeight: number
) {
  const stripeW = w / RAINBOW_STRIPES.length;
  RAINBOW_STRIPES.forEach((color, i) => {
    coverPage.drawRectangle({
      x: x + i * stripeW,
      y,
      width: stripeW,
      height: bandHeight,
      color,
    });
  });
}

// Render front cover content. (x,y,w,h) is the trim rectangle; safetyInset
// (in points) keeps text/critical art away from the trim edge per Lulu spec.
async function drawFrontCover(
  pdfDoc: PDFDocument,
  coverPage: ReturnType<PDFDocument["addPage"]>,
  template: TemplateConfig,
  templateId: CoverTemplate,
  bookTitle: string,
  subtitle: string | null | undefined,
  tagline: string | null | undefined,
  coverImagePath: string | null | undefined,
  fonts: CoverFonts,
  x: number,
  y: number,
  w: number,
  h: number,
  safetyInset: number
) {
  const { helveticaBold, timesRomanBold, timesRoman } = fonts;

  coverPage.drawRectangle({ x, y, width: w, height: h, color: template.bgColor });

  // Rainbow template: paint a stripe band across the very top of the panel,
  // mirroring the on-screen preview. Drawn before the border so the border
  // sits over the bottom edge of the band.
  const rainbowBandHeight = templateId === "rainbow" ? 18 : 0;
  if (templateId === "rainbow") {
    drawRainbowStripeBand(coverPage, x, y + h - rainbowBandHeight, w, rainbowBandHeight);
  }

  // Decorative border sits inside the safety zone so it never gets trimmed off.
  const borderInset = safetyInset;
  coverPage.drawRectangle({
    x: x + borderInset,
    y: y + borderInset,
    width: w - borderInset * 2,
    height: h - borderInset * 2 - rainbowBandHeight,
    borderColor: template.borderColor,
    borderWidth: 2,
    color: template.bgColor,
  });

  // Safe content rectangle: every text element below is positioned within this box.
  // When the rainbow band is drawn, shrink the safe area's top edge so text
  // doesn't overlap the stripes.
  const safeX = x + safetyInset;
  const safeY = y + safetyInset;
  const safeW = w - safetyInset * 2;
  const safeH = h - safetyInset * 2 - rainbowBandHeight;

  // Title block (top of safe area)
  const titleFontSize = Math.min(36, Math.max(20, 320 / Math.max(bookTitle.length, 1)));
  const titleLines = wrapText(bookTitle, Math.floor(safeW / (titleFontSize * 0.58)));
  const titleTopY = safeY + safeH - titleFontSize - 12;
  titleLines.forEach((line, i) => {
    const lw = timesRomanBold.widthOfTextAtSize(line, titleFontSize);
    coverPage.drawText(line, {
      x: safeX + (safeW - lw) / 2,
      y: titleTopY - i * (titleFontSize + 8),
      font: timesRomanBold,
      size: titleFontSize,
      color: template.titleColor,
    });
  });

  let belowTitleY = titleTopY - titleLines.length * (titleFontSize + 8) - 14;

  if (subtitle) {
    const subSize = 14;
    const subLines = wrapText(subtitle, Math.floor(safeW / (subSize * 0.6)));
    subLines.forEach((line, i) => {
      const lw = timesRoman.widthOfTextAtSize(line, subSize);
      coverPage.drawText(line, {
        x: safeX + (safeW - lw) / 2,
        y: belowTitleY - i * (subSize + 5),
        font: timesRoman,
        size: subSize,
        color: template.subtitleColor,
      });
    });
    belowTitleY -= subLines.length * (subSize + 5) + 12;
  }

  // Brand + tagline block at the bottom of the safe area.
  const brandSize = 13;
  const taglineSize = 11;
  const displayTagline = tagline?.trim() || "A Personalized Coloring Book";
  const taglineLines = wrapText(displayTagline, Math.floor(safeW / (taglineSize * 0.6)));
  const brandY = safeY + 8;
  const brandWidth = helveticaBold.widthOfTextAtSize("ColorGifts", brandSize);
  coverPage.drawText("ColorGifts", {
    x: safeX + (safeW - brandWidth) / 2,
    y: brandY,
    font: helveticaBold,
    size: brandSize,
    color: template.accentColor,
  });
  const taglineBlockTop = brandY + brandSize + 8 + (taglineLines.length - 1) * (taglineSize + 4);
  taglineLines.forEach((line, i) => {
    const lw = timesRoman.widthOfTextAtSize(line, taglineSize);
    coverPage.drawText(line, {
      x: safeX + (safeW - lw) / 2,
      y: taglineBlockTop - i * (taglineSize + 4),
      font: timesRoman,
      size: taglineSize,
      color: template.taglineColor,
    });
  });

  // Center image: render the user-selected cover image inside the gap between
  // the subtitle and the tagline block, scaled to fit and kept inside safety.
  if (coverImagePath) {
    try {
      const { bytes, isPng } = await fetchImageBytes(coverImagePath);
      const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
      const imageTopY = belowTitleY - 8;
      const imageBottomY = taglineBlockTop + taglineSize + 14;
      const imageAreaH = Math.max(0, imageTopY - imageBottomY);
      const imageAreaW = safeW * 0.85;
      if (imageAreaH > 40) {
        const dims = image.scaleToFit(imageAreaW, imageAreaH);
        const ix = safeX + (safeW - dims.width) / 2;
        const iy = imageBottomY + (imageAreaH - dims.height) / 2;
        coverPage.drawImage(image, { x: ix, y: iy, width: dims.width, height: dims.height });
      }
    } catch (err) {
      logger.warn({ err, coverImagePath }, "Failed to embed cover image, skipping");
    }
  }
}

// Render back cover content with reserved barcode area in the lower-left,
// per Lulu cover_template.pdf (3.625" x 1.25", positioned 0.5" from bleed edge).
function drawBackCover(
  coverPage: ReturnType<PDFDocument["addPage"]>,
  template: TemplateConfig,
  templateId: CoverTemplate,
  pageCount: number,
  fonts: CoverFonts,
  x: number,
  y: number,
  w: number,
  h: number,
  safetyInset: number,
  bleedPt: number
) {
  const { helveticaBold, helvetica, timesRoman } = fonts;

  coverPage.drawRectangle({ x, y, width: w, height: h, color: template.bgColor });

  const rainbowBandHeight = templateId === "rainbow" ? 18 : 0;
  if (templateId === "rainbow") {
    drawRainbowStripeBand(coverPage, x, y + h - rainbowBandHeight, w, rainbowBandHeight);
  }

  coverPage.drawRectangle({
    x: x + safetyInset,
    y: y + safetyInset,
    width: w - safetyInset * 2,
    height: h - safetyInset * 2 - rainbowBandHeight,
    borderColor: template.borderColor,
    borderWidth: 1,
    color: template.bgColor,
  });

  const safeX = x + safetyInset;
  const safeW = w - safetyInset * 2;
  const safeTopY = y + h - safetyInset - rainbowBandHeight;

  const headingSize = 20;
  const headingW = helveticaBold.widthOfTextAtSize("ColorGifts", headingSize);
  coverPage.drawText("ColorGifts", {
    x: safeX + (safeW - headingW) / 2,
    y: safeTopY - headingSize - 8,
    font: helveticaBold,
    size: headingSize,
    color: template.accentColor,
  });

  const desc = "Turn your favorite memories into a beautiful\npersonalized coloring book for the whole family.";
  desc.split("\n").forEach((line, i) => {
    const lw = timesRoman.widthOfTextAtSize(line, 11);
    coverPage.drawText(line, {
      x: safeX + (safeW - lw) / 2,
      y: safeTopY - headingSize - 8 - 28 - i * 18,
      font: timesRoman,
      size: 11,
      color: template.taglineColor,
    });
  });

  const pageCountText = `${pageCount} Coloring Pages`;
  const pageCountW = helvetica.widthOfTextAtSize(pageCountText, 10);
  // Position above the reserved barcode zone so the text never collides with it.
  const barcodeTopY = y + bleedPt + COVER_SPEC.safetyInches * COVER_SPEC.pointsPerInch + BARCODE_H_PT;
  coverPage.drawText(pageCountText, {
    x: safeX + (safeW - pageCountW) / 2,
    y: barcodeTopY + 14,
    font: helvetica,
    size: 10,
    color: template.taglineColor,
  });

  // Reserved barcode area (Lulu auto-places ISBN/barcode here on print).
  // We draw a faint placeholder so designers know the zone is off-limits.
  const barcodeX = x + bleedPt + COVER_SPEC.safetyInches * COVER_SPEC.pointsPerInch;
  const barcodeY = y + bleedPt + COVER_SPEC.safetyInches * COVER_SPEC.pointsPerInch;
  coverPage.drawRectangle({
    x: barcodeX,
    y: barcodeY,
    width: BARCODE_W_PT,
    height: BARCODE_H_PT,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 0.5,
  });
}

export interface GenerateCoverPdfOptions {
  templateId?: CoverTemplate;
  tagline?: string | null;
  coverImagePath?: string | null;
}

export async function generateCoverPdf(
  bookTitle: string,
  subtitle: string | null | undefined,
  pageCount: number,
  coverDimensions: CoverDimensions,
  options: GenerateCoverPdfOptions = {}
): Promise<Buffer> {
  const { templateId = "classic", tagline, coverImagePath } = options;
  const template = TEMPLATES[templateId] ?? TEMPLATES.classic;
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fonts: CoverFonts = { helveticaBold, helvetica, timesRomanBold, timesRoman };

  // Lulu returns total cover width/height in points; bleed and spine_width are
  // also in points. Layout = BACK COVER | SPINE | FRONT COVER (left to right).
  const coverWidth = coverDimensions.width;
  const coverHeight = coverDimensions.height;
  const spineWidth = coverDimensions.spine_width;
  const bleed = coverDimensions.bleed;
  const trimWidth = (coverWidth - spineWidth - bleed * 2) / 2;
  const trimHeight = coverHeight - bleed * 2;

  const coverPage = pdfDoc.addPage([coverWidth, coverHeight]);
  // Fill the full bleed area so any over-trim still shows the template colour.
  coverPage.drawRectangle({ x: 0, y: 0, width: coverWidth, height: coverHeight, color: template.bgColor });

  const backX = bleed;
  const spineX = bleed + trimWidth;
  const frontX = bleed + trimWidth + spineWidth;

  drawBackCover(
    coverPage, template, templateId, pageCount, fonts,
    backX, bleed, trimWidth, trimHeight, SAFETY_PT, bleed
  );

  // Lulu disallows spine text entirely on books with 80 pages or fewer
  // (spine is too thin to print legibly).
  const spineTextAllowed = pageCount >= COVER_SPEC.spineTextMinPages;
  if (spineTextAllowed) {
    coverPage.drawRectangle({
      x: spineX, y: bleed,
      width: spineWidth, height: trimHeight,
      color: template.bgColor,
    });
    const spineTitleFontSize = Math.min(14, spineWidth * 0.55);
    const spineTextWidth = helveticaBold.widthOfTextAtSize(bookTitle, spineTitleFontSize);
    // Rotate -90: text reads top-down on the spine. Position so center of the
    // rotated text lands at the spine's center.
    coverPage.drawText(bookTitle, {
      x: spineX + spineWidth / 2 + spineTitleFontSize / 2,
      y: bleed + (trimHeight - spineTextWidth) / 2,
      font: helveticaBold,
      size: spineTitleFontSize,
      color: template.titleColor,
      rotate: degrees(-90),
    });
  }

  await drawFrontCover(
    pdfDoc, coverPage, template, templateId, bookTitle, subtitle, tagline, coverImagePath,
    fonts, frontX, bleed, trimWidth, trimHeight, SAFETY_PT
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Fallback cover used when Lulu's /cover-dimensions API call fails. Builds a
// full trim+bleed spread (BACK | SPINE | FRONT) using the published paperback
// spine formula so the resulting PDF still passes Lulu's print validation.
export async function generateSimpleCoverPdf(
  bookTitle: string,
  subtitle: string | null | undefined,
  pageCount: number,
  templateId: CoverTemplate = "classic",
  tagline?: string | null,
  coverImagePath?: string | null
): Promise<Buffer> {
  const template = TEMPLATES[templateId] ?? TEMPLATES.classic;
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fonts: CoverFonts = { helveticaBold, helvetica, timesRomanBold, timesRoman };

  // Build dimensions to match Lulu's /cover-dimensions response shape.
  const trimWidth = COVER_SPEC.trimWidthInches * COVER_SPEC.pointsPerInch;
  const trimHeight = COVER_SPEC.trimHeightInches * COVER_SPEC.pointsPerInch;
  const spineWidth = calculateSpineWidthInches(pageCount) * COVER_SPEC.pointsPerInch;
  const bleed = COVER_BLEED_PT;
  const coverWidth = trimWidth * 2 + spineWidth + bleed * 2;
  const coverHeight = trimHeight + bleed * 2;

  const coverPage = pdfDoc.addPage([coverWidth, coverHeight]);
  coverPage.drawRectangle({ x: 0, y: 0, width: coverWidth, height: coverHeight, color: template.bgColor });

  const backX = bleed;
  const spineX = bleed + trimWidth;
  const frontX = bleed + trimWidth + spineWidth;

  drawBackCover(
    coverPage, template, templateId, pageCount, fonts,
    backX, bleed, trimWidth, trimHeight, SAFETY_PT, bleed
  );

  if (pageCount >= COVER_SPEC.spineTextMinPages) {
    coverPage.drawRectangle({
      x: spineX, y: bleed,
      width: spineWidth, height: trimHeight,
      color: template.bgColor,
    });
    const spineTitleFontSize = Math.min(14, spineWidth * 0.55);
    const spineTextWidth = helveticaBold.widthOfTextAtSize(bookTitle, spineTitleFontSize);
    coverPage.drawText(bookTitle, {
      x: spineX + spineWidth / 2 + spineTitleFontSize / 2,
      y: bleed + (trimHeight - spineTextWidth) / 2,
      font: helveticaBold,
      size: spineTitleFontSize,
      color: template.titleColor,
      rotate: degrees(-90),
    });
  }

  await drawFrontCover(
    pdfDoc, coverPage, template, templateId, bookTitle, subtitle, tagline, coverImagePath,
    fonts, frontX, bleed, trimWidth, trimHeight, SAFETY_PT
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function uploadPdfBuffer(pdfBuffer: Buffer, filename: string): Promise<string> {
  const objectPath = await saveLocalUploadBuffer(pdfBuffer, "application/pdf");
  logger.info({ objectPath, filename }, "PDF uploaded to storage");
  return objectPath;
}
