// import express from "express";
// import fs from "fs";
// import path from "path";
// import { __dirname } from "../config/constants.js";

// const router = express.Router();
// const logsPath = path.join(__dirname, "logs");

// // List all logs
// router.get("/", (req, res) => {
//   if (!fs.existsSync(logsPath)) {
//     return res
//       .status(404)
//       .json({ success: false, message: "Logs folder not found" });
//   }

//   const files = fs.readdirSync(logsPath);
//   res.json({ success: true, files });
// });
// router.get("/users/", (req, res) => {
//   if (!fs.existsSync(logsPath)) {
//     return res.status(404).json({
//       success: false,
//       message: "Logs folder not found",
//     });
//   }

//   const categories = fs
//     .readdirSync(logsPath)
//     .filter((item) => fs.lstatSync(path.join(logsPath, item)).isDirectory());

//   res.json({ success: true, categories });
// });

// // Read any log file
// router.get("/:file", (req, res) => {
//   const fileName = req.params.file;
//   const fullPath = path.join(logsPath, fileName);

//   if (!fs.existsSync(fullPath)) {
//     return res
//       .status(404)
//       .json({ success: false, message: "Log file not found" });
//   }

//   const content = fs.readFileSync(fullPath, "utf8");
//   res.setHeader("Content-Type", "text/plain");
//   res.send(content);
// });

// // Download log file
// router.get("/download/:file", (req, res) => {
//   const fileName = req.params.file;
//   const fullPath = path.join(logsPath, fileName);

//   if (!fs.existsSync(fullPath)) {
//     return res
//       .status(404)
//       .json({ success: false, message: "Log file not found" });
//   }

//   res.download(fullPath);
// });


// // Get available log categories (folders)
// router.get("/users/", (req, res) => {
//   if (!fs.existsSync(logsPath)) {
//     return res.status(404).json({
//       success: false,
//       message: "Logs folder not found",
//     });
//   }

//   const categories = fs
//     .readdirSync(logsPath)
//     .filter((item) => fs.lstatSync(path.join(logsPath, item)).isDirectory());

//   res.json({ success: true, categories });
// });

// // List all files in a category
// router.get("/users/:category", (req, res) => {
//   const category = req.params.category;
//   const categoryPath = path.join(logsPath, category);

//   if (!fs.existsSync(categoryPath)) {
//     return res.status(404).json({
//       success: false,
//       message: `Category '${category}' not found`,
//     });
//   }
//   let files;
// if (category === "modules") {
//   const modules = fs.readdirSync(categoryPath);

//   const moduleLogs = {};

//   modules.forEach((moduleName) => {
//     const modulePath = path.join(categoryPath, moduleName);

//     if (fs.statSync(modulePath).isDirectory()) {
//       moduleLogs[moduleName] = fs
//         .readdirSync(modulePath)
//         .filter((file) => file.endsWith(".log"));
//     }
//   });

//   return res.json({
//     success: true,
//     category,
//     modules: moduleLogs,
//   });
// } else {
//   files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".log"));
// }
//   res.json({ success: true, category, files });
// });
// router.get("/users/modules/:moduleName/:fileName", (req, res) => {
//   const { moduleName, fileName } = req.params;

//   // 🔐 prevent directory traversal
//   if (!fileName.endsWith(".log")) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid log file",
//     });
//   }

//   const filePath = path.join(logsPath, "modules", moduleName, fileName);

//   if (!fs.existsSync(filePath)) {
//     return res.status(404).json({
//       success: false,
//       message: "Log file not found",
//     });
//   }

//   const content = fs.readFileSync(filePath, "utf-8");

//   res.json({
//     success: true,
//     module: moduleName,
//     file: fileName,
//     content: content.split("\n").filter(Boolean), // line by line
//   });
// });

// // Read a specific log file from a category
// router.get("/users/:category/:file", (req, res) => {
//   const { category, file } = req.params;
//   const fullPath = path.join(logsPath, category, file);

//   if (!fs.existsSync(fullPath)) {
//     return res.status(404).json({
//       success: false,
//       message: `Log file '${file}' not found in '${category}'`,
//     });
//   }

//   const content = fs.readFileSync(fullPath, "utf8");

//   res.setHeader("Content-Type", "text/plain");
//   res.send(content);
// });

// // Download a log file
// router.get("/:category/download/:file", (req, res) => {
//   const { category, file } = req.params;
//   const fullPath = path.join(logsPath, category, file);

//   if (!fs.existsSync(fullPath)) {
//     return res.status(404).json({
//       success: false,
//       message: `Log file '${file}' not found in '${category}'`,
//     });
//   }

//   res.download(fullPath);
// });


// export default router;


import express from "express";
import fs from "fs";
import path from "path";
import { __dirname } from "../config/constants.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { resolveSafePath } from "../utils/safePath.js";

const router = express.Router();

/* ------------------------------------
   FIXED BASE LOG DIRECTORY
------------------------------------ */
const BASE_LOG_DIR = path.resolve(__dirname, "logs");

/* ------------------------------------
   HELPERS
------------------------------------ */
const isValidName = (name) => /^[a-zA-Z0-9._-]+$/.test(name);
const isLogFile = (name) => /^[a-zA-Z0-9._-]+\.log$/.test(name);

/* ------------------------------------
   LIST ROOT LOG FILES
------------------------------------ */
router.get("/", verifyJWT, (req, res) => {
  try {
    if (!fs.existsSync(BASE_LOG_DIR)) {
      return res.status(404).json({ message: "Logs directory not found" });
    }

    const files = fs.readdirSync(BASE_LOG_DIR).filter(isLogFile);

    res.json({ success: true, files });
  } catch {
    res.status(500).json({ message: "Failed to list logs" });
  }
});

/* ------------------------------------
   LIST LOG CATEGORIES (FOLDERS)
------------------------------------ */
router.get("/users", verifyJWT, (req, res) => {
  try {
    const categories = fs
      .readdirSync(BASE_LOG_DIR)
      .filter((dir) => fs.statSync(path.join(BASE_LOG_DIR, dir)).isDirectory());

    res.json({ success: true, categories });
  } catch {
    res.status(500).json({ message: "Failed to read categories" });
  }
});

/* ------------------------------------
   LIST FILES IN CATEGORY
------------------------------------ */
router.get("/users/:category", verifyJWT, (req, res) => {
  try {
    const { category } = req.params;
    if (!isValidName(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const categoryPath = resolveSafePath(BASE_LOG_DIR, category);

    const files = fs.readdirSync(categoryPath).filter(isLogFile);

    res.json({ success: true, category, files });
  } catch {
    res.status(404).json({ message: "Category not found" });
  }
});

/* ------------------------------------
   READ LOG FILE (CATEGORY)
------------------------------------ */
router.get("/users/:category/:file", verifyJWT, (req, res) => {
  try {
    const { category, file } = req.params;

    if (!isValidName(category) || !isLogFile(file)) {
      return res.status(400).json({ message: "Invalid path" });
    }

    const filePath = resolveSafePath(path.join(BASE_LOG_DIR, category), file);

    const content = fs.readFileSync(filePath, "utf8");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");

    res.send(content);
  } catch {
    res.status(404).json({ message: "Log file not found" });
  }
});

/* ------------------------------------
   DOWNLOAD LOG FILE
------------------------------------ */
router.get("/users/:category/download/:file", verifyJWT, (req, res) => {
  try {
    const { category, file } = req.params;

    if (!isValidName(category) || !isLogFile(file)) {
      return res.status(400).json({ message: "Invalid path" });
    }

    const filePath = resolveSafePath(path.join(BASE_LOG_DIR, category), file);

    res.download(filePath);
  } catch {
    res.status(404).json({ message: "Log file not found" });
  }
});

export default router;
