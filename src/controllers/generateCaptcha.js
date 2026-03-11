import svgCaptcha from "svg-captcha";
import CAPTCHA from "../models/captcha.Model.js";

// Generate captcha
const generateCaptcha = async (req, res, next) => {
  try {
    const captcha = svgCaptcha.create({
      noise: 0,
      size: 5,
      width: 150,
      height: 50,
      fontSize: 50,
    });
    const newCaptcha = new CAPTCHA({ text: captcha.text });
    await newCaptcha.save();
    res.status(200).json({
      success: true,
      image: Buffer.from(captcha.data).toString("base64"),
      captchaToken: newCaptcha._id,
    });
  } catch (error) {
    next(error);
  }
};

export default generateCaptcha;
