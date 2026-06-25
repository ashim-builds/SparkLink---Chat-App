import mongoose, { Schema } from "mongoose";

export interface IStory {
  user: string; // Clerk User ID
  mediaUrl: string;
  mediaType: "image" | "video";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    user: { type: String, ref: "User", required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index to automatically delete expired stories after 24 hours
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
StorySchema.index({ user: 1 });

const Story = mongoose.model<IStory>("Story", StorySchema);
export default Story;
