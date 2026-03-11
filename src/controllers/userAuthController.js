import mongoose from "mongoose";
import { sendOTP, verifyOtpService } from "../utils/otpService.js";
import { userAuth } from "../models/userAuth.Model.js";
import { Otp } from "../models/otp.Model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import sendEmail from "../utils/emailService.js";
import { decryptData, generateHmac } from "../utils/crypto.js";
const IS_PROD = process.env.IS_SSL;
import jwt from "jsonwebtoken";
// import { verifyOtpService } from "../services/verifyOtpService.js";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ======================= SIGNUP =======================
export const sendSignupOtp = async (req, res) => {
  try {
    const { phoneNumber, timestamp, hashValues } = req.body;
    if (!phoneNumber || !timestamp || !hashValues) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }

    /* ============================
     :two: VERIFY HMAC
  ============================ */
    const payloadForHash = JSON.stringify({ phoneNumber, timestamp });
    const serverHash = generateHmac(payloadForHash);
    if (serverHash !== hashValues) {
      return res.status(401).json({
        success: false,
        message: "Login payload has been tampered",
      });
    }
    /* ============================
     :three: DECRYPT
  ============================ */
    const decryptedPhoneNumber = decryptData(phoneNumber);
    if (!decryptedPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Invalid encrypted credentials",
      });
    }

    // Check if already registered
    const existingUserInAuth = await userAuth.findOne({
      phoneNumber: decryptedPhoneNumber,
      status: "0",
    });

    if (existingUserInAuth) {
      return res.status(400).json({
        success: false,
        message: "User already exists, please login",
      });
    }

    let otpDoc = await Otp.findOne({
      phoneNumber: decryptedPhoneNumber,
      status: "unused",
      expiresAt: { $gt: new Date() },
    }).select("+otp");

    let otp;
    if (otpDoc) {
      // Extend expiry
      otpDoc.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      otp = otpDoc.otp; // reuse existing OTP
      await otpDoc.save();
    } else {
      otp = generateOtp();
      otpDoc = new Otp({
        phoneNumber: decryptedPhoneNumber,
        otp,
        purpose: "signup",
      });
      await otpDoc.save();
    }

    // ✅ send SMS using your service
    const smsResponse = await sendOTP(decryptedPhoneNumber, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent for signup",
      smsResponse,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, phoneOtp, timestamp, hashValues } =
      req.body;

    if (!fullName || !phoneNumber || !phoneOtp || !timestamp || !hashValues) {
      return res.status(400).json({
        success: false,
        message: "fullName, email, phoneNumber and phoneOtp are required",
      });
    }
    /* ============================
     :two: VERIFY HMAC
  ============================ */
    let payloadForHash;
    if (email) {
      payloadForHash = JSON.stringify({
        fullName,
        phoneNumber,
        email,
        phoneOtp,
        timestamp,
      });
    } else {
      payloadForHash = JSON.stringify({
        fullName,
        phoneNumber,
        phoneOtp,
        timestamp,
      });
    }
    console.log("payload", payloadForHash);

    const serverHash = generateHmac(payloadForHash);
    if (serverHash !== hashValues) {
      return res.status(401).json({
        success: false,
        message: "Login payload has been tampered",
      });
    }
    /* ============================
     :three: DECRYPT
  ============================ */
    const decryptedFullName = decryptData(fullName);
    const decryptedPhoneNumber = decryptData(phoneNumber);
    const decryptedPhoneOtp = decryptData(phoneOtp);
    let decryptedEmail = null;
    if (email) {
      decryptedEmail = decryptData(email);
      if (!decryptedEmail) {
        return res.status(400).json({
          success: false,
          message: "Invalid encrypted email",
        });
      }
    }
    if (!decryptedFullName || !decryptedPhoneNumber || !decryptedPhoneOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid encrypted credentials",
      });
    }
    let isCompleted = false;
    const { user, accessToken, refreshToken, purpose } = await verifyOtpService(
      {
        fullName: decryptedFullName,
        email: decryptedEmail,
        phoneNumber: decryptedPhoneNumber,
        otp: decryptedPhoneOtp,
      },
    );

    return res
      .status(201)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: IS_PROD ? "strict" : "none",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: IS_PROD ? "strict" : "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        message:
          purpose === "registration" ? "Signup successful" : "Login successful",
        // data: user,
        isCompleted,
      });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ======================= SIGNIN =======================
export const sendSigninOtp = async (req, res) => {
  try {
    const { phoneNumber, timestamp, hashValues } = req.body;
    if (!phoneNumber || !timestamp || !hashValues) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }
    /* ============================
     :two: VERIFY HMAC
  ============================ */
    const payloadForHash = JSON.stringify({ phoneNumber, timestamp });
    const serverHash = generateHmac(payloadForHash);
    if (serverHash !== hashValues) {
      return res.status(401).json({
        success: false,
        message: "Login payload has been tampered",
      });
    }
    /* ============================
     :three: DECRYPT
  ============================ */
    const decryptedPhoneNumber = decryptData(phoneNumber);
    if (!decryptedPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Invalid encrypted credentials",
      });
    }
    const user = await userAuth.findOne({
      phoneNumber: decryptedPhoneNumber,
      status: "0",
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found, please sign up",
      });
    }
    // if (user.role !== "2") {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Contact to admin",
    //   });
    // }

    let otpDoc = await Otp.findOne({
      phoneNumber: decryptedPhoneNumber,
      status: "unused",
      expiresAt: { $gt: new Date() },
    }).select("+otp");

    let otp;
    if (otpDoc) {
      otpDoc.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      otp = otpDoc.otp;
      await otpDoc.save();
    } else {
      otp = generateOtp();
      otpDoc = new Otp({
        phoneNumber: decryptedPhoneNumber,
        otp,
        purpose: "login",
        userId: user._id,
      });
      await otpDoc.save();
    }

    // ✅ send SMS using your service
    const smsResponse = await sendOTP(decryptedPhoneNumber, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent for login",
      smsResponse,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

export const verifySigninOtp = async (req, res) => {
  try {
    const { phoneNumber, phoneOtp, timestamp, hashValues } = req.body;
    /* ============================
     :two: VERIFY HMAC
  ============================ */
    const payloadForHash = JSON.stringify({
      phoneNumber,
      phoneOtp,
      timestamp,
    });
    const serverHash = generateHmac(payloadForHash);
    if (serverHash !== hashValues) {
      return res.status(401).json({
        success: false,
        message: "Login payload has been tampered",
      });
    }
    /* ============================
     :three: DECRYPT
  ============================ */
    const decryptedPhoneNumber = decryptData(phoneNumber);
    const decryptedPhoneOtp = decryptData(phoneOtp);
    if (!decryptedPhoneNumber || !decryptedPhoneOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid encrypted credentials",
      });
    }
    let isCompleted = false;

    const { user, full_name, accessToken, refreshToken, purpose } =
      await verifyOtpService({
        phoneNumber: decryptedPhoneNumber,
        otp: decryptedPhoneOtp,
        purpose: "login",
      });

    const applicant = await Applicant.findOne({ userId: user._id }).select(
      "_id",
    );
    if (applicant) {
      isCompleted = true;
    } else {
      isCompleted = false;
    }
    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: IS_PROD ? "strict" : "none",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: IS_PROD ? "strict" : "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        message: purpose === "login" ? "Login successful" : "Signup successful",
        data: user,
        full_name,
        isCompleted,
      });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "OTP verification failed",
    });
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role, phoneNumber, fullName } = req.body;

  // if (!username || !fullName || !password || !role) {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Please provide all required fields",
  //   });
  // }

  const missingFields = [];

  if (!username) missingFields.push("username");
  if (!fullName) missingFields.push("fullName");
  if (!password) missingFields.push("password");
  if (role === undefined) missingFields.push("role");
  if (!phoneNumber) missingFields.push("phoneNumber");

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Required fields are missing",
      requiredFields: missingFields,
    });
  }
  console.log("reqbody",req.body);
  
  const existingUser = await userAuth.findOne({ username });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }

   console.log("exist", existingUser);
  const user = await userAuth.create({
    email: email || null,
    fullName,
    username,
    password,
    plainPassword: password,
    role,
    phoneNumber: phoneNumber || null,
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User registration failed",
    });
  }
   console.log("exist", user);
  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: user,
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { username, password, timestamp, hashValues } = req.body;

  /* ============================
     :one: BASIC VALIDATION
  ============================ */
  if (!username || !password ) {
    return res.status(400).json({
      success: false,
      message: "Invalid login payload",
    });
  }
  /* ============================
     :two: VERIFY HMAC
  ============================ */
  // const payloadForHash = JSON.stringify({ username, password, timestamp });
  // const serverHash = generateHmac(payloadForHash);
  // if (serverHash !== hashValues) {
  //   return res.status(401).json({
  //     success: false,
  //     message: "Login payload has been tampered",
  //   });
  // }
  /* ============================
     :three: DECRYPT
  ============================ */
  const decryptedUsername = decryptData(username);
  const decryptedPassword = decryptData(password);
  if (!decryptedUsername || !decryptedPassword) {
    return res.status(400).json({
      success: false,
      message: "Invalid encrypted credentials",
    });
  }
  /* ============================
     :four: AUTH CHECK
  ============================ */
  const user = await userAuth
    .findOne({ username: decryptedUsername })
    .select("+password");
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid username or password",
    });
  }

  // -------------------------------
  // Validate password
  // -------------------------------
  const isPasswordCorrect = await user.isPasswordCorrect(decryptedPassword);

  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: "Invalida login credentials",
    });
  }

  // -------------------------------
  // Generate tokens
  // -------------------------------
  user.tokenVersion += 1;
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = Date.now() + 48 * 60 * 60 * 1000;

  await user.save();

  // -------------------------------
  // Send response
  // -------------------------------
  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: IS_PROD ? "strict" : "none",
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: IS_PROD ? "strict" : "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message: "User logged in successfully",
      statusCode:200,
      data: {
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        role: user.role,
      },
    });
});

//logout User
export const logoutUser = asyncHandler(async (req, res) => {


  await userAuth.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
        refreshTokenExpiresAt: 1,
      },
      $inc: { tokenVersion: 1 },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };
  console.log("Logout-------------", options);

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({
      success: true,
      statusCode: 200,
      message: "User logged out successfully",
      data: {},
    });
});

export const changeCurrentPassword1 = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  /* ============================
     :one: BASIC VALIDATION
     ============================ */
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Invalid change password payload",
    });
  }
  const minLength = 12;
  if (
    oldPassword.length < minLength ||
    newPassword.length < minLength ||
    confirmPassword.length < minLength
  ) {
    return res.status(400).json({
      success: false,
      message: `All passwords must be at least ${minLength} characters long`,
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match",
    });
  }
  /* ============================
     :five: FIND USER
     ============================ */
  const user = await userAuth.findById(req.user?._id).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  /* ============================
     :six: VERIFY OLD PASSWORD
     ============================ */
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: "Invalid old password",
    });
  }

  /* ============================
     :seven: UPDATE PASSWORD
     ============================ */
  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  /* ============================
     :eight: RESPONSE
     ============================ */
  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

//----------------------Forgot Password----------------------
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide your email",
    });
  }

  // Find user by email
  const user = await userAuth.findOne({ email });

  // Security: Do not reveal if email exists or not
  if (!user) {
    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent",
    });
  }

  // Generate a secure random token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token and expiry (1 hour)
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}`;

  // High-end HTML Template
  const mailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 40px 0;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="500" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background-color: #2D3436; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">${process.env.MAIL_NAME}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin-top: 0;">Trouble signing in?</h2>
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                We received a request to reset the password for your account. No worries, it happens to the best of us!
                            </p>
                            <div style="text-align: center; padding: 30px 0;">
                                <a href="${resetUrl}" style="background-color: #6C5CE7; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s;">
                                    Reset My Password
                                </a>
                            </div>
                            <p style="color: #888; font-size: 14px; font-style: italic;">
                                This link is valid for the next 60 minutes. If you didn't request this, you can ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; background-color: #F9FAFB; border-top: 1px solid #eeeeee;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                Need help? Contact our support team or reply to this email.
                            </p>
                            <div style="text-align: center; margin-top: 10px;">
                                <a href="${process.env.FRONTEND_URL}" style="color: #6C5CE7; font-size: 12px; text-decoration: none;">Visit our Website</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

  // try {
  //   await sendEmail({
  //     to: user.email,
  //     subject: "Reset Your Password",
  //     text: `Reset your password here: ${resetUrl}`, // Fallback for old email clients
  //     html: htmlMessage, // The "Wow" version
  //   });

  try {
    const email = await sendEmail(
      user.email,
      "Password Reset Request",
      mailContent,
    );

    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      success: false,
      message: "Email could not be sent, please try again later",
    });
  }
});

// ============================RESET PASSWORD============================
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Invalid request",
    });
  }

  if (password.length < 12) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 12 characters long",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with valid token and not expired
  const user = await userAuth
    .findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })
    .select("+password");

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password has been reset successfully",
  });
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword, timestamp, hashValues } =
    req.body;
  console.log("req.body", req.body);

  /* ============================
     :one: BASIC VALIDATION
     ============================ */
  if (
    !oldPassword ||
    !newPassword ||
    !confirmPassword ||
    !timestamp ||
    !hashValues
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid change password payload",
    });
  }

  /* ============================
     :two: VERIFY HMAC (ANTI-TAMPER)
     ============================ */
  const payloadForHash = JSON.stringify({
    oldPassword,
    newPassword,
    confirmPassword,
    timestamp,
  });

  console.log("payloa-------------d", payloadForHash);

  const serverHash = generateHmac(payloadForHash);
  if (serverHash !== hashValues) {
    return res.status(401).json({
      success: false,
      message: "Change password payload has been tampered",
    });
  }

  /* ============================
     :three: DECRYPT PASSWORDS
     ============================ */
  const decryptedOldPassword = decryptData(oldPassword);
  const decryptedNewPassword = decryptData(newPassword);
  const decryptedConfirmPassword = decryptData(confirmPassword);

  if (
    !decryptedOldPassword ||
    !decryptedNewPassword ||
    !decryptedConfirmPassword
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid encrypted password data",
    });
  }

  /* ============================
     :four: PASSWORD RULES
     ============================ */
  if (decryptedNewPassword.length < 12) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 12 characters long",
    });
  }

  if (decryptedNewPassword !== decryptedConfirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match",
    });
  }

  /* ============================
     :five: FIND USER
     ============================ */
  const user = await userAuth.findById(req.user?._id).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }
  console.log("user", user);

  /* ============================
     :six: VERIFY OLD PASSWORD
     ============================ */
  const isPasswordCorrect = await user.isPasswordCorrect(decryptedOldPassword);
  console.log("isPass---------", isPasswordCorrect);

  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: "Invalid old password",
    });
  }

  /* ============================
     :seven: UPDATE PASSWORD
     ============================ */
  user.password = decryptedNewPassword;

  await user.save({ validateBeforeSave: false });

  /* ============================
     :eight: RESPONSE
     ============================ */
  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({
      success: false,
      message: "unauthorized request",
    });
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await userAuth.findById(decodedToken?._id);

    if (!user) {
          return res.status(401).json({
            success: false,
            message: "Invalid refresh token",
          });  
    }

    if (incomingRefreshToken !== user?.refreshToken) {
          return res.status(401).json({
            success: false,
            message: "Refresh token is expired or used",
          }); 
    }


  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = Date.now() + 48 * 60 * 60 * 1000;

  await user.save();
    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: IS_PROD ? "strict" : "none",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: IS_PROD ? "strict" : "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
      success: true,
      statusCode: 200,
      message: "Access Toekn Refreshed",
      data: {},
    }
      );
  } catch (error) {
     return res.status(401).json({
       success: false,
       message: `${error?.message} || "Invalid refresh token"`,
     }); 
  }
});