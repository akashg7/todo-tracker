import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Auto sign-up or get user
    let user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: email.split("@")[0],
        },
      });

      // Default Workspaces for new user
      const personalWs = await db.workspace.create({
        data: { name: "Personal", icon: "home", color: "#8B5CF6", userId: user.id },
      });
      await db.workspace.create({
        data: { name: "Work", icon: "briefcase", color: "#3B82F6", userId: user.id },
      });
      await db.project.createMany({
        data: [
          { name: "Inbox", icon: "inbox", color: "#6B7280", workspaceId: personalWs.id, order: 0 },
        ],
      });
    }

    // Assign session cookie lasting 30 days
    const cookieStore = await cookies();
    cookieStore.set("lifeos_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Login Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
