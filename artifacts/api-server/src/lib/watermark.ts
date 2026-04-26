import sharp from "sharp";
import { Readable } from "stream";

const WATERMARK_TEXT = "COLORGIFTS";
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_INPUT_BYTES) throw new Error("Image too large to watermark");
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function buildWatermarkSvg(width: number, height: number): Buffer {
  const fontSize = Math.max(32, Math.round(Math.min(width, height) * 0.11));
  const step = Math.round(fontSize * 2.2);
  const diag = Math.sqrt(width * width + height * height);
  const repeats = Math.max(6, Math.ceil(diag / fontSize));
  const text = Array.from({ length: repeats }, () => WATERMARK_TEXT).join("   ·   ");

  const rowOffsets: number[] = [];
  for (let y = -height; y <= height * 2; y += step) rowOffsets.push(y);

  const rows = rowOffsets
    .map(
      (y) =>
        `<text x="${width / 2}" y="${y}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-30 ${width / 2} ${y})">${text}</text>`,
    )
    .join("");

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        text {
          font-family: "Helvetica", "Arial", sans-serif;
          font-weight: 900;
          font-size: ${fontSize}px;
          fill: rgba(220, 38, 38, 0.45);
          letter-spacing: 0.15em;
        }
      </style>
      ${rows}
    </svg>`,
  );
}

export async function watermarkImage(source: Readable): Promise<{ buffer: Buffer; contentType: string }> {
  const input = await readAll(source);
  const image = sharp(input, { failOn: "none" });
  const meta = await image.metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  const svg = buildWatermarkSvg(width, height);
  const buffer = await image
    .composite([{ input: svg, blend: "over" }])
    .png()
    .toBuffer();

  return { buffer, contentType: "image/png" };
}
