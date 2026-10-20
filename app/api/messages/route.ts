import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Order from "@/models/Order";
import Notification from "@/models/Notification"; // ✅ Imported Notification

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const gigId = searchParams.get("gigId");
    const otherUserId = searchParams.get("otherUserId");

    if (!orderId && (!gigId || !otherUserId)) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectDB();
    let query: any = {};

    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      
      const isBuyer = order.buyerId.toString() === session.user.id;
      const isSeller = order.sellerId.toString() === session.user.id;
      if (!isBuyer && !isSeller) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      
      query = { orderId };
    } else if (gigId && otherUserId) {
      query = {
        gigId,
        $or: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      };
    }

    const messages = await Message.find(query).sort({ createdAt: 1 }).lean();
    
    return NextResponse.json({ messages }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Messages Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, gigId, receiverId, content } = await req.json();
    
    if (!content || !receiverId) {
      return NextResponse.json({ error: "Missing content or receiver" }, { status: 400 });
    }

    await connectDB();

    const newMessage = await Message.create({
      orderId: orderId || undefined,
      gigId: gigId || undefined,
      senderId: session.user.id,
      receiverId,
      content,
    });

    // ✅ TRIGGER NOTIFICATION FOR THE RECEIVER
    await Notification.create({
      userId: receiverId,
      type: "message",
      title: "New Message",
      message: `${session.user.name || "A user"} sent you a message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
      link: `/dashboard/seller`, // Takes them to their dashboard to check messages
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error("Send Message Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}