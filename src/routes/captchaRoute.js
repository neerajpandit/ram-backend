import express from "express";
import rateLimit from "express-rate-limit";
import { createCaptcha } from "../controllers/captchaController.js";

const router = express.Router();

const captchaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1000,
  message: "Too many captcha requests. Try later.",
});

router.get("/generate", captchaLimiter, createCaptcha);

export default router;
