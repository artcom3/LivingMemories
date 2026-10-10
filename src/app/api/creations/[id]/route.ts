import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const creation = await prisma.creation.findUnique({
      where: { id },
    });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found" }, { status: 404 });
    }

    return NextResponse.json({ creation });
  } catch (error) {
    console.error("Error fetching creation:", error);
    return NextResponse.json({ error: "Failed to fetch creation" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.creation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting creation:", error);
    return NextResponse.json({ error: "Failed to delete creation" }, { status: 500 });
  }
}
