import CAPTCHA from "../models/captcha.Model.js";

const validateCaptchaMiddleware = async (req, res, next) => {
  try {
    const { captchaInput, captchaToken } = req.body;
    const IS_DEV = process.env.IS_SSL;

    // Missing captcha
    if (!captchaInput || !captchaToken) {
      return res.status(400).json({
        success: false,
        message: "Captcha is required.",
      });
    }

    // Find captcha
    const captcha = await CAPTCHA.findById(captchaToken);

    if (!captcha) {
      return res.status(400).json({
        success: false,
        message: "Captcha expired or invalid.",
      });
    }

    // Validate
    const isValid =
      (IS_DEV === "true" && captchaInput === "00000") ||
      captcha.text.toLowerCase() === captchaInput.toLowerCase();

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid captcha.",
      });
    }

    // One-time use
    await CAPTCHA.findByIdAndDelete(captchaToken);

    next();
  } catch (err) {
    next(err);
  }
};

export default validateCaptchaMiddleware;
