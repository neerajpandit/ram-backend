import express from "express";
import { verifyJWT,isAdmin } from "../middlewares/authMiddleware.js";
import { superLogger } from "../utils/superLogger.js";
import { isValidAadhaar } from "../utils/aadhaarValidator.js";


const router = express.Router();

router.use(superLogger);

router.post("/validate-aadhaar", (req, res) => {
  const { aadhaar } = req.body;

  if (!aadhaar)
    return res.status(400).json({ error: "Aadhaar number is required" });

  const isValid = isValidAadhaar(aadhaar);

  res.json({ aadhaar, isValid });
});



export default router;
