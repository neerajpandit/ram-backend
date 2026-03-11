import crypto from "crypto";
import CryptoJS from "crypto-js";
const SECRET_KEY = process.env.HMAC_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error(":x: SECRET_KEY missing in backend environment");
}

/* ============================
   HMAC GENERATOR
============================ */
export const generateHmac = (payload) => {
  return crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");
};
/* ============================
   AES DECRYPT
============================ */
export const decryptData = (cipherText) => {
  if (!cipherText) return "";
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
