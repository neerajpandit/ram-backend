import mongoose from "mongoose";

const stateSchema = new mongoose.Schema({
  nameEn: {
    type: String,
    required: true,
  },

  nameHi: {
    type: String,
    required: true,
  },

  code: {
    type: String,
  },
});

export const State = mongoose.model("State", stateSchema);

//---------------District --------------------

const districtSchema = new mongoose.Schema({
  nameEn: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },

  nameHi: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },

  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "State",
  },
});

export const District = mongoose.model("District", districtSchema);

//------------Constituency-----------
const constituencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "District",
  },
});

export const Constituency = mongoose.model("Constituency", constituencySchema);

//------------Pooling Station ------------

const pollingStationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  constituency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Constituency",
  },
});

export const PollingStation = mongoose.model("PollingStation", pollingStationSchema);