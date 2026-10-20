import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Message from "@/models/Message";

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    // ✅ Strict check to satisfy TypeScript
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // ✅ Extract userId to a string variable
    const userId = session.user.id;

    await connectDB();

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "name")
      .populate("receiverId", "name")
      .populate("gigId", "title imageUrl")
      .lean();

    const conversationsMap = new Map();

    messages.forEach((msg: any) => {
      // ✅ Use the userId variable here
      const isSender = msg.senderId._id.toString() === userId; 
      const otherUser = isSender ? msg.receiverId : msg.senderId;
      
      if (!otherUser) return;

      const otherUserId = otherUser._id.toString();
      const participants = [userId, otherUserId].sort(); // ✅ Use userId here
      const channelKey = participants.join("-");

      const contextId = msg.orderId ? msg.orderId.toString() : msg.gigId?._id?.toString();
      const uniqueKey = `${contextId}-${channelKey}`;

      if (!conversationsMap.has(uniqueKey)) {
        conversationsMap.set(uniqueKey, {
          _id: uniqueKey,
          orderId: msg.orderId || null,
          gigId: msg.gigId?._id || null,
          gigTitle: msg.gigId?.title || "Direct Message",
          gigImageUrl: msg.gigId?.imageUrl,
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