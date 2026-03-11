import mongoose from "mongoose";

const captchaSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: "120s" }, // Creates a TTL index for auto deletion
  },
});

const CAPTCHA = mongoose.model("Captcha", captchaSchema);
export default CAPTCHA;

