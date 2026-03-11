import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Cache for user-specific loggers
const userLoggers = new Map();

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
        console.log('Logs directory created:', logsDir);
    }
} catch (error) {
    console.error('Failed to create logs directory:', error.message);
}

// Custom format to display logData with each key-value pair on a new line
const separatorFormat1 = winston.format.printf(({ message, timestamp, ...rest }) => {
    const logData = { timestamp, message, ...rest };
    // Format logData with each key-value pair on a new line
    const formattedLog = Object.entries(logData)
        .map(([key, value]) => {
            // Stringify nested objects with indentation for readability
            if (typeof value === 'object' && value !== null) {
                return `"${key}": ${JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')}`;
            }
            return `"${key}": ${JSON.stringify(value)}`;
        })
        .join(',\n');
    // Wrap in curly braces to maintain JSON structure
    const logEntry = `{\n${formattedLog}\n}`;
    return `${logEntry}\n-------------------------------`;
});

const separatorFormat = winston.format.printf(({ timestamp, level, message, ...rest }) => {
  const logData = {
    timestamp,
    level,
    message,
    ...rest,
  };
  const logEntry = JSON.stringify(logData);
  return logEntry + '\n-------------------------------';
}  );

// Configure Winston logger for success and error logs
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        separatorFormat
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'success.log'),
            level: 'info',
            handleExceptions: true
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            handleExceptions: true
        }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Function to create or get user-specific logger
const getUserLogger = (userId) => {
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const userLogFile = path.join(logsDir, `${sanitizedUserId}.log`);

    if (userLoggers.has(sanitizedUserId)) {
        console.log(`Reusing existing logger for user ${sanitizedUserId}: ${userLogFile}`);
        return userLoggers.get(sanitizedUserId);
    }

    try {
        const userLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                separatorFormat
            ),
            transports: [
                new winston.transports.File({
                    filename: userLogFile,
                    handleExceptions: true,
                    flags: 'a'
                })
            ]
        });

        userLoggers.set(sanitizedUserId, userLogger);
        console.log(`Created new logger for user ${sanitizedUserId}: ${userLogFile}`);
        return userLogger;
    } catch (error) {
        console.error(`Failed to create logger for user ${sanitizedUserId}:`, error.message);
        return logger;
    }
};

// Reusable logging function for controllers
const logActivity = (req, res, controllerName, action,  additionalData = {}) => {
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;
    const user = req.user || {};
    const role = user.role || "unknown";
    const userId = req.user?.id ?? req.body?.userId ?? 'anonymous';
    const logData = {
        controller: controllerName,
        action,
        userId,
        role,
        ip,
        method,
        url,
        status,
        request: {
            // headers: req.headers,
            body: { ...req.body, password: "REDACTED" },
            params: req.params,
            query: req.query,
        },
        response: {
            status,
        },
        ...additionalData,
    };

    try {
        if (status >= 400) {
            logger.error(logData);
        } else {
            logger.info(logData);
        }

        const userLogger = getUserLogger(userId);
        userLogger.info(logData);
    } catch (error) {
        console.error('Logging failed:', error.message, logData);
    }
};

export { logActivity };













import morgan from "morgan";
import moment from "moment-timezone";

import { __dirname,__filename, UPLOAD_DIR_LOGS } from "../config/constants.js";


/* --------------------------------------------------
   Ensure log directory exists
-------------------------------------------------- */
const logDirectory = path.join(UPLOAD_DIR_LOGS);
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

/* --------------------------------------------------
   Create log streams by HTTP method
-------------------------------------------------- */
const getLogStream = fs.createWriteStream(path.join(logDirectory, "GET.log"), {
  flags: "a",
});
const postLogStream = fs.createWriteStream(
  path.join(logDirectory, "POST.log"),
  { flags: "a" }
);
const putLogStream = fs.createWriteStream(path.join(logDirectory, "PUT.log"), {
  flags: "a",
});
const deleteLogStream = fs.createWriteStream(
  path.join(logDirectory, "DELETE.log"),
  { flags: "a" }
);
// 🔴 Error log file
const errorLogStream = fs.createWriteStream(
  path.join(logDirectory, "ERROR.log"),
  { flags: "a" }
);

/* --------------------------------------------------
   Binary detection helpers
-------------------------------------------------- */
const isBinaryContentType = (res) => {
  const ct = res.getHeader("content-type");
  if (!ct) return false;

  return (
    ct.includes("application/octet-stream") ||
    ct.includes("application/pdf") ||
    ct.includes("image/") ||
    ct.includes("video/") ||
    ct.includes("audio/") ||
    ct.includes("application/zip") ||
    ct.includes("application/vnd") ||
    ct.includes("multipart/form-data")
  );
};

const isProbablyBinary = (text) => {
  if (!text) return false;
  return /[\x00-\x08\x0E-\x1F\x7F]/.test(text);
};
/* --------------------------------------------------
   Middleware to capture response body
-------------------------------------------------- */
const captureResponseBody = (req, res, next) => {
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];

  res.write = function (chunk, ...args) {
    chunks.push(Buffer.from(chunk));
    return oldWrite.apply(res, [chunk, ...args]);
  };

  res.end = function (chunk, ...args) {
    if (chunk) chunks.push(Buffer.from(chunk));

    const buffer = Buffer.concat(chunks);

    if (isBinaryContentType(res)) {
      res.body = `[BINARY DATA: ${res.getHeader("content-type")}]`;
    } else {
      const text = buffer.toString("utf8");

      if (isProbablyBinary(text)) {
        res.body = "[BINARY DATA DETECTED]";
      } else {
        res.body =
          text.length > 3000 ? text.slice(0, 3000) + "...[truncated]" : text;
      }
    }

    return oldEnd.apply(res, [chunk, ...args]);
  };

  next();
};

/* --------------------------------------------------
   Morgan Custom Tokens
-------------------------------------------------- */
morgan.token("ist-date", () =>
  moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
);

morgan.token("request-body", (req) =>
  req.body && Object.keys(req.body).length
    ? JSON.stringify(req.body)
    : "No Body"
);

morgan.token("response-body", (req, res) =>
  res.body ? res.body : "No Response Body"
);

/* --------------------------------------------------
   Morgan Log Format
-------------------------------------------------- */
const customMorganFormat =
  `[:ist-date] :method :url :status\n` +
  `IP: :remote-addr\n` +
  `User-Agent: :user-agent\n` +
  `Response Time: :response-time ms\n` +
  `Request Body: :request-body\n` +
  `Response Body: :response-body\n` +
  `--------------------------------------------------\n`;

/* --------------------------------------------------
   Helper: detect failure
-------------------------------------------------- */
const isFailureResponse = (req, res) => {
  // HTTP error
  if (res.statusCode >= 400) return true;

  // success:false in JSON body
  try {
    const body = JSON.parse(res.body || "{}");
    if (body.success === false) return true;
  } catch {
    // ignore JSON parse error
  }

  return false;
};

/* --------------------------------------------------
   Setup Logger
-------------------------------------------------- */
function setupLogger(app) {
  // Capture response body FIRST
  app.use(captureResponseBody);

  // Method-based log files
  app.use((req, res, next) => {
    let stream;

    switch (req.method) {
      case "GET":
        stream = getLogStream;
        break;
      case "POST":
        stream = postLogStream;
        break;
      case "PUT":
        stream = putLogStream;
        break;
      case "DELETE":
        stream = deleteLogStream;
        break;
      default:
        stream = null;
    }

    if (stream) {
      morgan(customMorganFormat, { stream: stream })(req, res, () => {
        // AFTER response finished
        res.on("finish", () => {
          if (isFailureResponse(req, res)) {
            const logLine = morgan.compile(customMorganFormat)(
              morgan,
              req,
              res
            );
            errorLogStream.write(logLine);
          }
        });

        next();
      });
    } else {
      next();
    }
  });

  // Console logging in development
  if (!process.env.IS_SSL) {
    app.use(morgan(customMorganFormat));
  }
}

export default setupLogger;
