import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_DIR = path.join(__dirname, "../../../paymentslogs");


const SUB_FOLDERS = ["orders", "payments"];

export const deletePaymentLogsUtil = ({ userId, deleteAll = false } = {}) => {

    try {
        const stat = fs.statSync(LOGS_DIR);
    } catch (err) {
        console.error("Error while accessing:", err);
    }

    if (!fs.existsSync(LOGS_DIR)) {
        
        return { deleted: 0, message: "No paymentlogs folder found." };
    }

    let totalDeleted = 0;

    SUB_FOLDERS.forEach((sub) => {
        const subDir = path.join(LOGS_DIR, sub);
        if (!fs.existsSync(subDir)) return;

        const files = fs.readdirSync(subDir);

        files.forEach((file) => {
            const filePath = path.join(subDir, file);

            // filename without extension
            const baseName = path.basename(file, path.extname(file));

            const shouldDelete =
                deleteAll || (userId && baseName === String(userId));

            if (shouldDelete) {
                fs.unlinkSync(filePath);
                totalDeleted++;
            }
        });
    });

    return {
        deleted: totalDeleted,
        message: "Log deletion process completed.",
    };
};

export const deletePaymentLogs = (req, res) => {
    const { userId, deleteAll } = req.body; // userId -> specific user, deleteAll -> all logs
    const result = deletePaymentLogsUtil({ userId, deleteAll });
    res.status(200).json(result);
};
