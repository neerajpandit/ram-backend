import path from "path";
import fs from "fs/promises";
import { fileTypeFromBuffer } from "file-type";
import { UPLOAD_DIR } from "../config/constants.js";

const DANGEROUS_EXTS = [
  "jsp",
  "php",
  "asp",
  "aspx",
  "cgi",
  "exe",
  "sh",
  "bat",
  "cmd",
  "msi",
  "vbs",
  "pl",
];

const allowed = {
  mime: ["application/pdf", "image/jpeg", "image/png"],
  ext: ["pdf", "jpg", "jpeg", "png"],
};

function hasDangerousDoubleExt(filename) {
  const parts = (filename || "").toLowerCase().split(".");
  if (parts.length <= 1) return false;
  return parts.slice(0, -1).some((p) => DANGEROUS_EXTS.includes(p));
}

export const validateUploadedFiles = async (req, res, next) => {
  try {
    let filesArray = []; // :white_check_mark: Handle upload.single()

    if (req.file) {
      filesArray = [req.file];
    } else if (Array.isArray(req.files)) {
      // :white_check_mark: Handle upload.array() and upload.any()
      filesArray = req.files;
    } else if (req.files && typeof req.files === "object") {
      // :white_check_mark: Handle upload.fields()
      filesArray = Object.values(req.files).flat();
    }

    if (!filesArray.length) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const savedFiles = {};

    for (const file of filesArray) {
      const originalName = file.originalname; // :no_entry_sign: Block dangerous double extensions

      if (hasDangerousDoubleExt(originalName)) {
        return res.status(400).json({
          message: `Invalid filename "${originalName}".`,
        });
      } // :mag_right: Detect real file type from buffer

      const type = await fileTypeFromBuffer(file.buffer);

      if (!type) {
        return res.status(400).json({
          message: `Could not determine file type of "${originalName}".`,
        });
      }

      if (
        !allowed.mime.includes(type.mime) ||
        !allowed.ext.includes(type.ext)
      ) {
        return res.status(400).json({
          message: `File "${originalName}" is not allowed.`,
        });
      } // :closed_lock_with_key: Strong PDF inspection

      if (type.ext === "pdf") {
        const text = file.buffer.toString(
          "utf8",
          0,
          Math.min(file.buffer.length, 300 * 1024),
        );

        const badTokens = [
          "/JavaScript",
          "/JS",
          "/OpenAction",
          "/AA",
          "/RichMedia",
          "/Launch",
          "/AcroForm",
          "/EmbeddedFile",
          "/SubmitForm",
          "/XFA",
        ];

        if (badTokens.some((token) => text.includes(token))) {
          return res.status(400).json({
            message: `Malicious PDF detected in "${originalName}".`,
          });
        }
      } // :closed_lock_with_key: Generate safe filename

      const safeName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${type.ext}`;

      const targetPath = path.join(UPLOAD_DIR, safeName);

      await fs.writeFile(targetPath, file.buffer, { mode: 0o600 }); // Group by fieldname

      if (!savedFiles[file.fieldname]) {
        savedFiles[file.fieldname] = [];
      }

      savedFiles[file.fieldname].push({
        filename: safeName,
        path: targetPath,
        mime: type.mime,
        size: file.size,
      });
    }

    req.savedFiles = savedFiles;
    next();
  } catch (error) {
    console.error("Upload validation error:", error);
    return res.status(500).json({ message: "Upload validation failed" });
  }
};
