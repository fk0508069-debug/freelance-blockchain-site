import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  _id: string;
  gigId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  amount: number;
  commission: number;
  status: "Awaiting Payment" | "Funded" | "In Progress" | "Submitted" | "Revision Requested" | "Completed" | "Refunded";
  escrowTxHash?: string;     
  releaseTxHash?: string;    
  contractOrderId: number;
  deliveryUrl?: string; // ✅ Must be here
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
    gigId: { type: Schema.Types.ObjectId, ref: "Gig", required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    commission: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ["Awaiting Payment", "Funded", "In Progress", "Submitted", "Revision Requested", "Completed", "Refunded"], 
      default: "Awaiting Payment" 
    },
    escrowTxHash: { type: String },
    releaseTxHash: { type: String },
    contractOrderId: { type: Number, required: true },
    deliveryUrl: { type: String }, // ✅ Must be here
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);