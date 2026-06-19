import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pusher } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(false);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const projectId = searchParams.get("projectId");
    const parentId = searchParams.get("parentId");
    const dueBefore = searchParams.get("dueBefore");
    const dueAfter = searchParams.get("dueAfter");
    const search = searchParams.get("search");
    const workspaceId = searchParams.get("workspaceId");

    const where: any = {
      deletedAt: null,
      parentId: parentId || null,
    };

    if (workspaceId) {
      // 1. Verify user is a member of this workspace
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } }
      });
      if (!membership) {
        return Response.json({ error: "Unauthorized access to workspace" }, { status: 403 });
      }
      // 2. Fetch all tasks in this workspace (collaboration)
      where.workspaceId = workspaceId;
    } else {
      // Fallback: only personal tasks not attached to any workspace
      where.userId = user.id;
      where.workspaceId = null;
    }

    if (status) {
      if (status === "active") where.status = { in: ["todo", "in_progress"] };
      else where.status = { in: status.split(",") };
    }
    if (priority) where.priority = { in: priority.split(",").map(Number) };
    if (projectId) where.projectId = projectId;
    if (search) where.title = { contains: search };

    if (dueBefore || dueAfter) {
      where.dueDate = {};
      if (dueBefore) (where.dueDate as Record<string, unknown>).lte = new Date(dueBefore);
      if (dueAfter) (where.dueDate as Record<string, unknown>).gte = new Date(dueAfter);
    }

    const tasks = await db.task.findMany({
      where: where as any,
      include: {
        project: { select: { id: true, name: true, color: true, icon: true } },
        labels: { include: { label: true } },
        _count: { select: { subtasks: true } },
        subtasks: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return Response.json(tasks);
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    if (error.message === "USER_NOT_ONBOARDED") return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    if (error.message === "Unauthorized") return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(false);
    const body = await request.json();

    if (body.workspaceId) {
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: body.workspaceId, userId: user.id } }
      });
      if (!membership) {
        return Response.json({ error: "Unauthorized access to workspace" }, { status: 403 });
      }
    }

    const task = await db.task.create({
      data: {
        title: body.title,
        description: body.description || null,
        status: body.status || "todo",
        priority: body.priority ?? 3,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        parentId: body.parentId || null,
        projectId: body.projectId || null,
        userId: user.id,
        workspaceId: body.workspaceId || null,
        order: body.order ?? 0,
        recurrence: body.recurrence || null,
        estimatedMins: body.estimatedMins || null,
      },
      include: {
        project: { select: { id: true, name: true, color: true, icon: true } },
        labels: { include: { label: true } },
        _count: { select: { subtasks: true } },
      },
    });

    if (task.workspaceId) {
      await db.activity.create({
        data: {
          workspaceId: task.workspaceId,
          actorId: user.id,
          type: "TASK_CREATED",
          entityId: task.id,
          entityType: "Task",
          payload: JSON.stringify({ title: task.title }),
        }
      });
      await pusher.trigger(`private-workspace-${task.workspaceId}`, "task:created", task);
    }

    return Response.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return Response.json({ error: "Failed to create task" }, { status: 500 });
  }
}
