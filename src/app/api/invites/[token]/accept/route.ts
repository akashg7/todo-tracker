import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const user = await getCurrentUser(false);

    const invite = await db.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!invite) {
      return Response.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
      return Response.json({ error: "Invite has expired" }, { status: 400 });
    }

    if (invite.status === "REVOKED") {
      return Response.json({ error: "Invite has been revoked" }, { status: 400 });
    }

    if (invite.useCount >= invite.maxUses) {
      return Response.json({ error: "Invite limit reached" }, { status: 400 });
    }

    const isAlreadyMember = invite.workspace.members.length > 0;
    if (isAlreadyMember) {
      return Response.json({ error: "You are already a member of this workspace" }, { status: 400 });
    }

    // Run creation and updates in a transaction
    await db.$transaction(async (tx) => {
      // 1. Add user to workspace
      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.role,
        },
      });

      // 2. Increment invite use count
      const newUseCount = invite.useCount + 1;
      const newStatus = newUseCount >= invite.maxUses ? "USED" : invite.status;

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          useCount: newUseCount,
          status: newUseCount >= invite.maxUses ? "ACCEPTED" : "PENDING",
        },
      });

      // 3. Log activity
      await tx.activity.create({
        data: {
          workspaceId: invite.workspaceId,
          actorId: user.id,
          type: "MEMBER_JOINED",
          entityId: user.id,
          entityType: "User",
          payload: JSON.stringify({ role: invite.role }),
        },
      });
    });

    return Response.json({ success: true, workspaceId: invite.workspaceId });
  } catch (error: any) {
    console.error("POST /api/invites/[token]/accept error:", error);
    if (error.message === "USER_NOT_ONBOARDED") {
      return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    }
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
