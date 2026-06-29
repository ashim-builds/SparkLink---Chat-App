import mongoose, { Schema } from "mongoose";

export interface IConversation {
  participants: string[]; // Clerk User IDs
  lastMessage?: mongoose.Types.ObjectId | string;
  status: "pending" | "accepted" | "declined";
  requestSender?: string;
  theme: "default" | "love" | "friendly" | "fifa";
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: String, ref: "User", required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    requestSender: { type: String, ref: "User" },
    theme: { type: String, enum: ["default", "love", "friendly", "fifa"], default: "default" },
  },
  { timestamps: true },
);

// Ensure index for quick lookups on participant lists
ConversationSchema.index({ participants: 1 });

const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema);
export default Conversation;
