import "dotenv/config";
import mongoose from "mongoose";
import User from "./models/User.js";
import dns from "node:dns";

if (
  dns.getServers().includes("127.0.0.1") ||
  dns.getServers().includes("::1")
) {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

const MOCK_USERS = [
  {
    _id: "user_mock_1",
    name: "Aarav Sharma",
    handle: "aarav",
    email: "aarav@sparklink.com",
    bio: "Coffee lover and software engineer.",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
    isOnline: true,
    lastSeen: new Date(),
  },
  {
    _id: "user_mock_2",
    name: "Jane Smith",
    handle: "janesmith",
    email: "jane@sparklink.com",
    bio: "Design is intelligence made visible.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    isOnline: false,
    lastSeen: new Date(),
  },
  {
    _id: "user_mock_3",
    name: "Alex Rivera",
    handle: "alexr",
    email: "alex@sparklink.com",
    bio: "Always exploring new paths.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    isOnline: true,
    lastSeen: new Date(),
  },
  {
    _id: "user_mock_4",
    name: "Elena Rostova",
    handle: "elena",
    email: "elena@sparklink.com",
    bio: "Violinist & music enthusiast.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    isOnline: false,
    lastSeen: new Date(),
  },
  {
    _id: "user_mock_5",
    name: "Sam Wilson",
    handle: "samw",
    email: "sam@sparklink.com",
    bio: "Let's build something epic!",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    isOnline: true,
    lastSeen: new Date(),
  },
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Check count
    const existingCount = await User.countDocuments();
    console.log(`Current user count in DB: ${existingCount}`);

    console.log("Upserting mock users...");
    for (const u of MOCK_USERS) {
      await User.findByIdAndUpdate(u._id, u, { upsert: true, new: true });
    }
    
    console.log("Seeding complete successfully!");
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
