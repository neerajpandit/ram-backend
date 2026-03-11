import express from "express";
import { sendSignupOtp,sendSigninOtp,verifySigninOtp,verifySignupOtp, registerUser, loginUser, logoutUser, changeCurrentPassword, forgotPassword, resetPassword, refreshAccessToken } from "../controllers/userAuthController.js";
import { superLogger } from "../utils/superLogger.js";
import {isAdmin, verifyJWT} from "../middlewares/authMiddleware.js"
import generateCaptcha from "../controllers/generateCaptcha.js";
import validateCaptchaMiddleware from "../utils/captcha.js";
import {sensitiveApiRateLimiter} from "../middlewares/limiter.js"

const router = express.Router();

router.use(superLogger);
router.post("/sendSignupOtp", sensitiveApiRateLimiter(), sendSignupOtp);
router.post("/verifySignupOtp", sensitiveApiRateLimiter(), verifySignupOtp);
router.post("/sendSigninOtp", sensitiveApiRateLimiter(), sendSigninOtp);
router.post("/verifySigninOtp",sensitiveApiRateLimiter(), verifySigninOtp);
router.post("/admin/signup", registerUser);
router.post(
  "/admin/signin",
  sensitiveApiRateLimiter(),
  validateCaptchaMiddleware,
  loginUser,
);
router.post("/logout",verifyJWT,logoutUser);
router.post("/generate-captcha", generateCaptcha);
router.put("/change-password", verifyJWT, changeCurrentPassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshAccessToken)

export default router;
