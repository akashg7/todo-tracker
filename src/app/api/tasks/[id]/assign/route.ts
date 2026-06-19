import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pusher } from "@/lib/pusher";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const params = await context.params;
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { assigneeId } = body;

    if (!assigneeId) return new NextResponse("Assignee required", { status: 400 });

    const task = await db.task.findUnique({
      where: { id: params.id },
      include: { workspace: true }
    });

    if (!task) return new NextResponse("Task not found", { status: 404 });

    if (task.userId !== user.id) {
      if (!task.workspaceId) return new NextResponse("Unauthorized", { status: 403 });
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: user.id } }
      });
      if (!membership) return new NextResponse("Unauthorized", { status: 403 });
    }

    const assignment = await db.taskAssignment.create({
      data: {
        taskId: params.id,
        assigneeId,
        assignedBy: user.id,
      },
      include: {
        task: true
      }
    });

    if (assigneeId !== user.id) {
      await db.notification.create({
        data: {
          userId: assigneeId,
          workspaceId: task.workspaceId,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          body: `${user.name || "Someone"} assigned you to task "${task.title}"`,
          entityId: params.id,
          entityType: "Task",
          actionUrl: `/today?taskId=${params.id}`
        }
      });
    }

    if (task.workspaceId) {
      await db.activity.create({
        data: {
          workspaceId: task.workspaceId,
          actorId: user.id,
          type: "TASK_ASSIGNED",
          entityId: params.id,
          entityType: "Task",
          payload: JSON.stringify({ assigneeId }),
        }
      });
      await pusher.trigger(`private-workspace-${task.workspaceId}`, "task:assigned", assignment);
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("[TASK_ASSIGN_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const params = await context.params;
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const assigneeId = searchParams.get("assigneeId");

    if (!assigneeId) return new NextResponse("Assignee required", { status: 400 });

    const task = await db.task.findUnique({
      where: { id: params.id },
    });

    if (!task) return new NextResponse("Task not found", { status: 404 });

    if (task.userId !== user.id) {
      if (!task.workspaceId) return new NextResponse("Unauthorized", { status: 403 });
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: user.id } }
      });
      if (!membership) return new NextResponse("Unauthorized", { status: 403 });
    }

    await db.taskAssignment.delete({
      where: {
        taskId_assigneeId: {
          taskId: params.id,
          assigneeId,
        }
      }
    });

    if (task.workspaceId) {
      await db.activity.create({
        data: {
          workspaceId: task.workspaceId,
          actorId: user.id,
          type: "TASK_UNASSIGNED",
          entityId: params.id,
          entityType: "Task",
          payload: JSON.stringify({ assigneeId }),
        }
      });
      await pusher.trigger(`private-workspace-${task.workspaceId}`, "task:unassigned", { taskId: params.id, assigneeId });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TASK_ASSIGN_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
