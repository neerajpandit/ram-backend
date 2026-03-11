import { Prakoshth } from "../models/prakoshth.Model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createPrakoshth = asyncHandler(async (req, res) => {
  const { nameEn,nameHi, description } = req.body;

  const exists = await Prakoshth.findOne({ nameEn });

  if (exists) {
    throw new ApiError(409, "Prakoshth already exists");
  }

  const prakoshth = await Prakoshth.create({
    nameEn,
    nameHi,
    description,
  });

  return ApiResponse(res, 201, "Prakoshth created successfully", prakoshth);
});

export const getPrakoshths = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const filter = {};

  // Search in Hindi and English names
  if (search) {
    filter.$or = [
      { nameEn: { $regex: search, $options: "i" } },
      { nameHi: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const prakoshths = await Prakoshth.find(filter)
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Prakoshth.countDocuments(filter);

  return ApiResponse(res, 200, "Prakoshths fetched successfully", {
    total,
    page: Number(page),
    limit: Number(limit),
    prakoshths,
  });
});

export const updatePrakoshth = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const prakoshth = await Prakoshth.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!prakoshth) {
    throw new ApiError(404, "Prakoshth not found");
  }

  return ApiResponse(res,200,  "Prakoshth updated",prakoshth);
});
