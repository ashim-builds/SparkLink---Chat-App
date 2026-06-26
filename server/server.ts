import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import http from "http";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import userRouter from "./routes/UserRoutes.js";
import messageRouter from "./routes/MessageRoutes.js";
import storyRouter from "./routes/StoryRoutes.js";
import { initSocket } from "./socket/socketManager.js";
import dns from "node:dns";

if (
  dns.getServers().includes("127.0.0.1") ||
  dns.getServers().includes("::1")
) {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

const port = process.env.PORT || 3000;

// Initialize Socket.io
initSocket(server);

app.get("/", (req: Request, res: Response) => {
  res.send("Server is Live!");
});
app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/stories", storyRouter);

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Connect to MongoDB after the HTTP server starts so a database/DNS issue does
// not prevent health checks or basic routes from coming online.
connectDB().catch((error) => {
  console.error("MongoDB connection failed:", error.message);
});
