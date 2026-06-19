import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const workspaces = await db.workspace.findMany({
      where: {
        members: {
          some: { userId: user.id }
        },
        deletedAt: null
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, email: true } }
          }
        },
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("[WORKSPACES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { name, color, photo, description, isPersonal } = body;

    if (!name) return new NextResponse("Name is required", { status: 400 });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36).slice(-4);

    const workspace = await db.workspace.create({
      data: {
        name,
        color: color || "#7F77DD",
        photo,
        description,
        slug,
        isPersonal: isPersonal || false,
        userId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          }
        },
        activities: {
          create: {
            actorId: user.id,
            type: "MEMBER_JOINED",
            payload: JSON.stringify({ role: "OWNER" })
          }
        }
      },
      include: {
        members: true
      }
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("[WORKSPACES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
