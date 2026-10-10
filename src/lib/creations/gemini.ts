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
  mode: "interactions" | "generate_content" = "interactions",
): Promise<Content[]> {
  if (mode === "generate_content") {
    const input = body.input as Content[];
    const format = body.response_format as {
      type: string;
      mime_type?: string;
      schema?: unknown;
      aspect_ratio?: string;
      image_size?: string;
    };
    const request = {
      contents: [
        {
          role: "user",
          parts: input.map((part) =>
            part.type === "text"
              ? { text: part.text }
              : { inlineData: { mimeType: part.mime_type, data: part.data } },
          ),
        },
      ],
      ...(body.system_instruction
        ? { systemInstruction: { parts: [{ text: body.system_instruction }] } }
        : {}),
      generationConfig: {
        maxOutputTokens:
          (body.generation_config as { max_output_tokens?: number } | undefined)
            ?.max_output_tokens || 10000,
        ...(format.type === "text"
          ? {
              responseMimeType: format.mime_type,
              responseJsonSchema: format.schema,
            }
          : {
              responseModalities: ["IMAGE"],
              imageConfig: {
                aspectRatio: format.aspect_ratio,
                imageSize: format.image_size,
              },
            }),
      },
    };
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(String(body.model)) +
        ":generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": required("GEMINI_API_KEY"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(240000),
      },
    );
    if (!response.ok)
      throw Object.assign(new Error("Gemini request failed"), {
        statusCode: response.status,
      });
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (!candidate || candidate.finishReason !== "STOP")
      throw new Error("Incomplete Gemini content");
    return (candidate.content?.parts || [])
      .filter((part: { thought?: boolean }) => !part.thought)
      .map(
        (part: {
          text?: string;
          inlineData?: { mimeType: string; data: string };
        }) =>
          part.inlineData
            ? {
                type: "image",
                mime_type: part.inlineData.mimeType,
                data: part.inlineData.data,
              }
            : { type: "text", text: part.text },
      );
  }
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
