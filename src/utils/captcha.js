import CAPTCHA from "../models/captcha.Model.js";

// Validate captcha
const validateCaptchaMiddleware = async (req, res, next) => {
  const { IS_DEV } = process.env;
  try {
    const { captchaInput, captchaToken, from } = req.body;

    if (from?.toLowerCase() === "mobile") {
      return next();
    }

    // Find the captcha using the provided captchaToken
    const captcha = await CAPTCHA.findById(captchaToken);

    await CAPTCHA.findByIdAndDelete(captchaToken);

    if (
      captcha &&
      ((IS_DEV === "true" && captchaInput === "00000") ||
        captcha.text === captchaInput)
    ) {
      return next();
    }
    return res.status(400).json({
        success:false,
        statusCode:400,
        message: "Invalid or expired captcha."
    })
  } catch (err) {
    next(err);
  }
};

export default validateCaptchaMiddleware;
