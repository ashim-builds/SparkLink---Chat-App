import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import { getIO, getSocketIdByUserId } from "../socket/socketManager.js";

// Fetch all conversations for the logged in user
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    const populatedConvos = await Promise.all(
      conversations.map(async (convo) => {
        const partnerId = convo.participants.find((p) => p !== userId);
        if (!partnerId) return null;

        const partner = await User.findById(partnerId).select(
          "name email handle avatar bio isOnline lastSeen"
        );

        return {
          _id: convo._id,
          participant: partner || {
            _id: partnerId,
            name: "Deleted User",
            handle: "deleted",
            isOnline: false,
            lastSeen: new Date(),
          },
          lastMessage: convo.lastMessage,
          updatedAt: convo.updatedAt,
        };
      })
    );

    res.json({
      success: true,
      conversations: populatedConvos.filter(Boolean),
    });
  } catch (err) {
    console.error("GetConversations Error:", err);
    res.status(500).json({ success: false, message: "Error fetching conversations" });
  }
};

// Fetch messages for a specific conversation
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    if (!convo.participants.includes(userId)) {
      res.status(403).json({ success: false, message: "Unauthorized access to conversation" });
      return;
    }

    const messages = await Message.find({ conversationId }).sort({
      createdAt: 1,
    });

    res.json({ success: true, messages });
  } catch (err) {
    console.error("GetMessages Error:", err);
    res.status(500).json({ success: false, message: "Error fetching messages" });
  }
};

// Send message (text/media)
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { text, conversationId, receiverId } = req.body;
    const senderId = req.user!.id;
    let finalConvoId = conversationId;

    // Create conversation if starting a new chat
    if (!finalConvoId) {
      if (!receiverId) {
        res.status(400).json({ success: false, message: "Receiver ID or Conversation ID is required" });
        return;
      }

      // Check if a conversation already exists
      let convo = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
      });

      if (!convo) {
        convo = await Conversation.create({
          participants: [senderId, receiverId],
        });
      }
      finalConvoId = convo._id;
    }

    const convo = await Conversation.findById(finalConvoId);
    if (!convo) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    if (!convo.participants.includes(senderId)) {
      res.status(403).json({ success: false, message: "Unauthorized to send in this conversation" });
      return;
    }

    const actualReceiverId = convo.participants.find((p) => p !== senderId);
    if (!actualReceiverId) {
      res.status(400).json({ success: false, message: "Receiver not found in conversation" });
      return;
    }

    // Media upload to Cloudinary if media file is attached
    let mediaUrl = "";
    let mediaType: "image" | "video" | undefined = undefined;

    if (req.file) {
      try {
        const uploadPromise = new Promise<{ secure_url: string; resource_type: string }>(
          (resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "spark_link_media", resource_type: "auto" },
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
        console.error("Cloudinary upload failed:", uploadErr);
        res.status(500).json({ success: false, message: "Media upload failed" });
        return;
      }
    }

    const newMessage = await Message.create({
      conversationId: finalConvoId,
      sender: senderId,
      receiver: actualReceiverId,
      text: text || "",
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      read: false,
    });

    // Update conversation last message
    convo.lastMessage = newMessage._id as any;
    await convo.save();

    // Trigger WebSockets if recipient is online
    const io = getIO();
    const receiverSocketId = getSocketIdByUserId(actualReceiverId);
    const senderSocketId = getSocketIdByUserId(senderId);

    if (io) {
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("message", newMessage);
      }
      
      // Update conversations list for both clients
      const convoWithParticipantForSender = {
        _id: convo._id,
        participant: await User.findById(actualReceiverId).select("name email handle avatar bio isOnline lastSeen"),
        lastMessage: newMessage,
        updatedAt: convo.updatedAt,
      };

      const convoWithParticipantForReceiver = {
        _id: convo._id,
        participant: await User.findById(senderId).select("name email handle avatar bio isOnline lastSeen"),
        lastMessage: newMessage,
        updatedAt: convo.updatedAt,
      };

      if (senderSocketId) {
        io.to(senderSocketId).emit("conversation_updated", convoWithParticipantForSender);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("conversation_updated", convoWithParticipantForReceiver);
      }
    }

    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error("SendMessage Error:", err);
    res.status(500).json({ success: false, message: "Error sending message" });
  }
};

// Mark conversation messages as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    await Message.updateMany(
      { conversationId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    // Notify original sender via Sockets
    const convo = await Conversation.findById(conversationId);
    if (convo) {
      const partnerId = convo.participants.find((p) => p !== userId);
      if (partnerId) {
        const io = getIO();
        const partnerSocket = getSocketIdByUserId(partnerId);
        if (io && partnerSocket) {
          io.to(partnerSocket).emit("messages_read", { conversationId, readerId: userId });
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("MarkAsRead Error:", err);
    res.status(500).json({ success: false, message: "Error marking messages as read" });
  }
};
