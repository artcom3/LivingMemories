import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFromStorage } from "@/lib/storage";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      contextDescription,
      peopleTags,
      locationTag,
      dateTag,
      emotionTag,
    } = body;

    const hasContext = Boolean(
      contextDescription?.trim() ||
      peopleTags?.trim() ||
      locationTag?.trim() ||
      dateTag?.trim() ||
      emotionTag?.trim()
    );

    const asset = await prisma.mediaAsset.update({
      where: { id },
      data: {
        contextDescription: contextDescription !== undefined ? contextDescription.trim() || null : undefined,
        peopleTags: peopleTags !== undefined ? peopleTags.trim() || null : undefined,
        locationTag: locationTag !== undefined ? locationTag.trim() || null : undefined,
        dateTag: dateTag !== undefined ? dateTag.trim() || null : undefined,
        emotionTag: emotionTag !== undefined ? emotionTag.trim() || null : undefined,
        contextStatus: hasContext ? "CONTEXT_ADDED" : "NO_CONTEXT",
      },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Error updating asset context:", error);
    return NextResponse.json({ error: "Failed to update asset context" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    try {
      await deleteFromStorage(asset.fileKey);
    } catch (err) {
      console.warn(`Failed to delete S3 file ${asset.fileKey}:`, err);
    }

    await prisma.mediaAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
