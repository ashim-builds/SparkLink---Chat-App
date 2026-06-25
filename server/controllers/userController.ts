import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

// Get all users
export const getUsers = async (req: AuthRequest, res: Response) => {
  const users = await User.find({ _id: { $ne: req.user!.id } }).select(
    "name email handle avatar bio isOnline lastSeen",
  );
  res.json({ success: true, users });
};

// Search users by name, email, or handle

export const searchUsers = async (req: AuthRequest, res: Response) => {
  const { query } = req.query;
  if (!query || typeof query !== "string") {
    res.json({ success: true, users: [] });
    return;
  }
  const regex = new RegExp(query, "i");
  const users = await User.find({
    _id: { $ne: req.user!.id },
    $or: [{ name: regex }, { email: regex }, { handle: regex }],
  })
    .select("name email handle avatar bio isOnline lastSeen")
    .limit(20);
  res.json({ success: true, users });
};

// Get current User's Profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  res.json({ success: true, user });
};

// Update Profile (name, bio, handle, avatar)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, bio } = req.body;
  const handle = req.body.handle?.toLowerCase().trim();
  const file = req.file;

  if (handle) {
    const handleExists = await User.findOne({
      handle,
      _id: { $ne: req.user!.id },
    });
    if (handleExists) {
      res
        .status(400)
        .json({ success: false, message: "Handle already in use" });
      return;
    }
  }

  let avatarUrl = "";
  if (file) {
    try {
      const uploadPromise = new Promise<{ secure_url: string }>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "spark_link_avatars" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as any);
            },
          );
          const readableStream = new Readable();
          readableStream.push(file.buffer);
          readableStream.push(null);
          readableStream.pipe(uploadStream);
        },
      );
      const result = await uploadPromise;
      avatarUrl = result.secure_url;
    } catch (err) {
      console.log("Avatar upload error", err);
      res.status(500).json({ success: false, message: "Avatar upload failed" });
      return;
    }
  }

  const updateData: any = {
    ...(name && { name: name.trim() }),
    ...(bio !== undefined && { bio }),
    ...(handle && { handle }),
    ...(avatarUrl && { avatar: avatarUrl }),
  };

  const updated = await User.findByIdAndUpdate(req.user!.id, updateData, {
    returnDocument: "after",
  });
  res.json({ success: true, user: updated });
};
