import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {
      habitId: id,
      userId: user.id,
    };

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }

    const logs = await db.habitLog.findMany({
      where: where as any,
      orderBy: { date: "desc" },
    });

    return Response.json(logs);
  } catch (error) {
    console.error("GET /api/habits/[id]/log error:", error);
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await request.json();
    const date = body.date || new Date().toISOString().split("T")[0];

    // Upsert — toggle logic
    const existing = await db.habitLog.findUnique({
      where: { habitId_date: { habitId: id, date } },
    });

    if (existing) {
      // If already logged, increment or delete
      if (body.remove) {
        await db.habitLog.delete({ where: { id: existing.id } });

        // Recalculate streak
        await recalculateStreak(id, date);

        return Response.json({ removed: true });
      } else {
        const updated = await db.habitLog.update({
          where: { id: existing.id },
          data: { count: existing.count + 1 },
        });
        return Response.json(updated);
      }
    }

    const log = await db.habitLog.create({
      data: {
        habitId: id,
        userId: user.id,
        date,
        count: body.count || 1,
      },
    });

    // Recalculate streak
    await recalculateStreak(id, date);

    return Response.json(log, { status: 201 });
  } catch (error) {
    console.error("POST /api/habits/[id]/log error:", error);
    return Response.json({ error: "Failed to log habit" }, { status: 500 });
  }
}

async function recalculateStreak(habitId: string, clientDateStr: string) {
  const logs = await db.habitLog.findMany({
    where: { habitId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (logs.length === 0) {
    await db.habit.update({
      where: { id: habitId },
      data: { streak: 0 },
    });
    return;
  }

  let streak = 0;
  const dates = new Set(logs.map((l) => l.date));

  let current = new Date(clientDateStr);
  // Check if client's today is logged, if not start from yesterday
  if (!dates.has(clientDateStr)) {
    current.setDate(current.getDate() - 1);
    if (!dates.has(current.toISOString().split("T")[0])) {
      await db.habit.update({ where: { id: habitId }, data: { streak: 0 } });
      return;
    }
  }

  while (dates.has(current.toISOString().split("T")[0])) {
    streak++;
    current.setDate(current.getDate() - 1);
  }

  const habit = await db.habit.findUnique({ where: { id: habitId }, select: { longestStreak: true } });
  const longestStreak = Math.max(streak, habit?.longestStreak || 0);

  await db.habit.update({
    where: { id: habitId },
    data: { streak, longestStreak },
  });
}
