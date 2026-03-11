import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {UPLOAD_DIR} from "../config/constants.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadPath = UPLOAD_DIR;
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Use memory storage to prevent saving files to disk until transaction commits
const storage = multer.memoryStorage();

// File filter to accept images and documents
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
        // "application/msword", // .doc
        // "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Invalid file type. Only JPEG, PNG, JPG, PDF, DOC, and DOCX are allowed."
            )
        );
    }
};

// Initialize the Multer middleware
export const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024, files: 10 }, // 10MB per file, max 10 files
    fileFilter,
});
