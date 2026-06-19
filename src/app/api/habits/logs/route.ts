import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const logs = await db.habitLog.findMany({
      where: {
        userId: user.id,
        ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
      },
      orderBy: { date: "desc" },
    });

    return Response.json(logs);
  } catch (error: any) {
    console.error("GET /api/habits/logs error:", error);
    if (error.message === "USER_NOT_ONBOARDED") return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    if (error.message === "Unauthorized") return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
