import { readLocalUploadWithMeta, saveLocalUploadBuffer } from "./localObjectStorage";
import { logger } from "./logger";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Override via env (e.g. `google/gemini-2.5-flash-image-preview:free` or a paid
// image-capable model — see https://openrouter.ai/models?modalities=image).
const MODEL = process.env.OPENROUTER_IMAGE_MODEL ?? "google/gemini-2.5-flash-image";

function getStylePrompt(style: string): string {
  const prompts: Record<string, string> = {
    simple: "Transform this exact photo into a simple children's coloring book page. Preserve the specific subjects, people, animals, and scene from this photo. Use very thick bold black outlines only. Keep shapes large and simple. White background, pure black line art only, absolutely no gray shading, no color, no fill.",
    cartoon: "Transform this exact photo into a cartoon-style coloring book page. Preserve all specific subjects, faces, animals, and elements from this photo. Use bold black outlines with clean cartoon styling. White background, pure black line art only, no gray shading, no color, no fill.",
    detailed: "Transform this exact photo into a detailed coloring book page. Faithfully preserve every subject, person, animal, and element from this photo. Use fine black outlines with rich detail and texture. White background, pure black line art only, no gray shading, no color, no fill.",
  };
  return prompts[style] ?? prompts.simple;
}

interface ImageResult {
  mimeType: string;
  base64: string;
}

async function editImageViaOpenRouter(
  prompt: string,
  imageBase64: string,
  imageMime: string,
): Promise<ImageResult> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${body}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string; images?: { image_url?: { url?: string } }[] } }[];
  };
  const message = json.choices?.[0]?.message;
  const imageUrl = message?.images?.[0]?.image_url?.url;

  if (typeof imageUrl !== "string" || !imageUrl.startsWith("data:")) {
    // Model returned a text refusal instead of an image — surface it.
    const text = typeof message?.content === "string" ? message.content : undefined;
    throw new Error(
      text
        ? `OpenRouter returned no image. Model said: ${text}`
        : "OpenRouter returned no image data",
    );
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(imageUrl);
  if (!match) throw new Error("OpenRouter returned malformed image data URL");
  return { mimeType: match[1], base64: match[2] };
}

export async function generateColoringPage(
  originalObjectPath: string,
  style: string,
): Promise<string> {
  const prompt = getStylePrompt(style);

  logger.info({ originalObjectPath, style, model: MODEL }, "Starting coloring page generation");

  let imageBuffer: Buffer;
  let contentType: string;

  if (originalObjectPath.startsWith("http")) {
    const fetchResponse = await fetch(originalObjectPath);
    if (!fetchResponse.ok) throw new Error(`Failed to fetch image: ${fetchResponse.statusText}`);
    imageBuffer = Buffer.from(await fetchResponse.arrayBuffer());
    contentType = fetchResponse.headers.get("content-type") ?? "image/jpeg";
  } else {
    const cleanPath = originalObjectPath.startsWith("/objects/")
      ? originalObjectPath
      : `/objects/${originalObjectPath}`;
    ({ buffer: imageBuffer, contentType } = await readLocalUploadWithMeta(cleanPath));
  }

  const { mimeType, base64 } = await editImageViaOpenRouter(
    prompt,
    imageBuffer.toString("base64"),
    contentType,
  );

  const resultBuffer = Buffer.from(base64, "base64");
  const objectPath = await saveLocalUploadBuffer(resultBuffer, mimeType);
  logger.info({ objectPath }, "Coloring page generated and stored");

  return objectPath;
}
