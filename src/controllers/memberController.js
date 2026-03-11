import mongoose from "mongoose";
import { Member } from "../models/member.Model.js";

import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Counter } from "../models/counter.Model.js";

/**
 * CREATE MEMBER
 */

export const createMember = asyncHandler(async (req, res) => {
  const {
    name,
    phoneNumber,
    voterId,
    fatherOrHusbandName,
    age,
    address,
    pinCode,
    state,
    district,
    constituency,
    pollingStation,
    prakoshth,
    location,
    formDate,
  } = req.body;

  // Check phone number
  const existingMobile = await Member.findOne({ phoneNumber });
  if (existingMobile) {
    throw new ApiError(409, "Member already registered with this Phone Number");
  }

  // Check voter id
  if (voterId) {
    const existingVoter = await Member.findOne({ voterId });
    if (existingVoter) {
      throw new ApiError(409, "Member already registered with this voterId");
    }
  }

const counter = await Counter.findOneAndUpdate(
  { name: "memberFormNumber" },
  { $inc: { seq: 1 } },
  { new: true, upsert: true },
);

const seqNumber = counter.seq.toString().padStart(6, "0");

// Get current month & year
const now = new Date();
const month = String(now.getMonth() + 1).padStart(2, "0");
const year = now.getFullYear();

// Generate Form Number
const formNumber = `RAM-MEM-${year}${month}-${seqNumber}`;

  const member = await Member.create({
    name,
    phoneNumber,
    voterId,
    fatherOrHusbandName,
    age,
    address,
    pinCode,
    state,
    district,
    constituency,
    pollingStation,
    prakoshth,
    location,
    formDate,
    formNumber,
  });

  return ApiResponse(res, 201, "Member registered successfully", member);
});

/**
 * GET MEMBERS WITH FILTER
 */

export const getMembers = asyncHandler(async (req, res) => {
  const { state, district, prakoshth, page = 1, limit = 10 } = req.query;

  const filter = {};

  if (state) filter.state = state;
  if (district) filter.district = district;
  if (prakoshth) filter.prakoshth = prakoshth;

  const skip = (page - 1) * limit;

  const members = await Member.find(filter)
    .populate("state district constituency pollingStation prakoshth")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Member.countDocuments(filter);

  return ApiResponse(res, 200, "Members fetched successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      members,
    })
  
});

/**
 * GET MEMBER BY ID
 */

export const getMemberById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid member id");
  }

  const member = await Member.findById(id).populate(
    "state district constituency pollingStation prakoshth",
  );

  if (!member) {
    throw new ApiError(404, "Member not found");
  }

  return ApiResponse(res, 200, "Member fetched successfully", member);
});

/**
 * UPDATE MEMBER
 */

export const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid member id");
  }

  const member = await Member.findById(id);

  if (!member) {
    throw new ApiError(404, "Member not found");
  }

  const updatedMember = await Member.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedMember, "Member updated successfully"));
});

/**
 * DELETE MEMBER
 */

export const deleteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid member id");
  }

  const member = await Member.findById(id);

  if (!member) {
    throw new ApiError(404, "Member not found");
  }

  await Member.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member deleted successfully"));
});
