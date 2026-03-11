import { fileURLToPath } from "url";
import path from "path";

/* ------------------------------------
   Resolve __dirname safely (ESM)
------------------------------------ */
export const __filename = fileURLToPath(import.meta.url);
const __currentDir = path.dirname(__filename);

// Project root (two levels up from config/)
export const __dirname = path.resolve(__currentDir, "../../");

/* ------------------------------------
   Express body parser limits
------------------------------------ */
export const EXPRESS_JSON_LIMIT = "50mb";
export const EXPRESS_URLENCODED_LIMIT = "50mb";

/* ------------------------------------
   Upload & file size limits
------------------------------------ */
export const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

/* ------------------------------------
   Base upload directories
------------------------------------ */
export const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
export const UPLOAD_DIR_IMAGES = path.join(UPLOAD_DIR, "images");

/* ------------------------------------
   Logs directory (NOT public)
------------------------------------ */
export const UPLOAD_DIR_LOGS = path.join(__dirname, "logs");

/* ------------------------------------
   Applicant uploads (NO leading slash)
------------------------------------ */
export const APPLICANT_DOC_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-documents",
);
export const APPLICANT_PHOTO_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-photos",
);
export const APPLICANT_SIGNATURE_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-signatures",
);
export const APPLICANT_BPL_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-bpl-cards",
);
export const APPLICANT_CASTE_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-caste-certificates",
);
export const APPLICANT_AFFIDAVIT_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-affidavits",
);
export const APPLICANT_AADHAAR_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-aadhaar-cards",
);
export const APPLICANT_INCOME_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-income-certificates",
);
export const APPLICANT_HORIZONTAL_UPLOADS = path.join(
  UPLOAD_DIR,
  "applicant-horizontal-certificates",
);

/* ------------------------------------
   Scheme uploads
------------------------------------ */
export const SCHEME_AFFIDAVIT_UPLOADS = path.join(
  UPLOAD_DIR,
  "scheme-affidavits",
);
export const SCHEME_BROCHURE_UPLOADS = path.join(
  UPLOAD_DIR,
  "scheme-brochures",
);

/* ------------------------------------
   Backup directory (restricted)
------------------------------------ */
export const UPLOAD_DIR_BACKUP = path.join(__dirname, "mongodb_backups");

/* ------------------------------------
   Rate limiting (AUDIT SAFE)
------------------------------------ */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100; // per IP
export const RATE_LIMIT_MESSAGE = "Too many requests, please try again later.";
