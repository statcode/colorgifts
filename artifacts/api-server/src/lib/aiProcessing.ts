import OpenAI, { toFile } from "openai";
import { ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
});

const storage = new ObjectStorageService();

function getStylePrompt(style: string): string {
  const prompts: Record<string, string> = {
    simple: "Transform this exact photo into a simple children's coloring book page. Preserve the specific subjects, people, animals, and scene from this photo. Use very thick bold black outlines only. Keep shapes large and simple. White background, pure black line art only, absolutely no gray shading, no color, no fill.",
    cartoon: "Transform this exact photo into a cartoon-style coloring book page. Preserve all specific subjects, faces, animals, and elements from this photo. Use bold black outlines with clean cartoon styling. White background, pure black line art only, no gray shading, no color, no fill.",
    detailed: "Transform this exact photo into a detailed coloring book page. Faithfully preserve every subject, person, animal, and element from this photo. Use fine black outlines with rich detail and texture. White background, pure black line art only, no gray shading, no color, no fill.",
  };
  return prompts[style] ?? prompts.simple;
}

export async function generateColoringPage(
  originalObjectPath: string,
  style: string
): Promise<string> {
  const prompt = getStylePrompt(style);

  logger.info({ originalObjectPath, style }, "Starting coloring page generation");

  let imageBuffer: Buffer;

  if (originalObjectPath.startsWith("http")) {
    const fetchResponse = await fetch(originalObjectPath);
    if (!fetchResponse.ok) throw new Error(`Failed to fetch image: ${fetchResponse.statusText}`);
    imageBuffer = Buffer.from(await fetchResponse.arrayBuffer());
  } else {
    const cleanPath = originalObjectPath.startsWith("/objects/")
      ? originalObjectPath
      : `/objects/${originalObjectPath}`;

    const file = await storage.getObjectEntityFile(cleanPath);
    const [fileContents] = await file.download();
    imageBuffer = fileContents;
  }

  const imageFile = await toFile(imageBuffer, "photo.png", { type: "image/png" });

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt,
    size: "1024x1024",
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) {
    throw new Error("No image data returned from AI");
  }

  const resultBuffer = Buffer.from(imageData.b64_json, "base64");

  const uploadUrl = await storage.getObjectEntityUploadURL();

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: resultBuffer,
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
