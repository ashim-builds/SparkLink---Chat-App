import mongoose, { Schema } from "mongoose";

export interface IConversation {
  participants: string[]; // Clerk User IDs
  lastMessage?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: String, ref: "User", required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true },
);

// Ensure index for quick lookups on participant lists
ConversationSchema.index({ participants: 1 });

const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema);
export default Conversation;
