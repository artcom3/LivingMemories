import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToStorage } from "@/lib/storage";

function resolveMediaType(mimeType: string) {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: albumId } = await context.params;

    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const createdAssets = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `albums/${albumId}/${Date.now()}_${safeName}`;
      const mimeType = file.type || "application/octet-stream";

      const fileUrl = await uploadToStorage(key, buffer, mimeType);
      const mediaType = resolveMediaType(mimeType);

      const asset = await prisma.mediaAsset.create({
        data: {
          albumId,
          fileKey: key,
          fileUrl,
          originalName: file.name,
          mimeType,
          mediaType,
          size: file.size,
          contextStatus: "NO_CONTEXT",
        },
      });

      createdAssets.push(asset);
    }

    return NextResponse.json({ assets: createdAssets }, { status: 201 });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}
