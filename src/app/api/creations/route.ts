import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/demo-user";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const creations = await prisma.creation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ creations });
  } catch (error) {
    console.error("Error fetching creations:", error);
    return NextResponse.json({ error: "Failed to fetch creations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateDemoUser();
    const body = await request.json();
    const {
      type,
      title,
      prompt,
      genreOrStyle,
      resultUrl,
      coverUrl,
      waveformJson,
      pagesJson,
      sourceAssetIds,
      metadataJson,
    } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "Type and title are required" }, { status: 400 });
    }

    const creation = await prisma.creation.create({
      data: {
        userId: user.id,
        type,
        title: title.trim(),
        status: "COMPLETED",
        prompt: prompt || null,
        genreOrStyle: genreOrStyle || null,
        resultUrl: resultUrl || null,
        coverUrl: coverUrl || null,
        waveformJson: waveformJson || null,
        pagesJson: pagesJson || null,
        sourceAssetIds: sourceAssetIds ? JSON.stringify(sourceAssetIds) : null,
        metadataJson: metadataJson ? JSON.stringify(metadataJson) : null,
      },
    });

    return NextResponse.json({ creation }, { status: 201 });
  } catch (error) {
    console.error("Error creating creation:", error);
    return NextResponse.json({ error: "Failed to create creation" }, { status: 500 });
  }
}
