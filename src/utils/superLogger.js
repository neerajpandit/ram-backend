import fs from "fs";
import path from "path";
import { __dirname } from "../config/constants.js";

const LOG_ROOT = path.join(__dirname, "logs");


// ensure folders exist
const ensureFolder = (folder) => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
};

[
  "users",
  "modules",
  "modules/utility",
  "modules/applicant",
  "modules/application",
  "modules/payment",
  "modules/files",
  "modules/scheme",
  "modules/property",
].forEach((dir) => ensureFolder(path.join(LOG_ROOT, dir)));



export const superLogger = (req, res, next) => {
    
  const userId = req.user?._id?.toString() || "guest";
  const { method, originalUrl: url } = req;

  const start = new Date();
  const isoTime = start.toISOString();
  const istTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  
  const logDate = start.toISOString().split("T")[0];

  const isWriteAllowed = !["GET"].includes(method);  // <-- ✔ Skip only GET

  // file paths
  const safeUserId = /^[a-f0-9]{24}$/.test(userId) ? userId : "guest";
  const userLogPath = path.join(LOG_ROOT, "users", `${safeUserId}.log`);

  let moduleName ="misc";

  if (url.startsWith("/api/v1/utility")) moduleName = "utility";
  else if (url.startsWith("/api/v1/applicants")) moduleName = "applicant";
  else if (url.startsWith("/api/v1/applications")) moduleName = "application";
  else if (url.startsWith("/api/v1/payments")) moduleName = "payment";
  else if (url.startsWith("/api/v1/users")) moduleName = "users";
  else if (url.startsWith("/api/v1/schemes")) moduleName = "scheme";
  else if (url.startsWith("/api/v1/properties")) moduleName = "property";

  const sanitizeFiles1 = (files) => {
    if (!files) return null;
    const sanitized = {};
    for (const key in files) {
      sanitized[key] = files[key].map((f) => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        encoding: f.encoding,
        mimetype: f.mimetype,
        size: f.size,
        // buffer removed
      }));
    }
    return sanitized;
  };
  const sanitizeFiles = (files) => {
    if (!files) return null;

    const sanitized = {};

    for (const key in files) {
      const fileValue = files[key];

      // If it's a single file object, wrap it in an array
      const arr = Array.isArray(fileValue) ? fileValue : [fileValue];

      sanitized[key] = arr.map((f) => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        encoding: f.encoding,
        mimetype: f.mimetype,
        size: f.size,
      }));
    }

    return sanitized;
  };


  const moduleLogPath = path.join(
    LOG_ROOT,
    "modules",
    moduleName,
    `${logDate}.log`
  );

  // keep original send
  const originalSend = res.send;

  res.send = function (body) {
    try {
      if (isWriteAllowed) {   // <-- ✔ Only write logs for POST/PUT/PATCH/DELETE

        const logObject = {
          isoTime,
          istTime,
          userId,
          method,
          url,
          statusCode: res.statusCode,
          ip: req.ip,
          body: req.body,
          params: req.params,
          query: req.query,
          files: sanitizeFiles(req.files) || null,
          response: body,
        };

        const finalLine = JSON.stringify(logObject) + "\n";

        fs.appendFile(userLogPath, finalLine, () => {});
        fs.appendFile(moduleLogPath, finalLine, () => {});
      }
    } catch (err) {
      console.error("Logger Write Error:", err.message);
    }

    return originalSend.apply(res, arguments);
  };

  next();
};



const errorFolder = path.join(LOG_ROOT, "errors");
if (!fs.existsSync(errorFolder)) fs.mkdirSync(errorFolder, { recursive: true });

export const errorLogger = (err, req, res, next) => {
  try {
    const logDate = new Date().toISOString().split("T")[0];

    const userId = req.user?._id?.toString() || "guest";

    const errorFilePath = path.join(errorFolder, `${logDate}.log`);

    const logObject = {
      type: "ERROR",
      time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      userId,
      method: req.method,
      url: req.originalUrl,
      statusCode: err.statusCode || 500,
      message: err.message,
      stack: err.stack,
      body: req.body,
      params: req.params,
      query: req.query,
    };

    fs.appendFile(errorFilePath, JSON.stringify(logObject) + "\n", () => {});
  } catch (loggingError) {
    console.error("Failed to write to error log:", loggingError);
  }

  next(err); // pass error to next handler
};