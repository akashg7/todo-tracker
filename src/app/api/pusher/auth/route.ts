import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pusher } from "@/lib/pusher";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 403 });

    const contentType = req.headers.get("content-type") || "";
    let socketId = "";
    let channel = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      socketId = body.socket_id;
      channel = body.channel_name;
    } else {
      const body = await req.text();
      const params = new URLSearchParams(body);
      socketId = params.get("socket_id") || "";
      channel = params.get("channel_name") || "";
    }

    if (!socketId || !channel) {
      return new NextResponse("Socket ID and Channel required", { status: 400 });
    }

    const presenceData = {
      user_id: user.id,
      user_info: { name: user.name, avatar: user.avatar }
    };

    const authResponse = pusher.authorizeChannel(socketId, channel, presenceData);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("[PUSHER_AUTH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
