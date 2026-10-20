import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Gig from "@/models/Gig";

// DELETE a gig
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; 
    
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const gig = await Gig.findOneAndDelete({ _id: id, sellerId: session.user.id });
    if (!gig) return NextResponse.json({ error: "Gig not found or unauthorized" }, { status: 404 });

    return NextResponse.json({ message: "Gig deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// UPDATE a gig
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; 
    
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const updates = await req.json();
    await connectDB();

    if (updates.price) updates.price = Number(updates.price);
    if (updates.deliveryTime) updates.deliveryTime = Number(updates.deliveryTime);

    const gig = await Gig.findOneAndUpdate(
      { _id: id, sellerId: session.user.id },
      updates,
      { returnDocument: 'after' } 
    );

    if (!gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    return NextResponse.json({ message: "Gig updated", gig }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET a single gig by ID
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    // ✅ FIX: Include walletAddress in the populated seller details
    const gig = await Gig.findById(id).populate("sellerId", "name email createdAt walletAddress").lean();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    return NextResponse.json({ gig }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Single Gig Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}