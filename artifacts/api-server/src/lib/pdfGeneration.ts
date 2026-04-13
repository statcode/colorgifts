import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";
import type { ColoringPage } from "@workspace/db";
import type { CoverDimensions } from "./lulu";

const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;

const storage = new ObjectStorageService();

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

      pdfPage.drawImage(image, {
        x,
        y,
        width: imgDims.width,
        height: imgDims.height,
      });

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

export async function generateCoverPdf(
  bookTitle: string,
  subtitle: string | null | undefined,
  pageCount: number,
  coverDimensions: CoverDimensions
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const coverWidth = coverDimensions.width;
  const coverHeight = coverDimensions.height;
  const spineWidth = coverDimensions.spine_width;
  const bleed = coverDimensions.bleed;

  const trimWidth = (coverWidth - spineWidth - bleed * 2) / 2;
  const trimHeight = coverHeight - bleed * 2;

  const coverPage = pdfDoc.addPage([coverWidth, coverHeight]);

  coverPage.drawRectangle({
    x: 0,
    y: 0,
    width: coverWidth,
    height: coverHeight,
    color: rgb(1, 1, 1),
  });

  const frontCoverX = bleed + trimWidth + spineWidth;
  const frontCoverWidth = trimWidth;
  const frontCoverY = bleed;

  coverPage.drawRectangle({
    x: frontCoverX + 18,
    y: frontCoverY + 18,
    width: frontCoverWidth - 36,
    height: trimHeight - 36,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 2,
    color: rgb(0.97, 0.97, 0.95),
  });

  const titleFontSize = Math.min(32, Math.max(18, 320 / Math.max(bookTitle.length, 1)));
  const titleLines = wrapText(bookTitle, Math.floor(frontCoverWidth / (titleFontSize * 0.6)));

  titleLines.forEach((line, i) => {
    const lineWidth = timesRomanBold.widthOfTextAtSize(line, titleFontSize);
    coverPage.drawText(line, {
      x: frontCoverX + (frontCoverWidth - lineWidth) / 2,
      y: bleed + trimHeight * 0.55 - i * (titleFontSize + 8),
      font: timesRomanBold,
      size: titleFontSize,
      color: rgb(0.08, 0.08, 0.08),
    });
  });

  if (subtitle) {
    const subFontSize = 14;
    const subLines = wrapText(subtitle, Math.floor(frontCoverWidth / (subFontSize * 0.6)));
    subLines.forEach((line, i) => {
      const lineWidth = timesRoman.widthOfTextAtSize(line, subFontSize);
      coverPage.drawText(line, {
        x: frontCoverX + (frontCoverWidth - lineWidth) / 2,
        y: bleed + trimHeight * 0.55 - titleLines.length * (titleFontSize + 8) - 24 - i * (subFontSize + 6),
        font: timesRoman,
        size: subFontSize,
        color: rgb(0.35, 0.35, 0.35),
      });
    });
  }

  const coloringText = "A Personalized Coloring Book";
  const coloringWidth = timesRoman.widthOfTextAtSize(coloringText, 12);
  coverPage.drawText(coloringText, {
    x: frontCoverX + (frontCoverWidth - coloringWidth) / 2,
    y: bleed + 60,
    font: timesRoman,
    size: 12,
    color: rgb(0.5, 0.5, 0.5),
  });

  const brandText = "ColorGifts";
  const brandWidth = helveticaBold.widthOfTextAtSize(brandText, 14);
  coverPage.drawText(brandText, {
    x: frontCoverX + (frontCoverWidth - brandWidth) / 2,
    y: bleed + 36,
    font: helveticaBold,
    size: 14,
    color: rgb(0.2, 0.2, 0.2),
  });

  if (spineWidth > 28) {
    const spineCenterX = bleed + trimWidth + spineWidth / 2;
    const spineCenterY = coverHeight / 2;

    const spineTitleFontSize = Math.min(14, spineWidth * 0.5);
    coverPage.drawText(bookTitle, {
      x: spineCenterX + helveticaBold.widthOfTextAtSize(bookTitle, spineTitleFontSize) / 2,
      y: spineCenterY,
      font: helveticaBold,
      size: spineTitleFontSize,
      color: rgb(0.08, 0.08, 0.08),
      rotate: degrees(-90),
    });
  }

  const backCoverX = bleed;
  const backCoverWidth = trimWidth;

  coverPage.drawRectangle({
    x: backCoverX + 18,
    y: bleed + 18,
    width: backCoverWidth - 36,
    height: trimHeight - 36,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });

  const backTitleText = "ColorGifts";
  const backTitleSize = 22;
  const backTitleWidth = helveticaBold.widthOfTextAtSize(backTitleText, backTitleSize);
  coverPage.drawText(backTitleText, {
    x: backCoverX + (backCoverWidth - backTitleWidth) / 2,
    y: bleed + trimHeight - 80,
    font: helveticaBold,
    size: backTitleSize,
    color: rgb(0.1, 0.1, 0.1),
  });

  const backDesc = "Turn your favorite memories into a beautiful\npersonalized coloring book for the whole family.";
  const backDescLines = backDesc.split("\n");
  backDescLines.forEach((line, i) => {
    const lineWidth = timesRoman.widthOfTextAtSize(line, 11);
    coverPage.drawText(line, {
      x: backCoverX + (backCoverWidth - lineWidth) / 2,
      y: bleed + trimHeight - 130 - i * 20,
      font: timesRoman,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  const pageCountText = `${pageCount} Coloring Pages`;
  const pageCountWidth = helvetica.widthOfTextAtSize(pageCountText, 10);
  coverPage.drawText(pageCountText, {
    x: backCoverX + (backCoverWidth - pageCountWidth) / 2,
    y: bleed + 36,
    font: helvetica,
    size: 10,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateSimpleCoverPdf(
  bookTitle: string,
  subtitle: string | null | undefined,
  pageCount: number
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const coverPage = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  coverPage.drawRectangle({
    x: 0, y: 0,
    width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT,
    color: rgb(1, 1, 1),
  });

  coverPage.drawRectangle({
    x: 18, y: 18,
    width: PAGE_WIDTH_PT - 36, height: PAGE_HEIGHT_PT - 36,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 2,
    color: rgb(0.97, 0.97, 0.95),
  });

  const titleFontSize = Math.min(36, Math.max(18, 360 / Math.max(bookTitle.length, 1)));
  const titleLines = wrapText(bookTitle, Math.floor(PAGE_WIDTH_PT / (titleFontSize * 0.6)));

  titleLines.forEach((line, i) => {
    const lineWidth = timesRomanBold.widthOfTextAtSize(line, titleFontSize);
    coverPage.drawText(line, {
      x: (PAGE_WIDTH_PT - lineWidth) / 2,
      y: PAGE_HEIGHT_PT * 0.6 - i * (titleFontSize + 8),
      font: timesRomanBold,
      size: titleFontSize,
      color: rgb(0.08, 0.08, 0.08),
    });
  });

  if (subtitle) {
    const subFontSize = 16;
    const subLines = wrapText(subtitle, Math.floor(PAGE_WIDTH_PT / (subFontSize * 0.6)));
    subLines.forEach((line, i) => {
      const lineWidth = timesRoman.widthOfTextAtSize(line, subFontSize);
      coverPage.drawText(line, {
        x: (PAGE_WIDTH_PT - lineWidth) / 2,
        y: PAGE_HEIGHT_PT * 0.6 - titleLines.length * (titleFontSize + 8) - 30 - i * (subFontSize + 6),
        font: timesRoman,
        size: subFontSize,
        color: rgb(0.35, 0.35, 0.35),
      });
    });
  }

  const coloringText = "A Personalized Coloring Book";
  const coloringWidth = timesRoman.widthOfTextAtSize(coloringText, 13);
  coverPage.drawText(coloringText, {
    x: (PAGE_WIDTH_PT - coloringWidth) / 2,
    y: 90,
    font: timesRoman,
    size: 13,
    color: rgb(0.5, 0.5, 0.5),
  });

  const brandText = "ColorGifts";
  const brandWidth = helveticaBold.widthOfTextAtSize(brandText, 16);
  coverPage.drawText(brandText, {
    x: (PAGE_WIDTH_PT - brandWidth) / 2,
    y: 54,
    font: helveticaBold,
    size: 16,
    color: rgb(0.2, 0.2, 0.2),
  });

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
    headers: {
      "Content-Type": "application/pdf",
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload PDF: ${uploadResponse.statusText}`);
  }

  const objectPath = storage.normalizeObjectEntityPath(uploadUrl);
  logger.info({ objectPath, filename }, "PDF uploaded to storage");
  return objectPath;
}
