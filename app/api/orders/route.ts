import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Gig from "@/models/Gig";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gigId, amount, escrowTxHash, contractOrderId } = await req.json();
    
    if (!gigId || !amount || !escrowTxHash || !contractOrderId) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Ensure all numbers are actual Numbers (not strings)
    const numericAmount = Number(amount);
    const numericCommission = numericAmount * 0.05;
    const numericContractOrderId = Number(contractOrderId);

    const newOrder = await Order.create({
      gigId,
      buyerId: session.user.id,
      sellerId: gig.sellerId,
      amount: numericAmount,
      commission: numericCommission,
      status: "Funded",
      escrowTxHash,
      contractOrderId: numericContractOrderId, // ✅ Saved properly
    });

    return NextResponse.json({ message: "Order created successfully", order: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error("Order Creation Error:", error); // ✅ Will print to VS Code terminal if it fails
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // 'buyer' or 'seller'

    // If role is seller, get orders where I am the seller. Otherwise, get orders where I am the buyer.
    const query = role === "seller" ? { sellerId: session.user.id } : { buyerId: session.user.id };
    
    const orders = await Order.find(query)
      .populate("gigId", "title imageUrl")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Orders Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}