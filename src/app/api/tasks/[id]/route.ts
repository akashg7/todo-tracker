import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pusher } from "@/lib/pusher";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const task = await db.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignments: true,
        project: { select: { id: true, name: true, color: true, icon: true } },
        labels: { include: { label: true } },
        subtasks: {
          where: { deletedAt: null },
          include: {
            _count: { select: { subtasks: true } },
          },
          orderBy: { order: "asc" },
        },
        _count: { select: { subtasks: true } },
      },
    });

    if (!task) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.userId !== user.id) {
      if (!task.workspaceId) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: user.id } }
      });
      if (!membership) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    let enrichedAssignments: any[] = [];
    if (task.assignments && task.assignments.length > 0) {
      const userIds = task.assignments.map(a => a.assigneeId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatar: true }
      });
      const userMap: Record<string, any> = {};
      for (const u of users) userMap[u.id] = u;
      
      enrichedAssignments = task.assignments.map(a => ({
        ...a,
        assignee: userMap[a.assigneeId] || null
      }));
    }

    const result = {
      ...task,
      assignments: enrichedAssignments
    };

    return Response.json(result);
  } catch (error) {
    console.error("GET /api/tasks/[id] error:", error);
    return Response.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "done") data.completedAt = new Date();
      else data.completedAt = null;
    }
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.parentId !== undefined) data.parentId = body.parentId;
    if (body.projectId !== undefined) data.projectId = body.projectId;
    if (body.order !== undefined) data.order = body.order;
    if (body.estimatedMins !== undefined) data.estimatedMins = body.estimatedMins;

    const existingTask = await db.task.findUnique({ where: { id } });
    if (!existingTask) return Response.json({ error: "Task not found" }, { status: 404 });

    if (existingTask.userId !== user.id) {
      if (!existingTask.workspaceId) return Response.json({ error: "Unauthorized" }, { status: 403 });
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: existingTask.workspaceId, userId: user.id } }
      });
      if (!membership) return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const task = await db.task.update({
      where: { id },
      data: data as any,
      include: {
        assignments: true,
        project: { select: { id: true, name: true, color: true, icon: true } },
        labels: { include: { label: true } },
        _count: { select: { subtasks: true } },
      },
    });

    if (task.workspaceId) {
      await pusher.trigger(`private-workspace-${task.workspaceId}`, "task:updated", task);
    }

    return Response.json(task);
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return Response.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const existingTask = await db.task.findUnique({ where: { id } });
    if (!existingTask) return Response.json({ error: "Task not found" }, { status: 404 });

    if (existingTask.userId !== user.id) {
      if (!existingTask.workspaceId) return Response.json({ error: "Unauthorized" }, { status: 403 });
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: existingTask.workspaceId, userId: user.id } }
      });
      if (!membership) return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const task = await db.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (task.workspaceId) {
      await pusher.trigger(`private-workspace-${task.workspaceId}`, "task:deleted", id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return Response.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
