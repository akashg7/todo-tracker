import { db } from "./db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function getCurrentUser(allowRedirect: boolean = true) {
  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findFirst({
    where: {
      OR: [
        { id: userId },
        { clerkId: userId }
      ]
    },
  });

  if (!user) {
    const clerkUser = await currentUser();
    // Redirect to custom onboarding if not found in db and redirect is permitted
    if (clerkUser && allowRedirect) {
        redirect("/onboarding");
    }
    throw new Error("USER_NOT_ONBOARDED");
  }

  return user;
}
