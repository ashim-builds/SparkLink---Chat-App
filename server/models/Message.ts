import mongoose, { Schema } from "mongoose";

export interface IMessage {
  conversationId: mongoose.Types.ObjectId | string;
  sender: string; // Clerk User ID
  receiver: string; // Clerk User ID
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: String, ref: "User", required: true },
    receiver: { type: String, ref: "User", required: true },
    text: { type: String },
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ["image", "video"] },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Index to quickly fetch messages for a specific conversation in chronological order
MessageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model<IMessage>("Message", MessageSchema);
export default Message;
