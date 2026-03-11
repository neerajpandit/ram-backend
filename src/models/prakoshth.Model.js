import mongoose from "mongoose";

const prakoshthSchema = new mongoose.Schema(
  {
    nameEn: {
      type: String,
      required: true,
    },

    nameHi: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Prakoshth = mongoose.model("Prakoshth", prakoshthSchema);
