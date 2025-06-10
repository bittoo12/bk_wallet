const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    country: String,
    fullName: String,
    userName: { type: String, unique: true },
    email: { type: String, unique: true },
    mobileNumber: { type: String, unique: true },
    countryCode: String,
    password: {
      type : Object
    },
    emailOtp: String,
    emailOtpExpiry: Date,
    mobileOtp: String,
    mobileOtpExpiry: Date,
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    referralCode: { type: String, unique: true },
    referralLink: { type: String, unique: true },
    profilePhoto: { type: String },
    pin: {
      type: Object,
    },
    language: {
      type: String,
      default : 'ENG'
    },
    currency: {
      type: String,
      default : 'INR'
    },
    notification: {
      type: Boolean,
      default : true
    }, //on or off
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
