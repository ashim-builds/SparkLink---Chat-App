import { authMiddleware } from "./../middlewares/auth.js";
import { Router } from "express";
import {
  getProfile,
  getUsers,
  searchUsers,
  updateProfile,
} from "../controllers/userController.js";
import upload from "../middlewares/upload.js";

const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get("/", getUsers);
userRouter.get("/search", searchUsers);
userRouter.get("/profile", authMiddleware, getProfile);
userRouter.patch("/profile", upload.single("avatar"), authMiddleware, updateProfile);

export default userRouter;
