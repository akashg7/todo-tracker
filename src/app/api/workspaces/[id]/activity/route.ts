import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const params = await context.params;
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: params.id, userId: user.id } }
    });

    if (!member) return new NextResponse("Forbidden", { status: 403 });

    const activities = await db.activity.findMany({
      where: { workspaceId: params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("[ACTIVITY_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
