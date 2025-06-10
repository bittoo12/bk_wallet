import Joi from 'joi';
import User from './../models/user.model.js';
// import sendEmail from '../utils/sendEmail.js';
// import sendSMS from '../utils/sendSMS.js';
// import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/generateToken.js';
// import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { generateNextAddress } from './../utils/addressCreator.js';
import mongoose from 'mongoose';
import WalletAddress from '../models/WalletAddress.js';
import { passwordEncrypt, decryptPassword } from './../utils/encryption.js';

function generateReferralCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  console.log(code);
  return code;
}

function createReferralLink(referralCode, baseUrl = 'https://example.com/referral') {
  console.log(`${baseUrl}?code=${referralCode}`);
  return `${baseUrl}?code=${referralCode}`;
}

export const register = async (req, res) => {
  try {
    const schema = Joi.object({
      country: Joi.string().required(),
      fullName: Joi.string().required(),
      userName: Joi.string().required(),
      email: Joi.string().email().required(),
      mobileNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
      countryCode: Joi.string().required(),
      password: Joi.string().min(6).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const {
      country,
      fullName,
      userName,
      email,
      mobileNumber,
      countryCode,
      password
    } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { mobileNumber }, { userName }]
    });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await passwordEncrypt(password);
    const emailOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const mobileOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const uniqueReferralCode = await generateReferralCode();
    const uniqueReferralLink = await createReferralLink(uniqueReferralCode);

    const newUser = new User({
      country,
      fullName,
      userName,
      email,
      mobileNumber,
      countryCode,
      password: hashedPassword,
      emailOtp,
      emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      mobileOtp,
      mobileOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      referralCode: uniqueReferralCode,
      referralLink: uniqueReferralLink,
      profilePhoto: null,
      language: 'ENG',
      currency: 'INR',
      notification: true
    });

    console.log("newUser->>>>", newUser);

    const user = await newUser.save();
    await generateNextAddress('admin', user._id);

    res.status(201).json({
      message: "User registered. OTPs sent to email and mobile."
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { mobileNumber, password, countryCode, pin } = req.body;
    let user, isMatch = false;

    if (pin) {
      user = await User.findOne({ mobileNumber, countryCode });
      if (!user) return res.status(404).json({ message: "No user has set a PIN" });

      const decryptedPin = decryptPassword(user.pin.encryptedData, user.pin.key, user.pin.iv);
      if (decryptedPin == pin) {
        isMatch = true;
      }
      if (!isMatch) return res.status(401).json({ message: "Invalid PIN" });
    } else {
      if (!mobileNumber || !password || !countryCode) {
        return res.status(400).json({ message: "Mobile number, password and country code are required" });
      }
      user = await User.findOne({ mobileNumber, countryCode });
      if (!user) return res.status(404).json({ message: "User not found" });
      console.log("user->>>", user);

      const decryptedPassword = decryptPassword(user.password.encryptedData, user.password.key, user.password.iv);
      if (decryptedPassword == password) {
        isMatch = true;
      }
      if (!isMatch) return res.status(401).json({ message: "Invalid password" });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        countryCode: user.countryCode,
        email: user.email,
        profilePhoto: user.profilePhoto,
        currency: user.currency,
        language: user.language,
        notification: user.notification
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};






export const sendOrResendOtp = async (req, res) => {
  try {
    const { email, mobileNumber, countryCode, via } = req.body;

    if (!via || (via !== "email" && via !== "mobile")) {
      return res.status(400).json({ message: "Invalid 'via' method. Use 'email' or 'mobile'" });
    }

    let user;

    if (via === "email") {
      if (!email) return res.status(400).json({ message: "Email is required" });
      user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found with this email" });

      const emailOtp = Math.floor(1000 + Math.random() * 9000).toString();
      user.emailOtp = emailOtp;
      user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    } else {
      if (!mobileNumber || !countryCode) {
        return res.status(400).json({ message: "Mobile number and country code are required" });
      }
      user = await User.findOne({ mobileNumber, countryCode });
      if (!user) return res.status(404).json({ message: "User not found with this mobile number" });

      const mobileOtp = Math.floor(1000 + Math.random() * 9000).toString();
      user.mobileOtp = mobileOtp;
      user.mobileOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    }

    await user.save();
    return res.status(200).json({ message: `OTP sent successfully via ${via}` });
  } catch (err) {
    console.error("OTP Send Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};




export const forgotPassword = async (req, res) => {
  try {
    const { email, mobileNumber, countryCode, via } = req.body;

    if (!via || (via !== "email" && via !== "mobile")) {
      return res.status(400).json({ message: "Invalid 'via' method. Use 'email' or 'mobile'" });
    }

    let user;

    if (via === "email") {
      if (!email) return res.status(400).json({ message: "Email is required" });
      user = await User.findOne({ email });
    } else {
      if (!mobileNumber || !countryCode) {
        return res.status(400).json({ message: "Mobile number and country code are required" });
      }
      user = await User.findOne({ mobileNumber, countryCode });
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const resetLink = `http://64.227.133.77:4041/api/v1/auth/reset-password?token=${token}`;

    return res.status(200).json({ message: `Reset link sent via ${via}`, resetLink });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { password } = req.body;

    if (!token) return res.status(400).json({ error: "Token is required" });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.password = await passwordEncrypt(password);
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { otp, email, mobileNumber, countryCode, type } = req.body;

    if (!otp || !type || !["email", "mobile"].includes(type)) {
      return res.status(400).json({ error: "OTP and valid type (email/mobile) required" });
    }

    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (mobileNumber && countryCode) {
      user = await User.findOne({ mobileNumber, countryCode });
    } else {
      return res.status(400).json({ error: "Email or mobileNumber with countryCode required" });
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    if (type === "email") {
      user.isEmailVerified = true;
      user.emailOtp = undefined;
      user.emailOtpExpiry = undefined;
    } else {
      user.isMobileVerified = true;
      user.mobileOtp = undefined;
      user.mobileOtpExpiry = undefined;
    }

    const token = generateToken(user);
    await user.save();

    res.status(200).json({
      message: `${type === "email" ? "Email" : "Mobile"} OTP verified successfully`,
      token
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const setPin = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: "PIN must be a 4-digit number" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.pin = passwordEncrypt(pin);
    await user.save();

    res.json({ message: "PIN set successfully" });
  } catch (error) {
    console.error("Set PIN error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) return res.status(400).json({ success: false, message: "User ID is missing from request." });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: "Invalid user ID format." });

    const user = await User.findById(userId).select(
      "country fullName userName email mobileNumber pin password countryCode language currency notification profilePhoto -_id"
    );

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully.",
      data: user
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile.",
      error: err.message
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(400).json({ success: false, message: "User ID is missing from request." });

    const { email, mobileNumber, countryCode, profilePhoto, pin, password, notification, currency, language } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(400).json({ success: false, message: "Email is already in use." });
      user.email = email;
      user.isEmailVerified = false;
    }

    if (mobileNumber && mobileNumber !== user.mobileNumber) {
      const existingMobile = await User.findOne({ mobileNumber });
      if (existingMobile) return res.status(400).json({ success: false, message: "Mobile number is already in use." });
      user.mobileNumber = mobileNumber;
      user.isMobileVerified = false;
    }

    if (countryCode) user.countryCode = countryCode;
    if (profilePhoto) user.profilePhoto = profilePhoto;
    if (notification) user.notification = notification;
    if (currency) user.currency = currency;
    if (language) user.language = language;

    if (pin) user.pin = passwordEncrypt(pin);
    if (password) user.password = passwordEncrypt(password);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully."
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: err.message
    });
  }
};

export const receiveCrypto = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(400).json({ success: false, message: "User ID not found in request." });

    const wallets = await WalletAddress.find({ userId }).select("address qrCodeBase64 -_id");
    if (!wallets || wallets.length === 0) return res.status(404).json({ success: false, message: "No wallet addresses found for this user." });

    return res.status(200).json({
      success: true,
      message: "Wallet addresses retrieved successfully.",
      data: wallets
    });
  } catch (err) {
    console.error("Error in receiveCrypto:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching wallet addresses.",
      error: err.message
    });
  }
};






