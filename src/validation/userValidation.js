import Joi from "joi";

export const registerUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
  }),
  role: Joi.string().valid("0", "1", "2", "3", "4", "5").required().messages({
    "any.only": "Role must be one of SuperAdmin, Teacher, Student, or Parent",
  }),
});
