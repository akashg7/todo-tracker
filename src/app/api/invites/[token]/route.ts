import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
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
            name: true,
            photo: true,
            icon: true,
            color: true,
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

    return Response.json({
      workspace: invite.workspace,
      role: invite.role,
      isAlreadyMember,
    });
  } catch (error: any) {
    console.error("GET /api/invites/[token] error:", error);
    if (error.message === "USER_NOT_ONBOARDED") {
      return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    }
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Failed to fetch invite details" }, { status: 500 });
  }
}
