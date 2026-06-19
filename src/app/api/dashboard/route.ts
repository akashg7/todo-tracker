import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(false);
    const searchParams = new URL(req.url).searchParams;
    const workspaceId = searchParams.get("workspaceId");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    
    // Use raw UTC ISO date for string comparisons to sync with habit log creation
    const dateStr = new Date().toISOString().split("T")[0];

    const [
      tasksCompletedToday,
      totalTasks,
      todayTasks,
      upcomingTasks,
      habits,
      todayHabitLogs,
      recentTasks,
    ] = await Promise.all([
      // Tasks completed today
      db.task.count({
        where: {
          userId: user.id,
          status: "done",
          completedAt: { gte: today, lt: tomorrow },
          deletedAt: null,
          ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}),
        },
      }),
      // All active tasks
      db.task.count({
        where: { userId: user.id, status: { not: "done" }, deletedAt: null, ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}) },
      }),
      // Tasks due today
      db.task.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { in: ["todo", "in_progress"] },
          AND: [
            { ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}) },
            { OR: [
                { dueDate: { gte: today, lt: tomorrow } },
                { dueDate: { lt: today } } // overdue
              ]
            }
          ]
        },
        include: {
          project: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
        take: 10,
      }),
      // Upcoming tasks (next 3 days)
      db.task.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { in: ["todo", "in_progress"] },
          dueDate: { gte: tomorrow, lt: threeDaysLater },
          ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}),
        },
        include: {
          project: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
        take: 5,
      }),
      // Habits
      db.habit.findMany({
        where: { userId: user.id, deletedAt: null, archived: false },
        orderBy: { createdAt: "asc" },
      }),
      // Today's habit logs
      db.habitLog.findMany({
        where: {
          userId: user.id,
          date: dateStr,
        },
      }),
      // Recent completed tasks for activity feed
      db.task.findMany({
        where: {
          userId: user.id,
          status: "done",
          deletedAt: null,
          completedAt: { not: null },
          ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}),
        },
        orderBy: { completedAt: "desc" },
        take: 8,
        select: { id: true, title: true, completedAt: true, status: true },
      }),
    ]);

    // Calculate current streak from habits
    const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
    const habitsCompleted = todayHabitLogs.length;
    const habitsTotal = habits.length;

    // Calculate productivity score (simple heuristic)
    const habitCompletion = habitsTotal > 0 ? habitsCompleted / habitsTotal : 0;
    const productivityScore = Math.round(
      (tasksCompletedToday * 10 + habitCompletion * 50 + maxStreak * 2)
    );

    return Response.json({
      stats: {
        tasksCompletedToday,
        totalTasks,
        currentStreak: maxStreak,
        productivityScore: Math.min(productivityScore, 100),
        habitsCompleted,
        habitsTotal,
      },
      todayTasks,
      upcomingTasks,
      habits,
      todayHabitLogs,
      recentActivity: recentTasks,
    });
  } catch (error: any) {
    console.error("GET /api/dashboard error:", error);
    if (error.message === "USER_NOT_ONBOARDED") {
      return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    }
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
