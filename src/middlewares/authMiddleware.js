import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { userAuth } from "../models/userAuth.Model.js";


export const verifyJWT1 = asyncHandler(async (req, res, next) => {
    try {
        const token =
          req.cookies?.token ||
          req.cookies?.accessToken ||
          req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res
                .status(401)
                .json({
                    success: false,
                    statusCode: 401,
                    message: "Unauthorized request",
                });
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        const user = await userAuth
            .findById(decodedToken?._id || decodedToken?.userId)
            .select("-password -refreshToken");

        if (!user) {
            return res
                .status(401)
                .json({
                    success: false,
                    statusCode: 401,
                    message: "Invalid access token",
                });
        }        
            if (
              decodedToken.tokenVersion !== user.tokenVersion 
            ) {
              return res.status(401).json({
                success: false,
                message: "Token expired, please login again",
              });
            }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            statusCode: 401,
            message: error?.message || "Invalid access token",
        });
    }
});

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const accessToken = 
      req.cookies?.token ||
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized request" });
    }

    // 1️⃣ Verify JWT signature
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    // 2️⃣ Verify session from DB (CRITICAL)
    const user = await userAuth
      .findOne({
        _id: decoded._id || decoded.userId,
        tokenVersion: decoded.tokenVersion, // 🔑 MOST IMPORTANT
        refreshToken: refreshToken,
        refreshTokenExpiresAt: { $gt: new Date() },
        status: "0",
      })
      .select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Session invalid or expired",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
});

export const isAdmin = asyncHandler(async (req, res, next) => {
    try {
        const user = req.user; // Get user information attached to the request        
        // Check if the user is an admin
        if (user.role !== 0 && user.role !==1) {
            return res.status(401).json({
              success: false,
              statusCode: 401,
              message: "You are Not Authrized this action",
            });
        }

        next(); // User is admin, proceed to the next middleware or route handler
    } catch (error) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: error?.message || "Invalid access token",
        });
        
    }
});

export const isSuperAdmin = asyncHandler(async (req, res, next) => {
    try {
        const user = req.user; // Get user information attached to the request

        // Check if the user is an admin
        if (user.role !== "0") {
            throw new ApiError(
                403,
                "You are not authorized to perform this action its only for superadmin"
            );
        }

        next(); // User is admin, proceed to the next middleware or route handler
    } catch (error) {
        next(error); // Pass any errors to the error handler middleware
    }
});

export const verifyCallbackToken = asyncHandler(async(req, res, next) => {
  const token = req.query.token;
console.log("token",token);


if (!token) {
  return res.status(401).json({
    success: false,
    statusCode: 401,
    message: "Unauthorized request",
  });
}


  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userAuth
            .findById(decodedToken?._id || decodedToken?.userId)
            .select("-password -refreshToken");

        if (!user) {
            return res
                .status(401)
                .json({
                    success: false,
                    statusCode: 401,
                    message: "Invalid access token",
                });
        }

        req.user = user;
  } catch (err) {
    req.user = null;
  }
  next();

});
