import mongoose, { Schema, Document } from "mongoose";

export interface IGig extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  price: number; // Base price
  category: string;
  deliveryTime: number;
  imageUrl?: string;
  status: "active" | "paused" | "draft"; // <-- New
  views: number;                        // <-- New
  clicks: number;                       // <-- New
  createdAt: Date;
  updatedAt: Date;
}

const GigSchema: Schema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    deliveryTime: { type: Number, required: true },
    imageUrl: { type: String, required: false },
    status: { type: String, enum: ["active", "paused", "draft"], default: "active" },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Gig || mongoose.model<IGig>("Gig", GigSchema);