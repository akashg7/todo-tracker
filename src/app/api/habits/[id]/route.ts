import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.color !== undefined) data.color = body.color;
    if (body.frequency !== undefined) data.frequency = body.frequency;
    if (body.targetCount !== undefined) data.targetCount = body.targetCount;
    if (body.category !== undefined) data.category = body.category;

    const habit = await db.habit.update({
      where: { id, userId: user.id },
      data: data as any,
    });

    return Response.json(habit);
  } catch (error) {
    console.error("PUT /api/habits/[id] error:", error);
    return Response.json({ error: "Failed to update habit" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    await db.habit.update({
      where: { id, userId: user.id },
      data: { deletedAt: new Date() },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/habits/[id] error:", error);
    return Response.json({ error: "Failed to delete habit" }, { status: 500 });
  }
}
