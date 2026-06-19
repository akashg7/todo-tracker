import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pusher } from "@/lib/pusher";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const members = await db.workspaceMember.findMany({
      where: { workspaceId: (await context.params).id },
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } }
      }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("[MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
