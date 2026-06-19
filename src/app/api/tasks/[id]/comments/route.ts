import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pusher } from "@/lib/pusher";

// GET /api/tasks/[id]/comments
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id: taskId } = params;

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (task.userId !== user.id) {
      if (!task.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: user.id } }
      });
      if (!membership) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const comments = await db.taskComment.findMany({
      where: {
        taskId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // In a real app we'd fetch author details (like name/avatar) here.
    // Assuming we have the user info or can populate frontend side.
    // Actually we can do an `in` query to get user details for authors.
    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const authors = await db.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true, avatar: true },
    });

    const authorMap = authors.reduce((acc, author) => {
      acc[author.id] = author;
      return acc;
    }, {} as Record<string, any>);

    const enrichedComments = comments.map((comment) => ({
      ...comment,
      author: authorMap[comment.authorId] || null,
    }));

    return NextResponse.json(enrichedComments);
  } catch (error) {
    console.error("GET /api/tasks/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/tasks/[id]/comments
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id: taskId } = params;
    
    // Parse body correctly instead of using nextUrl.searchParams for POST
    const body = await request.json();
    const { content, mentions = "[]", workspaceId } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.userId !== user.id) {
      if (!task.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: user.id } }
      });
      if (!membership) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const comment = await db.taskComment.create({
      data: {
        taskId,
        authorId: user.id,
        content,
        mentions: JSON.stringify(mentions),
      },
    });
    
    // Get full author info to broadcast
    const enrichedComment = {
      ...comment,
      author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
      },
    };

    // Trigger Pusher if workspaceId is provided
    if (workspaceId || task.workspaceId) {
      const channelWorkspaceId = workspaceId || task.workspaceId;
      await pusher.trigger(
        `private-workspace-${channelWorkspaceId}`,
        "task:commented",
        enrichedComment
      );
      
      // Also write an Activity log
      await db.activity.create({
        data: {
          workspaceId: channelWorkspaceId!,
          actorId: user.id,
          type: "TASK_COMMENTED",
          entityId: taskId,
          entityType: "Task",
          payload: JSON.stringify({ commentId: comment.id, content: content.substring(0, 50) }),
        }
      });
      
      // If task belongs to someone else or has assignees, notify them. We can notify task owner for a simple demo
      if (task.userId !== user.id) {
        await db.notification.create({
          data: {
            userId: task.userId,
            workspaceId: channelWorkspaceId,
            type: "TASK_COMMENT",
            title: "New Comment",
            body: `${user.name} commented on task "${task.title}"`,
            entityId: taskId,
            entityType: "Task",
            actionUrl: `/tasks/${taskId}`
          }
        });
        
        // Notify the user over pusher (assuming a user specific channel exists, e.g. private-user-${userId})
        await pusher.trigger(
          `private-user-${task.userId}`,
          "notification:new",
          { message: "New comment on your task" }
        );
      }
    }

    return NextResponse.json(enrichedComment);
  } catch (error) {
    console.error("POST /api/tasks/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
