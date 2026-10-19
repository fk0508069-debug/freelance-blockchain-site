// app/api/messages/conversations/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Message from "@/models/Message";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const messages = await Message.find({
      $or: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "name")
      .populate("receiverId", "name")
      .populate("gigId", "title imageUrl") // ✅ Added imageUrl here
      .lean();

    const conversationsMap = new Map();

    messages.forEach((msg: any) => {
      const isSender = msg.senderId._id.toString() === session.user.id;
      const otherUser = isSender ? msg.receiverId : msg.senderId;
      
      if (!otherUser) return;

      const otherUserId = otherUser._id.toString();
      const currentUserId = session.user.id;
      const participants = [currentUserId, otherUserId].sort();
      const channelKey = participants.join("-");
      const contextId = msg.orderId ? msg.orderId.toString() : msg.gigId?._id?.toString();
      const uniqueKey = `${contextId}-${channelKey}`;

      if (!conversationsMap.has(uniqueKey)) {
        conversationsMap.set(uniqueKey, {
          _id: uniqueKey,
          orderId: msg.orderId || null,
          gigId: msg.gigId?._id || null,
          gigTitle: msg.gigId?.title || "Direct Message",
          gigImageUrl: msg.gigId?.imageUrl, // ✅ Added this
          otherUserId: otherUserId,
          otherUserName: otherUser.name || "Unknown User",
          lastMessage: msg.content,
          updatedAt: msg.createdAt,
        });
      }
    });

    const conversations = Array.from(conversationsMap.values());
    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}