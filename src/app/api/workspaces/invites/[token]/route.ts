import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const params = await context.params;
    const invite = await db.workspaceInvite.findUnique({
      where: { token: params.token },
      include: {
        workspace: true,
      }
    });

    if (!invite || invite.status !== "PENDING" || (invite.expiresAt && invite.expiresAt < new Date())) {
      return new NextResponse("Invalid or expired invite", { status: 400 });
    }
    
    // Manually fetch inviter details
    const inviter = await db.user.findUnique({
      where: { id: invite.invitedBy },
      select: { name: true, avatar: true }
    });

    return NextResponse.json({ ...invite, inviter });
  } catch (error) {
    console.error("[INVITE_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const params = await context.params;
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const invite = await db.workspaceInvite.findUnique({
      where: { token: params.token },
    });

    if (!invite || invite.status !== "PENDING" || (invite.expiresAt && invite.expiresAt < new Date())) {
      return new NextResponse("Invalid or expired invite", { status: 400 });
    }

    const existingMember = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } }
    });

    if (existingMember) {
      return new NextResponse("Already a member", { status: 400 });
    }

    const newUseCount = invite.useCount + 1;
    const newStatus = (invite.maxUses && newUseCount >= invite.maxUses) ? "ACCEPTED" : "PENDING";

    await db.$transaction([
      db.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.role,
        }
      }),
      db.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          useCount: newUseCount,
          status: newStatus,
          usedAt: new Date(),
          usedBy: user.id
        }
      })
    ]);

    return NextResponse.json({ success: true, workspaceId: invite.workspaceId });
  } catch (error) {
    console.error("[INVITE_ACCEPT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
