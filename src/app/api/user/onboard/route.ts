import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session.userId;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

    const { timezone } = await req.json();

    const userEmail = user.emailAddresses[0]?.emailAddress || "";

    // Find if user already exists in DB by Clerk ID or Email
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { clerkId: userId },
          { email: userEmail }
        ]
      }
    });

    const userData = {
      clerkId: userId,
      email: userEmail,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User",
      avatar: user.imageUrl,
      timezone: timezone || "UTC",
      wakeUpTime: "07:00",
      preferences: JSON.stringify({
        productivityGoals: "",
        theme: "dark",
        accentColor: "purple",
        density: "comfortable",
      })
    };

    if (existingUser) {
      await db.user.update({
        where: { id: existingUser.id },
        data: userData
      });
    } else {
      await db.user.create({
        data: {
          id: userId,
          ...userData
        }
      });
    }

    // Create default DB elements for the new users
    // If we reconciled an existing user, they might already have workspaces
    const existingWs = await db.workspace.findFirst({ 
      where: { 
        OR: [
          { userId },
          { user: { email: userEmail } }
        ]
      } 
    });

    if (!existingWs) {
        const targetUserId = existingUser ? existingUser.id : userId;
        const personalWs = await db.workspace.create({
            data: {
              name: "Personal",
              icon: "home",
              color: "#8B5CF6",
              isPersonal: true,
              userId: targetUserId,
              members: {
                create: {
                  userId: targetUserId,
                  role: "OWNER",
                },
              },
            },
        });
        await db.workspace.create({
            data: {
              name: "Work",
              icon: "briefcase",
              color: "#3B82F6",
              userId: targetUserId,
              members: {
                create: {
                  userId: targetUserId,
                  role: "OWNER",
                },
              },
            },
        });
        await db.project.create({
            data: { name: "Inbox", icon: "inbox", color: "#6B7280", workspaceId: personalWs.id, order: 0 },
        });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Onboarding Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
