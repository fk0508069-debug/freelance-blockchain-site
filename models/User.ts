import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "buyer" | "seller" | "admin";
  walletAddress?: string;
  // ✅ Added Profile Fields
  title?: string;
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    role: { type: String, enum: ["buyer", "seller", "admin"], default: "buyer" },
    walletAddress: { type: String, required: false },
    // ✅ Added Profile Fields
    title: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: [{ type: String }],
    hourlyRate: { type: Number, default: 0 },
    profilePicture: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);