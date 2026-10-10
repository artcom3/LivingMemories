import { NextRequest, NextResponse } from "next/server";
import { getFromStorage } from "@/lib/storage";
import { Readable } from "node:stream";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await context.params;
    const fullKey = key.join("/");

    const s3Response = await getFromStorage(fullKey);

    if (!s3Response.Body) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Convert AWS SDK stream to Web ReadableStream
    const nodeStream = s3Response.Body as Readable;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
    });

    const headers = new Headers();
    if (s3Response.ContentType) {
      headers.set("Content-Type", s3Response.ContentType);
    }
    if (s3Response.ContentLength) {
      headers.set("Content-Length", s3Response.ContentLength.toString());
    }
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error serving media:", error);
    return new NextResponse("Not Found", { status: 404 });
  }
}
