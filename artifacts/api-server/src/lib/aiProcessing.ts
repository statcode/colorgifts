import OpenAI from "openai";
import { ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
});

const storage = new ObjectStorageService();

function getStylePrompt(style: string): string {
  const prompts: Record<string, string> = {
    simple: "Convert this image into a simple children's coloring page. Use very thick, bold black outlines. Keep shapes large and simple. Remove all color, shading, and detail. Suitable for ages 3-5. White background, black lines only, no gray shading.",
    cartoon: "Convert this image into a cartoon-style coloring page for children. Use bold black outlines with medium detail. Include character features but keep them fun and rounded. Remove all color. White background, clean black line art only, no gray areas.",
    detailed: "Convert this image into a detailed coloring page. Use fine black outlines with intricate detail. Include realistic features and textures. Remove all color and shading. White background, black line art only, high-contrast outlines, no gray areas.",
  };
  return prompts[style] ?? prompts.simple;
}

export async function generateColoringPage(
  originalObjectPath: string,
  style: string
): Promise<string> {
  const prompt = getStylePrompt(style);

  logger.info({ originalObjectPath, style }, "Starting coloring page generation");

  let imageSource: { url: string } | { base64: string; mediaType: string };

  if (originalObjectPath.startsWith("http")) {
    imageSource = { url: originalObjectPath };
  } else {
    const cleanPath = originalObjectPath.startsWith("/objects/")
      ? originalObjectPath
      : `/objects/${originalObjectPath}`;

    const file = await storage.getObjectEntityFile(cleanPath);
    const [fileContents] = await file.download();
    const base64 = fileContents.toString("base64");
    imageSource = { base64, mediaType: "image/jpeg" };
  }

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: `${prompt} The image to transform: a personal photo.`,
    size: "1024x1024",
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) {
    throw new Error("No image data returned from AI");
  }

  const imageBuffer = Buffer.from(imageData.b64_json, "base64");

  const uploadUrl = await storage.getObjectEntityUploadURL();

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: imageBuffer,
    headers: {
      "Content-Type": "image/png",
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload coloring page: ${uploadResponse.statusText}`);
  }

  const objectPath = storage.normalizeObjectEntityPath(uploadUrl);
  logger.info({ objectPath }, "Coloring page generated and stored");

  return objectPath;
}
