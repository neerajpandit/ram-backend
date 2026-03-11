import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import helmet from "helmet";
import csrf from "csurf";


import {EXPRESS_JSON_LIMIT,EXPRESS_URLENCODED_LIMIT,UPLOAD_DIR, __dirname,} from "./config/constants.js";
import { ENV } from "./config/envConfig.js";
import { errorLogger } from "./utils/superLogger.js";
import { verifyJWT } from "./middlewares/authMiddleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import verifyHmac from "./middlewares/verifyHmac.js";
import setupLogger from "./utils/logger.js";

import routers from "./routes/router.js";


const COOKIE_SECRET_KEY = process.env.ACCESS_TOKEN_SECRET;
const IS_PROD = process.env.IS_SSL;

dotenv.config();
const app = express();

// Logger
const logger = setupLogger(app);

// Trust proxy
app.set("trust proxy", 1);
// Security: Remove powered-by header
app.disable("x-powered-by");

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ENV.CORS_ORIGIN.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "x-signature",
    ],
  }),
);


// Parsers
app.use(express.json({ limit: EXPRESS_JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: EXPRESS_URLENCODED_LIMIT }));

// Cookie parser
app.use(
  cookieParser(COOKIE_SECRET_KEY, {
    httpOnly: true,
    secure: IS_PROD === "true",
    sameSite: "strict",
  })
);

/* -------------------------
   SAFE PATH RESOLUTION
-------------------------- */
export const resolveSafePath = (baseDir, userInput) => {
  const basePath = path.resolve(baseDir);
  const resolvedPath = path.resolve(basePath, userInput);

  if (!resolvedPath.startsWith(basePath + path.sep)) {
    throw new Error("Path traversal detected");
  }

  return resolvedPath;
};

/* -------------------------
   CSRF PROTECTION
-------------------------- */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: IS_PROD ? "true" : "false",
    sameSite: IS_PROD ? "strict" : "none",
  },
});

const CSRF_EXEMPT_ROUTES = [
  /^\/api\/v1\/users\/login$/,
  // In dev/local, exempt all routes
  ...(!IS_PROD ? [/^\//] : []),
];

app.use((req, res, next) => {
  if (CSRF_EXEMPT_ROUTES.some((r) => r.test(req.url))) {
    return next();
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  next();
});
// Route to provide CSRF token to frontend
app.get("/api/v1/csrf-token", csrfProtection, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken(),
  });
});

/* -------------------------
   HMAC VERIFICATION
-------------------------- */
const HMAC_EXEMPT = [
  /^\/api\/v1\/payments\/verify-payment$/,
  /^\/api\/v1\/payments\/verify-status-by-user$/,
  ...(!IS_PROD ? [/^\//] : [])
];

app.use((req,res,next)=>{
  if (req.is("multipart/form-data")) return next();
  if (HMAC_EXEMPT.some(r=>r.test(req.path)) && req.method==="POST")
      return next();
  return verifyHmac(req,res,next);
});


// Helmet Security Middleware
app.use(helmet({ xPoweredBy: true }));
app.use(
  helmet({
    crossOriginEmbedderPolicy: true,
    hidePoweredBy: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://trusted.cdn.com",
        ],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", "data:", "blob:"],
        styleSrc: ["'self'"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_BASE_URL,
          "https://ifsc.razorpay.com",
          "https://api.postalpincode.in",
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],

        fontSrc: ["'self'", "data:"],
        workerSrc: ["'self'", "blob:"],

        formAction: ["'self'"],
        manifestSrc: ["'self'"],

        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: parseInt(process.env.HSTS_MAX_AGE, 10) || 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Clickjacking protection
    frameguard: { action: "deny" },

    // MIME sniffing protection
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
// X-XSS-Protection (Explicit for audit)
app.use((req, res, next) => {
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
});
// Cache-Control (Sensitive Data Protection)
app.use((req, res, next) => {
    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});
// enforce HTTPS in production
if (process.env.IS_SSL) {
  app.use((req, res, next) => {
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      return next();
    }
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}



/* -------------------------
   SECURE STATIC FILES
-------------------------- */
app.use(
  "/files",
  verifyJWT,
  express.static(path.join(__dirname, "public", "uploads"), {
    dotfiles: "deny",
    index: false,
    fallthrough: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'self'");
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  }),
);

/* -------------------------
   SAFE LOG FILE ACCESS
-------------------------- */
app.get("/api/v1/logs/:filename", verifyJWT, (req, res) => {
  try {
    const { filename } = req.params;

    if (!/^[a-zA-Z0-9._-]+\.log$/.test(filename)) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const baseDir = path.resolve(__dirname, "logs");
    const safePath = resolveSafePath(baseDir, filename);

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ message: "Log not found" });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", "inline");


    return res.sendFile(safePath);
  } catch {
    return res.status(403).json({ message: "Forbidden" });
  }
});

app.get("/api/v2/logs/:filename", verifyJWT, (req, res) => {
  try {
    const { filename } = req.params;

    if (!/^[a-zA-Z0-9._-]+\.log$/.test(filename)) {
      return res.status(400).send("Invalid filename");
    }

    const baseDir = path.resolve(__dirname, "logs");
    const safePath = resolveSafePath(baseDir, filename);

    if (!fs.existsSync(safePath)) {
      return res.status(404).send("Log not found");
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", "inline");


    const stream = fs.createReadStream(safePath, {
      encoding: "utf8",
      highWaterMark: 64 * 1024,
    });

    stream.pipe(res);
  } catch {
    return res.status(403).send("Forbidden");
  }
});



app.get("/api/v1/logs", verifyJWT, (req, res) => {
  try {
    const baseDir = path.resolve(__dirname, "logs");

    if (!fs.existsSync(baseDir)) {
      return res.status(404).json({ message: "Logs directory not found" });
    }

    const files = fs
      .readdirSync(baseDir)
      .filter((f) => /^[a-zA-Z0-9._-]+\.log$/.test(f));

    return res.json({
      success: true,
      total: files.length,
      logs: files.map((f) => ({
        filename: f,
        url: `/api/v1/logs/${f}`,
      })),
    });
  } catch {
    return res.status(500).json({ message: "Failed to read logs" });
  }
});


export const UPLOAD_FOLDERS = {
  "applicant-documents": path.join(UPLOAD_DIR, "applicant-documents"),
  applicantPhoto: path.join(UPLOAD_DIR, "applicant-photos"),
  applicantSignature: path.join(UPLOAD_DIR, "applicant-signatures"),
  bplCertificate: path.join(UPLOAD_DIR, "applicant-bpl-cards"),
  casteCertificate: path.join(UPLOAD_DIR, "applicant-caste-certificates"),
  affidavitCertificate: path.join(UPLOAD_DIR, "applicant-affidavits"),
  aadhaarCard: path.join(UPLOAD_DIR, "applicant-aadhaar-cards"),
  incomeCertificate: path.join(UPLOAD_DIR, "applicant-income-certificates"),
  horizontalCertificate: path.join(
    UPLOAD_DIR,
    "applicant-horizontal-certificates"
  ),
  brochure: path.join(UPLOAD_DIR, "scheme-brochures"),
};

app.get("/api/v1/files/:type/:filename", verifyJWT, (req, res) => {
  try {
    const { type, filename } = req.params;

    if (!/^[A-Za-z0-9._-]{1,255}$/.test(filename)) {
      return res.status(400).json({ message: "Invalid filename" });
    }
    const ALLOWED_UPLOAD_TYPES = Object.freeze([
      "applicant-documents",
      "applicantPhoto",
      "applicantSignature",
      "bplCertificate",
      "casteCertificate",
      "affidavitCertificate",
      "aadhaarCard",
      "incomeCertificate",
      "horizontalCertificate",
      "brochure",
    ]);

    if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid folder type" });
    }

    const folderPath = UPLOAD_FOLDERS[type];

    if (!folderPath) {
      return res.status(400).json({ message: "Invalid folder type" });
    }

    const safePath = resolveSafePath(folderPath, filename);

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");

    return res.sendFile(safePath);
  } catch {
    return res.status(403).json({ message: "Forbidden" });
  }
});


app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "src", "views", "index.html"));
});
// Routes
app.get("/api/v1/", (_, res) =>
  res.json({ message: "Welcome to the Node.js server!" })
);

app.use("/api",routers);


app.use("/assets", express.static(path.join(__dirname, "src/views/assets")));

app.get("/dashboard/logs", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "views", "logs-dashboard.html"));
});


app.use(errorLogger);
// After routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export { app };
