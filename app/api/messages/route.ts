import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Order from "@/models/Order";

export async function GET(req: Request) {
  try {
    // 1. Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get query parameters
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const gigId = searchParams.get("gigId");
    const otherUserId = searchParams.get("otherUserId");

    if (!orderId && (!gigId || !otherUserId)) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectDB();
    let query: any = {};

    // 3. Build the database query
    if (orderId) {
      // Logic for Order-based chat
      const order = await Order.findById(orderId);
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      
      const isBuyer = order.buyerId.toString() === session.user.id;
      const isSeller = order.sellerId.toString() === session.user.id;
      if (!isBuyer && !isSeller) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      
      query = { orderId };
    } else if (gigId && otherUserId) {
      // Logic for Pre-sale / Gig-based chat
      // ✅ THIS $or OPERATOR IS THE SECRET TO THE UNIFIED CHANNEL
      // It fetches messages where:
      // (I sent to them) OR (They sent to me) for this specific gig.
      query = {
        gigId,
        $or: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      };
    }

    // 4. Fetch messages, sorted oldest to newest (so they appear in order in the chat box)
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

    // Create the new message document
    const newMessage = await Message.create({
      orderId: orderId || undefined,
      gigId: gigId || undefined,
      senderId: session.user.id,
      receiverId,
      content,
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error("Send Message Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}