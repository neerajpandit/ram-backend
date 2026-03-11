import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: false,
      validate: {
        validator: (value) => {
          if (!value) return true; // optional
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Invalid email format",
      },
    },
    username: {
      type: String,
      lowercase: true,
      required: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      validate: {
        validator: function (value) {
          if (!value) return true; // allow empty when not admin
          return /^[a-zA-Z0-9_.-]+$/.test(value);
        },
        message:
          "Username can only contain letters, numbers, underscores, dots, and hyphens",
      },
    },

    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      validate: {
        validator: (value) => /^\+?[0-9]{7,15}$/.test(value),
        message: "Invalid phone number format",
      },
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    role: {
      type: Number,
      enum: {
        values: [0, 1, 2],
        message: "Role must be 0 (Super-Admin), 1 (Admin), or 2 (User)",
      },
      default: 2,
      required: [true, "User role is required"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    plainPassword:{
      type:String
    },

    refreshToken: {
      type: String,
      select: false,
    },

    refreshTokenExpiresAt: {
      type: Date,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
    passwordResetToken: String, // hashed token
    passwordResetExpires: Date,

    status: {
      type: String,
      enum: {
        values: ["0", "1", "2", "3"],
        message:
          "Status must be '0' (Active), '1' (Inactive), '2' (Deleted), '3' (Archived)",
      },
      default: "0",
    },
  },
  {
    timestamps: true,
  },
);

/* ---------------------------------------------------------
 * PRE-SAVE: Hash password
 * --------------------------------------------------------- */
userSchema.pre("save", async function () {
  // Only hash the password if it was modified or is new
  if (!this.isModified("password")) return;

  try {
    this.password = await bcrypt.hash(this.password, 10);
  } catch (err) {
    // Throwing error will automatically propagate to Mongoose
    throw err;
  }
});

/* ---------------------------------------------------------
 * METHODS
 * --------------------------------------------------------- */
userSchema.methods.isPasswordCorrect = function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
      phoneNumber: this.phoneNumber,
      tokenVersion: this.tokenVersion,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      tokenVersion: this.tokenVersion,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const userAuth = mongoose.model("userAuth", userSchema);
