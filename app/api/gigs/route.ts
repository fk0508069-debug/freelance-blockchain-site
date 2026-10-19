import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Gig from "@/models/Gig";

// POST: Create a new gig
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { title, description, price, category, deliveryTime, imageUrl } = await req.json();

    if (!title || !description || !price || !category || !deliveryTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    
    const newGig = await Gig.create({
      sellerId: session.user.id,
      title,
      description,
      price: Number(price),
      category,
      deliveryTime: Number(deliveryTime),
      imageUrl,
    });

    return NextResponse.json({ message: "Gig created successfully", gig: newGig }, { status: 201 });

  } catch (error: any) {
    console.error("Gig Creation Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// GET: Fetch gigs (Handles both public search and seller-only fetching)
export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Extract query parameters from the URL
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const sellerOnly = searchParams.get("sellerOnly");

    let query: any = {};

    // 1. Logic for Seller Dashboard (fetch only my gigs)
    if (sellerOnly === "true") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      query = { sellerId: session.user.id };
    } 
    // 2. Logic for Public Marketplace (search and category filter)
    else {
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (category && category !== "All") {
        query.category = category;
      }
    }

    // Fetch gigs from MongoDB, sorted by newest first
    const gigs = await Gig.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ gigs }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Gigs Error:", error);
    return NextResponse.json({ error: "Failed to fetch gigs" }, { status: 500 });
  }
}