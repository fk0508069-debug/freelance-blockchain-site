import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Order from "@/models/Order";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await req.json();
    await connectDB();

    // 1. Find the order
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Verify Authorization (Cast to String to prevent ObjectId mismatch errors)
    const isSeller = order.sellerId.toString() === session.user.id;
    const isBuyer = order.buyerId.toString() === session.user.id;

    if (!isSeller && !isBuyer) {
      return NextResponse.json({ error: "Unauthorized to modify this order" }, { status: 403 });
    }

    // 3. Apply updates
    if (updates.status === "Submitted") {
      if (!isSeller) return NextResponse.json({ error: "Only the seller can submit work" }, { status: 403 });
      order.status = "Submitted";
      order.deliveryUrl = updates.deliveryUrl;
    } 
    else if (updates.status === "Revision Requested") {
      if (!isBuyer) return NextResponse.json({ error: "Only the buyer can request a revision" }, { status: 403 });
      order.status = "Revision Requested";
    } 
    else if (updates.status === "Completed") {
      if (!isBuyer) return NextResponse.json({ error: "Only the buyer can release funds" }, { status: 403 });
      order.status = "Completed";
      order.releaseTxHash = updates.releaseTxHash;
    } 
    else {
      // For other generic updates (like "In Progress")
      order.status = updates.status;
    }

    await order.save();
    return NextResponse.json({ message: "Order updated", order }, { status: 200 });

  } catch (error: any) {
    // ✅ This will print the exact error in your VS Code terminal!
    console.error("PATCH Order Error:", error); 
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}