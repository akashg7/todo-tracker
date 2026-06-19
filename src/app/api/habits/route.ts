import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const habits = await db.habit.findMany({
      where: { userId: user.id, deletedAt: null, archived: false },
      orderBy: { createdAt: "asc" },
    });

    return Response.json(habits);
  } catch (error: any) {
    console.error("GET /api/habits error:", error);
    if (error.message === "USER_NOT_ONBOARDED") return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    if (error.message === "Unauthorized") return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Failed to fetch habits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    const habit = await db.habit.create({
      data: {
        name: body.name,
        icon: body.icon || "✅",
        color: body.color || "#8B5CF6",
        frequency: body.frequency || "daily",
        frequencyDays: body.frequencyDays || "[]",
        targetCount: body.targetCount || 1,
        category: body.category || "general",
        userId: user.id,
        reminderTimes: body.reminderTimes || "[]",
      },
    });

    return Response.json(habit, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/habits error:", error);
    if (error.message === "USER_NOT_ONBOARDED") return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    if (error.message === "Unauthorized") return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Failed to create habit" }, { status: 500 });
  }
}
