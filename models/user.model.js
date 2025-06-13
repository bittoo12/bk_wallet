import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    country: { type: String },
    fullName: { type: String },
    userName: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    mobileNumber: { type: String, unique: true, sparse: true },
    countryCode: { type: String },

    password: { type: Object }, // Prefer hashed string in real use
    pin: { type: Object },

    emailOtp: { type: String },
    emailOtpExpiry: { type: Date },
    mobileOtp: { type: String },
    mobileOtpExpiry: { type: Date },

    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    referralCode: { type: String, unique: true, sparse: true },
    referralLink: { type: String, unique: true, sparse: true },

    profilePhoto: { type: String },

    language: { type: String, default: 'ENG' },
    currency: { type: String, default: 'USD' },
    notification: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Export the model in ESM
const User = mongoose.model('User', userSchema);
export default User;
