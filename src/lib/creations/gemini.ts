import "server-only";
import { required } from "../infrastructure/config";
import type { ImageInput } from "./providers";
export function geminiImage(image: ImageInput) {
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
      image.dataUrl,
    );
  if (!match) throw new Error("Unsupported Gemini image input");
  return { type: "image", mime_type: match[1], data: match[2] };
}
type Content = {
  type: string;
  text?: string;
  data?: string;
  mime_type?: string;
};
export async function geminiInteraction(
  body: Record<string, unknown>,
): Promise<Content[]> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": required("GEMINI_API_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, store: false }),
      signal: AbortSignal.timeout(240000),
    },
  );
  if (!response.ok)
    throw Object.assign(new Error("Gemini request failed"), {
      statusCode: response.status,
    });
  const result = await response.json();
  if (result.status !== "completed")
    throw new Error("Incomplete Gemini interaction");
  return (result.steps || [])
    .filter((step: { type: string }) => step.type === "model_output")
    .flatMap((step: { content?: Content[] }) => step.content || []);
}
