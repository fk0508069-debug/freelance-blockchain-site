import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  orderId?: mongoose.Types.ObjectId; // Now optional
  gigId?: mongoose.Types.ObjectId;   // New: for pre-sale inquiries
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: false },
    gigId: { type: Schema.Types.ObjectId, ref: "Gig", required: false },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);