import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(false);
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");

    const where: any = {};
    
    if (workspaceId) {
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } }
      });
      if (!membership) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
      where.workspaceId = workspaceId;
    } else {
      // If no workspaceId is provided, maybe return all user's projects or just return empty
      return Response.json([]);
    }

    const projects = await db.project.findMany({
      where,
      orderBy: { order: "asc" },
    });

    return Response.json(projects);
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    if (error.message === "USER_NOT_ONBOARDED") return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    if (error.message === "Unauthorized") return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
