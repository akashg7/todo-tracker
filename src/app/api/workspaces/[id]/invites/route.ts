import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const params = await context.params;
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { role = "MEMBER", email, maxUses = 1 } = body;

    // Verify user is owner/admin
    const membership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: params.id, userId: user.id } }
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invite = await db.workspaceInvite.create({
      data: {
        workspaceId: params.id,
        role,
        email: email || null,
        invitedBy: user.id,
        expiresAt,
        maxUses
      }
    });

    return NextResponse.json(invite);
  } catch (error) {
    console.error("[INVITE_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const params = await context.params;
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const invites = await db.workspaceInvite.findMany({
      where: { workspaceId: params.id, status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error("[INVITE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}