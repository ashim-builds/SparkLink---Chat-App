import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
} from "../controllers/messageController.js";
import upload from "../middlewares/upload.js";

const messageRouter = Router();

messageRouter.use(authMiddleware);

messageRouter.get("/conversations", getConversations);
messageRouter.get("/:conversationId", getMessages);
messageRouter.post("/", upload.single("media"), sendMessage);
messageRouter.patch("/:conversationId/read", markAsRead);

export default messageRouter;
