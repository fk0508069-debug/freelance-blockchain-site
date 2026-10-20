import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

// GET: Fetch the logged-in user's profile
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    // Find the user by ID
    const user = await User.findById(session.user.id).select("-password"); // Exclude password

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: user }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update the user's profile
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, bio, skills, hourlyRate, profilePicture } = await req.json();
    await connectDB();

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { 
        title, 
        bio, 
        // Parse skills from comma-separated string to array
        skills: Array.isArray(skills) ? skills : skills.split(",").map((s: string) => s.trim()).filter(Boolean), 
        hourlyRate: Number(hourlyRate),
        profilePicture 
      },
      { new: true, returnDocument: 'after' }
    ).select("-password"); // Exclude password from response

    return NextResponse.json({ message: "Profile updated", profile: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Reset the profile data
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    await User.findByIdAndUpdate(
      session.user.id,
      { title: "", bio: "", skills: [], hourlyRate: 0, profilePicture: "" }
    );

    return NextResponse.json({ message: "Profile reset successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}