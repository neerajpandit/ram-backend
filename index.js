
import { app } from "./src/app.js";
import connectDB from "./src/database/dbConnection.js";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ENV } from "./src/config/envConfig.js";
import { __dirname,__filename } from "./src/config/constants.js";

// Load environment variables
dotenv.config();

const httpServer = http.createServer(app);

// Start the server (HTTP or HTTPS)
const startServer = async () => {
  
  try {
    await connectDB();
    console.log("MongoDB connected");

    if (process.env.IS_SSL) {
      
      // Attempt to read SSL certificates
      const sslOptions = {
        key: fs.readFileSync(ENV.SSL_KEY_PATH, "utf8"),
        cert: fs.readFileSync(ENV.SSL_CERT_PATH, "utf8"),
        passphrase: ENV.SSL_PASSPHRASE,
      };

      const httpsServer = https.createServer(sslOptions, app);

      httpsServer.listen(ENV.HTTPS_PORT, "0.0.0.0", () => {
        console.log(`⚙️  HTTPS Server running at https://localhost:${ENV.HTTPS_PORT}`);
      });

      httpsServer.on("error", (err) => {
        console.log("❌ HTTPS Server failed to start:", err.message);
        console.log(" Falling back to HTTP server...");

        httpServer.listen(ENV.HTTP_PORT, "0.0.0.0", () => {
          console.log(`⚙️  HTTP Server running at http://localhost:${ENV.HTTP_PORT}`);
        });
      });
    } else {
      httpServer.listen(ENV.HTTP_PORT, "0.0.0.0", () => {
        console.log(`⚙️  HTTP Server running at http://localhost:${ENV.HTTP_PORT}`);
      });
    }
  } catch (err) {
    console.log("❌ Failed to connect to MongoDB:", err);
    process.exit(1); // Exit process if DB connection fails
  }
};

// Global error handling
process.on('uncaughtException', (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer();
