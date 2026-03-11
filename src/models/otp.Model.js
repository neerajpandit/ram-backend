import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const otpSchema = new Schema(
  {
    otp: {
      type: String,
      required: [true, "OTP is required"],
      select: false, // security
    },

    contactType: {
      type: String,
      required: [true, "Contact type is required"],
      enum: {
        values: ["email", "phone"],
        message: "Contact type must be either 'email' or 'phone'",
      },
      default: "phone",
    },

    phoneNumber: {
      type: String,
      trim: true,
      lowercase: true,
    },
    purpose: {
      type: String,
      enum: {
        values: ["signup", "login", "reset", "verify"],
        message: "Invalid OTP purpose",
      },
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 5 minutes
    },

    status: {
      type: String,
      enum: {
        values: ["unused", "used", "expired"],
        message: "Invalid OTP status",
      },
      default: "unused",
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5, // brute-force protection
    },

    statusTimestamps: {
      unusedAt: { type: Date, default: Date.now },
      usedAt: { type: Date },
      expiredAt: { type: Date },
    },

    statusLogs: [
      {
        status: {
          type: String,
          enum: ["unused", "used", "expired"],
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // modern & generic
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ---------------------------------------------------------
 * PRE-SAVE: HASH OTP BEFORE SAVING
 * --------------------------------------------------------- */
// otpSchema.pre("save", async function (next) {
//   if (this.isModified("otp")) {
//     this.otp = await bcrypt.hash(this.otp, 10);
//   }
//   next();
// });

/* ---------------------------------------------------------
 * METHOD: VERIFY OTP (SECURE)
 * --------------------------------------------------------- */
otpSchema.methods.verifyOtp = async function (enteredOtp,session) {
  const now = new Date();

  // Already used, expired or too many attempts
  if (this.status !== "unused" || this.attempts >= 5 || this.expiresAt < now) {
    return { success: false, reason: "invalid" };
  }

  // Increment attempt
  this.attempts += 1;

  // Compare hashed OTP
  // const isMatch = await bcrypt.compare(enteredOtp, this.otp);
  const isMatch = enteredOtp === this.otp;

  if (isMatch) {
    this.status = "used";
    this.statusTimestamps.usedAt = now;
    this.statusLogs.push({ status: "used" });
  }

  // If OTP expired during verification
  if (!isMatch && this.expiresAt < now) {
    this.status = "expired";
    this.statusTimestamps.expiredAt = now;
    this.statusLogs.push({ status: "expired" });
  }

  if (session) {
    await this.save({ session });
  } else {
    await this.save();
  }

  return { success: isMatch };
};

/* ---------------------------------------------------------
 * INDEXES FOR PERFORMANCE & SECURITY
 * --------------------------------------------------------- */
otpSchema.index(
  { phoneNumber: 1, contactType: 1, purpose: 1, status: 1 },
  { name: "unique_unused_otp_index" }
);

otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "otp_expiry_index" }
);

export const Otp = mongoose.model("Otp", otpSchema);
