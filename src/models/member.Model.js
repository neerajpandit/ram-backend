import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    formNumber: {
      type: String,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    pinCode: {
      type: String,
    },

    voterId: {
      type: String,
      unique: true,
      sparse: true,
    },

    fatherOrHusbandName: {
      type: String,
    },

    age: {
      type: Number,
    },

    address: {
      type: String,
    },

    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
    },

    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",

    },

    constituency: {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "Constituency",
      type: String,
      trim: true,
    },

    pollingStation: {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "PollingStation",
      type: String,
      trim: true,
    },

    prakoshth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prakoshth",
    },

    location: {
      type: String,
    },

    formDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const Member = mongoose.model("Member", memberSchema);
