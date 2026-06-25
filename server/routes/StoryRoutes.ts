import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { createStory, getStories } from "../controllers/storyController.js";
import upload from "../middlewares/upload.js";

const storyRouter = Router();

storyRouter.use(authMiddleware);

storyRouter.get("/", getStories);
storyRouter.post("/", upload.single("media"), createStory);

export default storyRouter;
