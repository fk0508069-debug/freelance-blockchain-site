import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Notification from "@/models/Notification"; // ✅ Import

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await req.json();
    await connectDB();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isSeller = order.sellerId.toString() === session.user.id;
    const isBuyer = order.buyerId.toString() === session.user.id;

    if (!isSeller && !isBuyer) {
      return NextResponse.json({ error: "Unauthorized to modify this order" }, { status: 403 });
    }

    if (updates.status === "Submitted") {
      if (!isSeller) return NextResponse.json({ error: "Only the seller can submit work" }, { status: 403 });
      order.status = "Submitted";
      order.deliveryUrl = updates.deliveryUrl;

      // ✅ Notify Buyer
      await Notification.create({
        userId: order.buyerId,
        type: "order",
        title: "Work Delivered",
        message: `The seller has submitted work for your order. Please review it.`,
        link: `/dashboard/buyer`,
      });

    } 
    else if (updates.status === "Revision Requested") {
      if (!isBuyer) return NextResponse.json({ error: "Only the buyer can request a revision" }, { status: 403 });
      order.status = "Revision Requested";

      // ✅ Notify Seller
      await Notification.create({
        userId: order.sellerId,
        type: "order",
        title: "Revision Requested",
        message: `The buyer requested a revision for your delivery.`,
        link: `/dashboard/seller`,
      });

    } 
    else if (updates.status === "Completed") {
      if (!isBuyer) return NextResponse.json({ error: "Only the buyer can release funds" }, { status: 403 });
      order.status = "Completed";
      order.releaseTxHash = updates.releaseTxHash;

      // ✅ Notify Seller (Payment)
      await Notification.create({
        userId: order.sellerId,
        type: "payment",
        title: "Funds Released!",
        message: `The buyer approved your work. ${order.amount} USDT has been sent to your wallet.`,
        link: `/dashboard/seller`,
      });
    } 
    else {
      order.status = updates.status;
    }

    await order.save();
    return NextResponse.json({ message: "Order updated", order }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH Order Error:", error); 
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}