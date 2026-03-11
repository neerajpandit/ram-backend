import axios from "axios";
import { Otp } from "../models/otp.Model.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { userAuth } from "../models/userAuth.Model.js";
import jwt from "jsonwebtoken"; 

const { SMS_API_URL, SMS_USER, SMS_PASSWORD, SENDER_ID, TemplateID } =
  process.env;

/* ---------------------------------------------------------
 * SEND OTP SERVICE
 * --------------------------------------------------------- */


export const sendSMS = async (mobile, message) => {
  try {
    
    if (!mobile) {
      return {
        status: false,
        message: "Mobile number is required",
      };
    }

    const formattedNumber = mobile.startsWith("+91") ? mobile : `+91${mobile}`;

    // Validate number format
    if (!/^\+91\d{10}$/.test(formattedNumber)) {
      return {
        status: false,
        message: "Invalid phone number format. Use +91XXXXXXXXXX",
      };
    }

    const smsParams = new URLSearchParams({
      User: process.env.SMS_USER,
      passwd: process.env.SMS_PASSWORD,
      mobilenumber: formattedNumber,
      message: message,
      sid: process.env.SENDER_ID,
      mtype: "N",
      DR: "Y",
      tempid: process.env.TemplateID,
    });

    const response = await axios.post(
      process.env.SMS_API_URL,
      smsParams.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return {
      status: true,
      statusCode:200,
      message: "SMS sent successfully",
      smsResponse: response.data,
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to send SMS",
      error: error.message,
    };
  }
};

export const sendOTP = async (mobile, otp) => {
  const message = `Dear user, ${otp} is your OTP. Valid for 15 min only and do not share with anyone - INNOBLES`;
  return await sendSMS(mobile, message);
};

/* ---------------------------------------------------------
 * VERIFY OTP SERVICE
 * --------------------------------------------------------- */
export const verifyOtpService = async ({ fullName,email,phoneNumber, otp }) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // 1. Find OTP
        const otpDoc = await Otp.findOne({ phoneNumber, status: "unused", expiresAt: { $gt: new Date() } })
            .select("+otp")
            .session(session);

            
        if (!otpDoc) throw new Error("Invalid or expired OTP");


        // 2. Verify OTP
       const isValid = await otpDoc.verifyOtp(otp,session);
       
        if (isValid.success === false)
            throw new Error("Incorrect OTP or too many attempts");

        // 3. Check if user exists
        let user = await userAuth
            .findOne({ phoneNumber: phoneNumber, status:"0" })
            .session(session);
        let purpose;
        let studentProfile;

        if (!user) {

            const pas = Math.random().toString(36).slice(-8);

            user = new userAuth({
                phoneNumber: phoneNumber,
                role: 2, // Student role
                // profileId: studentProfile._id,
                fullName: fullName,
                email: email || "",
                password: pas,
                plainPassword: pas,
            });

            await user.save({ session });

            // Link back userId to student profile
            // studentProfile.userId = user._id;
            // await studentProfile.save({ session });

            purpose = "registration";
        } else {
            // ➡️ Existing User = Login
            purpose = "login";
            // studentProfile = await Student.findById(user.profileId).session(
            //     session
            // );
        }

        // 4. Generate Tokens
        const accessToken = jwt.sign(
          {
            userId: user._id,
            role: user.role,
            tokenVersion: user.tokenVersion,
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1d" }
        );

        const refreshToken = jwt.sign(
          {
            userId: user._id,
            role: user.role,
            tokenVersion: user.tokenVersion,
          },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "7d" }
        );

        // Save refresh token
        user.refreshToken = refreshToken;
        user.refreshTokenExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );
        await user.save({ session });

        // 5. Mark OTP as used
        otpDoc.status = "used";
        await otpDoc.save({ session });

        // ✅ Commit the transaction
        await session.commitTransaction();
        session.endSession();

        return {
            user,
            accessToken,
            refreshToken,
            purpose,
            full_name: studentProfile?.full_name,
            isCompleted: studentProfile
                ? studentProfile.isCompleted
                : undefined,
        };
    } catch (error) {
        // ❌ Abort on error
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

