import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFromStorage } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        assets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    return NextResponse.json({ album });
  } catch (error) {
    console.error("Error fetching album:", error);
    return NextResponse.json({ error: "Failed to fetch album" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, description } = body;

    const album = await prisma.album.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
      },
    });

    return NextResponse.json({ album });
  } catch (error) {
    console.error("Error updating album:", error);
    return NextResponse.json({ error: "Failed to update album" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch assets to clean up storage
    const assets = await prisma.mediaAsset.findMany({
      where: { albumId: id },
      select: { fileKey: true },
    });

    for (const asset of assets) {
      try {
        await deleteFromStorage(asset.fileKey);
      } catch (err) {
        console.warn(`Could not delete file ${asset.fileKey} from S3:`, err);
      }
    }

    await prisma.album.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting album:", error);
    return NextResponse.json({ error: "Failed to delete album" }, { status: 500 });
  }
}
