import crypto from "crypto";

// Function to convert formdata into string
const formDataToString = (body, files) => {
  const sortedEntries = [];

  // Handle text fields (req.body)
  Object.keys(body).forEach((key) => {
    sortedEntries.push(`${key}=${body[key]}`);
  });

  // Handle file fields (req.files)
  if (files) {
    Object.keys(files).forEach((key) => {
      const fileArray = files[key];
      const fieldName = fileArray[0].fieldname;

      // Generate a string for each file name in the array
      const fileNames = fileArray
        .map((file) => file.originalname)
        .join("&" + fieldName + "=");

      // Add the concatenated file names to the sortedEntries array
      sortedEntries.push(`${fieldName}=${fileNames}`);
    });
  }

  sortedEntries.sort(); // Sort for consistency
  return sortedEntries.join("&");
};

const verifyHmac = (req, res, next) => {
  const SECRET_KEY = process.env.ACCESS_TOKEN_SECRET;
  if (req.url.includes("/csrf-token") || req.method === "GET" || req.files) {
    return next();
  }

  const receivedHash = req.headers["x-signature"] || req.headers["X-Signature"];
  if (!receivedHash) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Missing HMAC signature",
    });
  }

  try {
    let payloadString;

    if (req.is("multipart/form-data")) {
      // Handle FormData
      payloadString = formDataToString(req.body, req.files);
    } else if (req.body && Object.keys(req.body).length > 0) {
      // Handle JSON requests (ensure there's actual content in body)
      payloadString = JSON.stringify(req.body);
    }

    // In case the payload is empty, we use an empty string (""),
    if (!payloadString) {
      payloadString = ""; // Make sure payloadString is empty for empty bodies
    }

    // Compute HMAC hash
    const computedHash = crypto.createHmac("sha256", SECRET_KEY)
      .update(payloadString)
      .digest("hex");

    if (computedHash !== receivedHash) {
            return res.status(403).json({
              success: false,
              statusCode: 403,
              message: "Payload integrity check failed! Possible tampering.",
            });
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default verifyHmac;


