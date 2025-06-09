const Joi = require("joi");
const User = require("./../models/user.model");
const sendEmail = require("../utils/sendEmail");
const sendSMS = require("../utils/sendSMS");
const bcrypt = require("bcryptjs");
const {generateToken }= require("../utils/generateToken"); 
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {generateNextAddress} = require('./../utils/addressCreator')
const mongoose = require('mongoose');
const WalletAddress = require("../models/WalletAddress");

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
  console.log(`${baseUrl}?code=${referralCode}`)
  return `${baseUrl}?code=${referralCode}`;
}


// File: controllers/authController.js

const register = async (req, res) => {
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

    const hashedPassword = await bcrypt.hash(password, 10);
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
      referralLink: uniqueReferralLink
    });

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

const login = async (req, res) => {
  try {
    const { mobileNumber, password, countryCode, pin } = req.body;
    let user, isMatch = false;

    if (pin) {
      user = await User.findOne({ pin: { $ne: null } });
      if (!user) return res.status(404).json({ message: "No user has set a PIN" });

      isMatch = await bcrypt.compare(pin, user.pin);
      if (!isMatch) return res.status(401).json({ message: "Invalid PIN" });
    } else {
      if (!mobileNumber || !password || !countryCode) {
        return res.status(400).json({ message: "Mobile number, password and country code are required" });
      }
      user = await User.findOne({ mobileNumber, countryCode });
      if (!user) return res.status(404).json({ message: "User not found" });

      isMatch = await bcrypt.compare(password, user.password);
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
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const sendOrResendOtp = async (req, res) => {
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

const forgotPassword = async (req, res) => {
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

const resetPassword = async (req, res) => {
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

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const verifyOtp = async (req, res) => {
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
      
const setPin = async (req, res) => {
        try {
          const userId = req.user._id;
          if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
          } // Assuming you encoded user id as 'id' in JWT
          console.log(userId,req.user)
          const { pin } = req.body;
          if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return res.status(400).json({ error: "PIN must be a 4-digit number" });
          }
      
          const user = await User.findById(userId);
          if (!user) {
            return res.status(404).json({ error: "User not found" });
          }
      
          const hashedPin = await bcrypt.hash(pin, 10);
          user.pin = hashedPin;
          await user.save();
      
          res.json({ message: "PIN set successfully" });
        } catch (error) {
          console.error("Set PIN error:", error);
          res.status(500).json({ error: "Internal Server Error" });
        }
      };

const getProfile = async (req, res) => {
        try {
          const userId = req.user?._id;
      
          // Validate userId presence
          if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is missing from request." });
          }
      
          // Validate userId format
          if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID format." });
          }
      
          // Fetch user profile
          const user = await User.findById(userId).select(
            'country fullName userName email mobileNumber pin password countryCode profilePhoto -_id'
          );
      
          if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
          }
      
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



const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is missing from request." });
    }

    const {
      email,
      mobileNumber,
      countryCode,
      profilePhoto,
      pin,
      password
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // ✅ Email update check
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "Email is already in use." });
      }
      user.email = email;
      user.isEmailVerified = false;
    }

    // ✅ Mobile number update check
    if (mobileNumber && mobileNumber !== user.mobileNumber) {
      const existingMobile = await User.findOne({ mobileNumber });
      if (existingMobile) {
        return res.status(400).json({ success: false, message: "Mobile number is already in use." });
      }
      user.mobileNumber = mobileNumber;
      user.isMobileVerified = false;
    }

    // ✅ Optional fields
    if (countryCode) user.countryCode = countryCode;
    if (profilePhoto) user.profilePhoto = profilePhoto;

    // ✅ PIN update with hashing
    if (pin) {
      const salt = await bcrypt.genSalt(10);
      user.pin = await bcrypt.hash(pin, salt);
    }

    // ✅ Password update with hashing
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

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

const receiveCrypto = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID not found in request." });
    }

    const wallets = await WalletAddress.find({ userId }).select('address qrCodeBase64 -_id');

    if (!wallets || wallets.length === 0) {
      return res.status(404).json({ success: false, message: "No wallet addresses found for this user." });
    }

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







module.exports = { receiveCrypto,register,login,sendOrResendOtp,forgotPassword,resetPassword ,verifyOtp,setPin,getProfile,updateProfile};
