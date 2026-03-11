import CAPTCHA from "../models/captcha.Model.js";
import svgCaptcha from "svg-captcha";

export const generateCaptcha = () => {
  return svgCaptcha.create({
    size: 5,
    noise: 3,
    color: true,
    background: "#f4f4f4",
    ignoreChars: "0o1il",
  });
};

export const createCaptcha = async (req, res, next) => {
  try {
    const captcha = generateCaptcha();

    const savedCaptcha = await CAPTCHA.create({
      text: captcha.text,
    });

    return res.status(201).json({
      success: true,
      captchaToken: savedCaptcha._id,
      image: captcha.data, // SVG image
    });
  } catch (err) {
    next(err);
  }
};
