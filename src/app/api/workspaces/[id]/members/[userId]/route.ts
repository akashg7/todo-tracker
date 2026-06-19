import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    const user = await getCurrentUser(false);
    const body = await request.json();
    const { role } = body;

    if (!role || !["OWNER", "ADMIN", "MEMBER", "VIEWER"].includes(role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if the current user is an OWNER of the workspace
    const currentUserMembership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId: user.id,
        },
      },
    });

    if (!currentUserMembership || currentUserMembership.role !== "OWNER") {
      return Response.json(
        { error: "Only workspace owners can change roles" },
        { status: 403 }
      );
    }

    // Ensure they aren't trying to change their own role or remove the last owner
    if (userId === user.id) {
      return Response.json(
        { error: "Cannot change your own role. Transfer ownership first." },
        { status: 400 }
      );
    }

    // Update the target member's role
    const updatedMember = await db.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId: userId,
        },
      },
      data: {
        role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    return Response.json(updatedMember);
  } catch (error: any) {
    console.error("PATCH /api/workspaces/[id]/members/[userId] error:", error);
    if (error.message === "USER_NOT_ONBOARDED") {
      return Response.json({ error: "USER_NOT_ONBOARDED" }, { status: 403 });
    }
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}
