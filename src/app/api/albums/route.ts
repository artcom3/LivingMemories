import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/demo-user";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const albums = await prisma.album.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { assets: true },
        },
        assets: {
          take: 3,
          orderBy: { createdAt: "desc" },
          select: { id: true, fileUrl: true, mediaType: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ albums });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateDemoUser();
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Album name is required" }, { status: 400 });
    }

    const album = await prisma.album.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: user.id,
      },
    });

    return NextResponse.json({ album }, { status: 201 });
  } catch (error) {
    console.error("Error creating album:", error);
    return NextResponse.json({ error: "Failed to create album" }, { status: 500 });
  }
}
