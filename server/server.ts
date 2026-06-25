import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import userRouter from "./routes/UserRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Server is Live!");
});
app.use("/api/users", userRouter);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Connect to MongoDB after the HTTP server starts so a database/DNS issue does
// not prevent health checks or basic routes from coming online.
connectDB().catch((error) => {
  console.error("MongoDB connection failed:", error.message);
});
