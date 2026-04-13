import { PDFDocument, rgb, StandardFonts, degrees, type RGB } from "pdf-lib";
import { ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";
import type { ColoringPage } from "@workspace/db";
import type { CoverDimensions } from "./lulu";

const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;

const storage = new ObjectStorageService();

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
    bgColor: rgb(0.97, 0.97, 0.95),
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
  const file = await storage.getObjectEntityFile(cleanPath);
  const [fileContents] = await file.download();
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

  if (dedication) {
    const dedPage = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    dedPage.drawText("Dedication", {
      x: PAGE_WIDTH_PT / 2 - 50,
      y: PAGE_HEIGHT_PT - 120,
      font: helveticaBold,
      size: 22,
      color: rgb(0.1, 0.1, 0.1),
    });
    const lines = wrapText(dedication, 65);
    lines.forEach((line, i) => {
      dedPage.drawText(line, {
        x: 72,
        y: PAGE_HEIGHT_PT / 2 + 40 - i * 28,
        font: helvetica,
        size: 16,
        color: rgb(0.2, 0.2, 0.2),
      });
    });
  }

  for (const page of readyPages) {
    const pdfPage = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    try {
      const { bytes, isPng } = await fetchImageBytes(page.coloringImagePath!);
      const image = isPng
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);

      const hasCaption = page.caption && page.caption.trim().length > 0;
      const captionHeight = hasCaption ? 36 : 0;
      const imageAreaHeight = PAGE_HEIGHT_PT - captionHeight - 36;
      const imageAreaWidth = PAGE_WIDTH_PT - 72;

      const imgDims = image.scaleToFit(imageAreaWidth, imageAreaHeight);
      const x = (PAGE_WIDTH_PT - imgDims.width) / 2;
      const y = captionHeight + (imageAreaHeight - imgDims.height) / 2 + 18;

      pdfPage.drawImage(image, { x, y, width: imgDims.width, height: imgDims.height });

      if (hasCaption) {
        const captionFontSize = 13;
        const captionText = page.caption!.trim();
        const captionWidth = helvetica.widthOfTextAtSize(captionText, captionFontSize);
        pdfPage.drawText(captionText, {
          x: (PAGE_WIDTH_PT - captionWidth) / 2,
          y: 18,
          font: helvetica,
          size: captionFontSize,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
    } catch (err) {
      logger.error({ pageId: page.id, err }, "Failed to embed image for page, inserting blank page");
      pdfPage.drawText(`Page ${page.sortOrder + 1}`, {
        x: PAGE_WIDTH_PT / 2 - 30,
        y: PAGE_HEIGHT_PT / 2,
        font: helvetica,
        size: 14,
        color: rgb(0.7, 0.7, 0.7),
      });
    }
  }

  if (pdfDoc.getPageCount() % 2 !== 0) {
    pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function drawTemplateCoverContent(
  coverPage: ReturnType<PDFDocument["addPage"]>,
  template: TemplateConfig,
  bookTitle: string,
  subtitle: string | null | undefined,
  tagline: string | null | undefined,
  pageCount: number,
  fonts: {
    helveticaBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    helvetica: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    timesRomanBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    timesRoman: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  },
  x: number,
  y: number,
  w: number,
  h: number
) {
  const { helveticaBold, helvetica, timesRomanBold, timesRoman } = fonts;

  coverPage.drawRectangle({ x, y, width: w, height: h, color: template.bgColor });

  const inset = 14;
  coverPage.drawRectangle({
    x: x + inset,
    y: y + inset,
    width: w - inset * 2,
    height: h - inset * 2,
    borderColor: template.borderColor,
    borderWidth: 2,
    color: template.bgColor,
  });

  const titleFontSize = Math.min(34, Math.max(18, 300 / Math.max(bookTitle.length, 1)));
  const titleLines = wrapText(bookTitle, Math.floor(w / (titleFontSize * 0.58)));

  titleLines.forEach((line, i) => {
    const lw = timesRomanBold.widthOfTextAtSize(line, titleFontSize);
    coverPage.drawText(line, {
      x: x + (w - lw) / 2,
      y: y + h * 0.55 - i * (titleFontSize + 8),
      font: timesRomanBold,
      size: titleFontSize,
      color: template.titleColor,
    });
  });

  let nextY = y + h * 0.55 - titleLines.length * (titleFontSize + 8) - 20;

  if (subtitle) {
    const subSize = 14;
    const subLines = wrapText(subtitle, Math.floor(w / (subSize * 0.6)));
    subLines.forEach((line, i) => {
      const lw = timesRoman.widthOfTextAtSize(line, subSize);
      coverPage.drawText(line, {
        x: x + (w - lw) / 2,
        y: nextY - i * (subSize + 5),
        font: timesRoman,
        size: subSize,
        color: template.subtitleColor,
      });
    });
    nextY -= subLines.length * (subSize + 5) + 14;
  }

  const displayTagline = tagline?.trim() || "A Personalized Coloring Book";
  const taglineSize = 11;
  const taglineLines = wrapText(displayTagline, Math.floor(w / (taglineSize * 0.6)));
  taglineLines.forEach((line, i) => {
    const lw = timesRoman.widthOfTextAtSize(line, taglineSize);
    coverPage.drawText(line, {
      x: x + (w - lw) / 2,
      y: y + 72 + i * (taglineSize + 4),
      font: timesRoman,
      size: taglineSize,
      color: template.taglineColor,
    });
  });

  const brandText = "ColorGifts";
  const brandSize = 13;
  const brandWidth = helveticaBold.widthOfTextAtSize(brandText, brandSize);
  coverPage.drawText(brandText, {
    x: x + (w - brandWidth) / 2,
    y: y + 36,
    font: helveticaBold,
    size: brandSize,
    color: template.accentColor,
  });
}

export async function generateCoverPdf(
  bookTitle: string,
  subtitle: string | null | undefined,
  pageCount: number,
  coverDimensions: CoverDimensions,
  templateId: CoverTemplate = "classic",
  tagline?: string | null
): Promise<Buffer> {
  const template = TEMPLATES[templateId] ?? TEMPLATES.classic;
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fonts = { helveticaBold, helvetica, timesRomanBold, timesRoman };

  const coverWidth = coverDimensions.width;
  const coverHeight = coverDimensions.height;
  const spineWidth = coverDimensions.spine_width;
  const bleed = coverDimensions.bleed;
  const trimWidth = (coverWidth - spineWidth - bleed * 2) / 2;
  const trimHeight = coverHeight - bleed * 2;

  const coverPage = pdfDoc.addPage([coverWidth, coverHeight]);
  coverPage.drawRectangle({ x: 0, y: 0, width: coverWidth, height: coverHeight, color: template.bgColor });

  const frontX = bleed + trimWidth + spineWidth;
  drawTemplateCoverContent(
    coverPage, template, bookTitle, subtitle, tagline, pageCount,
    fonts, frontX, bleed, trimWidth, trimHeight
  );

  if (spineWidth > 28) {
    const spineCenterX = bleed + trimWidth + spineWidth / 2;
    const spineTitleFontSize = Math.min(14, spineWidth * 0.5);
    coverPage.drawRectangle({
      x: bleed + trimWidth, y: bleed,
      width: spineWidth, height: trimHeight,
      color: template.bgColor,
    });
    coverPage.drawText(bookTitle, {
      x: spineCenterX + helveticaBold.widthOfTextAtSize(bookTitle, spineTitleFontSize) / 2,
      y: coverHeight / 2,
      font: helveticaBold,
      size: spineTitleFontSize,
      color: template.titleColor,
      rotate: degrees(-90),
    });
  }

  const backCoverX = bleed;
  coverPage.drawRectangle({ x: backCoverX, y: bleed, width: trimWidth, height: trimHeight, color: template.bgColor });
  const inset = 14;
  coverPage.drawRectangle({
    x: backCoverX + inset, y: bleed + inset,
    width: trimWidth - inset * 2, height: trimHeight - inset * 2,
    borderColor: template.borderColor,
    borderWidth: 1,
    color: template.bgColor,
  });

  const backTitleSize = 20;
  const backTitleWidth = helveticaBold.widthOfTextAtSize("ColorGifts", backTitleSize);
  coverPage.drawText("ColorGifts", {
    x: backCoverX + (trimWidth - backTitleWidth) / 2,
    y: bleed + trimHeight - 72,
    font: helveticaBold, size: backTitleSize, color: template.accentColor,
  });

  const backDesc = "Turn your favorite memories into a beautiful\npersonalized coloring book for the whole family.";
  backDesc.split("\n").forEach((line, i) => {
    const lw = timesRoman.widthOfTextAtSize(line, 11);
    coverPage.drawText(line, {
      x: backCoverX + (trimWidth - lw) / 2,
      y: bleed + trimHeight - 115 - i * 20,
      font: timesRoman, size: 11, color: template.taglineColor,
    });
  });

  const pageCountText = `${pageCount} Coloring Pages`;
  const pageCountWidth = helvetica.widthOfTextAtSize(pageCountText, 10);
  coverPage.drawText(pageCountText, {
    x: backCoverX + (trimWidth - pageCountWidth) / 2,
    y: bleed + 36,
    font: helvetica, size: 10, color: template.taglineColor,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateSimpleCoverPdf(
  bookTitle: string,
  subtitle: string | null | undefined,
  pageCount: number,
  templateId: CoverTemplate = "classic",
  tagline?: string | null
): Promise<Buffer> {
  const template = TEMPLATES[templateId] ?? TEMPLATES.classic;
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fonts = { helveticaBold, helvetica, timesRomanBold, timesRoman };

  const coverPage = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
  drawTemplateCoverContent(
    coverPage, template, bookTitle, subtitle, tagline, pageCount,
    fonts, 0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT
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
  const uploadUrl = await storage.getObjectEntityUploadURL();

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: pdfBuffer,
    headers: { "Content-Type": "application/pdf" },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload PDF: ${uploadResponse.statusText}`);
  }

  const objectPath = storage.normalizeObjectEntityPath(uploadUrl);
  logger.info({ objectPath, filename }, "PDF uploaded to storage");
  return objectPath;
}
