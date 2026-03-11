import {State} from "../models/multiSchema.Model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//---------------STATE---------------------
export const createState = asyncHandler(async (req, res) => {
  const { name, code } = req.body;

  const exists = await State.findOne({ name });

  if (exists) {
    throw new ApiError(409, "State already exists");
  }

  const state = await State.create({ name, code });

  return res
    .status(201)
    .json(new ApiResponse(201, state, "State created successfully"));
});

export const getStates = asyncHandler(async (req, res) => {
  const states = await State.find().sort({ name: 1 });

  return ApiResponse(res, 200, "States fetched", states);
});

//---------------------District--------------------------

import {District} from "../models/multiSchema.Model.js";

export const createDistrict = asyncHandler(async (req, res) => {
  const { name, state } = req.body;

  const district = await District.create({
    name,
    state,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, district, "District created"));
});

export const getDistricts = asyncHandler(async (req, res) => {
  const { state } = req.query;

  const filter = {};

  if (state) filter.state = state;

  const districts = await District.find(filter).populate("state");

  return ApiResponse(res, 200, "Districts fetched", districts);
});

//--------------------Constituency-------------------------

import {Constituency} from "../models/multiSchema.Model.js";

export const createConstituency = asyncHandler(async (req, res) => {
  const { name, district } = req.body;

  const constituency = await Constituency.create({
    name,
    district,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, constituency, "Constituency created"));
});

export const getConstituencies = asyncHandler(async (req, res) => {
  const { district } = req.query;

  const filter = {};

  if (district) filter.district = district;

  const data = await Constituency.find(filter).populate("district");

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Constituencies fetched"));
});

//-----------------Pooling Station ----------------------

import {PollingStation} from "../models/multiSchema.Model.js";

export const createPollingStation = asyncHandler(async (req, res) => {
  const { name, constituency } = req.body;

  const pollingStation = await PollingStation.create({
    name,
    constituency,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, pollingStation, "Polling station created"));
});

export const getPollingStations = asyncHandler(async (req, res) => {
  const { constituency } = req.query;

  const filter = {};

  if (constituency) filter.constituency = constituency;

  const data = await PollingStation.find(filter).populate("constituency");

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Polling stations fetched"));
});