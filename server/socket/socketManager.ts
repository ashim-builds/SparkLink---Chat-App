import { Server, Socket } from "socket.io";
import User from "../models/User.js";

let ioInstance: Server | null = null;
const userSocketMap = new Map<string, string>(); // userId -> socketId
const socketUserMap = new Map<string, string>(); // socketId -> userId

export function initSocket(server: any) {
  ioInstance = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    },
  });

  ioInstance.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register User ID with Socket ID
    socket.on("register_user", async (userId: string) => {
      if (!userId) return;
      userSocketMap.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);
      console.log(`User ${userId} registered to socket ${socket.id}`);

      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });
        ioInstance?.emit("user_status_changed", {
          userId,
          isOnline: true,
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error("Error setting user online status:", err);
      }
    });

    // Listen for privacy toggles on online status visibility
    socket.on("online_preference_changed", async (data: { userId: string; showOnline: boolean }) => {
      if (!data.userId) return;
      try {
        await User.findByIdAndUpdate(data.userId, {
          isOnline: data.showOnline,
          lastSeen: new Date(),
        });
        ioInstance?.emit("user_status_changed", {
          userId: data.userId,
          isOnline: data.showOnline,
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error("Error updating online status preference:", err);
      }
    });

    // Relay typing status to recipient
    socket.on("typing", (data: { conversationId: string; receiverId: string; isTyping: boolean }) => {
      const senderId = socketUserMap.get(socket.id);
      if (!senderId) return;

      const receiverSocketId = userSocketMap.get(data.receiverId);
      if (receiverSocketId) {
        ioInstance?.to(receiverSocketId).emit("typing", {
          conversationId: data.conversationId,
          senderId,
          isTyping: data.isTyping,
        });
      }
    });

    // Call signaling
    socket.on("call_initiate", (data: { to: string; from: string; fromName: string; callType: string; conversationId: string }) => {
      const receiverSocketId = userSocketMap.get(data.to);
      if (receiverSocketId) {
        ioInstance?.to(receiverSocketId).emit("incoming_call", data);
      }
    });

    socket.on("call_accept", (data: { to: string }) => {
      const receiverSocketId = userSocketMap.get(data.to);
      if (receiverSocketId) {
        ioInstance?.to(receiverSocketId).emit("call_accepted");
      }
    });

    socket.on("call_end", (data: { to: string; from: string }) => {
      const receiverSocketId = userSocketMap.get(data.to);
      if (receiverSocketId) {
        ioInstance?.to(receiverSocketId).emit("call_ended");
      }
    });

    // Disconnect event
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const userId = socketUserMap.get(socket.id);
      
      if (userId) {
        userSocketMap.delete(userId);
        socketUserMap.delete(socket.id);

        try {
          const lastSeen = new Date();
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen,
          });
          ioInstance?.emit("user_status_changed", {
            userId,
            isOnline: false,
            lastSeen,
          });
        } catch (err) {
          console.error("Error setting user offline status:", err);
        }
      }
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function getSocketIdByUserId(userId: string) {
  return userSocketMap.get(userId);
}
