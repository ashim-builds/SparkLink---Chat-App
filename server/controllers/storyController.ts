import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import Story from "../models/Story.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import { getIO } from "../socket/socketManager.js";

// Create a new story (expires in 24 hours)
export const createStory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({ success: false, message: "Story media file is required" });
      return;
    }

    // Upload to Cloudinary
    let mediaUrl = "";
    let mediaType: "image" | "video" = "image";

    try {
      const uploadPromise = new Promise<{ secure_url: string; resource_type: string }>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "spark_link_stories", resource_type: "auto" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as any);
            }
          );
          const readableStream = new Readable();
          readableStream.push(req.file!.buffer);
          readableStream.push(null);
          readableStream.pipe(uploadStream);
        }
      );
      const result = await uploadPromise;
      mediaUrl = result.secure_url;
      mediaType = result.resource_type === "video" ? "video" : "image";
    } catch (uploadErr) {
      console.error("Story Cloudinary upload failed:", uploadErr);
      res.status(500).json({ success: false, message: "Story upload failed" });
      return;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL
    const newStory = await Story.create({
      user: userId,
      mediaUrl,
      mediaType,
      expiresAt,
    });

    const populatedStory = await newStory.populate(
      "user",
      "name email handle avatar bio isOnline lastSeen"
    );

    // Notify all sockets that stories changed
    const io = getIO();
    if (io) {
      io.emit("stories_updated");
    }

    res.json({ success: true, story: populatedStory });
  } catch (err) {
    console.error("CreateStory Error:", err);
    res.status(500).json({ success: false, message: "Error creating story" });
  }
};

// Fetch active stories grouped by user (compatible with the client UserStory format)
export const getStories = async (req: AuthRequest, res: Response) => {
  try {
    const activeStories = await Story.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "name email handle avatar bio isOnline lastSeen")
      .sort({ createdAt: 1 });

    const groupedStoriesMap = new Map<string, { user: any; stories: any[] }>();

    for (const story of activeStories) {
      if (!story.user) continue;
      const userObj = story.user as any;
      const userId = userObj._id.toString();

      if (!groupedStoriesMap.has(userId)) {
        groupedStoriesMap.set(userId, {
          user: userObj,
          stories: [],
        });
      }
      groupedStoriesMap.get(userId)!.stories.push({
        _id: story._id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        createdAt: story.createdAt.toISOString(),
      });
    }

    const groupedStories = Array.from(groupedStoriesMap.values());
    res.json({ success: true, stories: groupedStories });
  } catch (err) {
    console.error("GetStories Error:", err);
    res.status(500).json({ success: false, message: "Error fetching stories" });
  }
};
