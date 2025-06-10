// routes/auth.js
import express from "express";
const router = express.Router();

import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  register,
  getProfile,
  updateProfile,
  login,
  sendOrResendOtp,
  forgotPassword,
  resetPassword,
  verifyOtp,
  setPin,
  receiveCrypto
} from "../controllers/authController.js";

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/send-otp", sendOrResendOtp);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.post("/auth/verify-otp", verifyOtp);
router.post("/auth/set-pin", authMiddleware, setPin);
router.get("/auth/profile", authMiddleware, getProfile);
router.put("/auth/update-profile", authMiddleware, updateProfile);
router.get("/auth/receive-crypto", authMiddleware, receiveCrypto);

export default router;
