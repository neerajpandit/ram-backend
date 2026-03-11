import dotenv from "dotenv";
dotenv.config();

export const ENV = {
    HOST: "0.0.0.0",
    IS_SSL: process.env.IS_SSL === true,
    HTTP_PORT: process.env.httpPORT,
    HTTPS_PORT: process.env.httpsPORT,
    SSL_KEY_PATH: process.env.SSL_SERVER_KEY,
    SSL_CERT_PATH: process.env.SSL_SERVER_CERT,
    SSL_PASSPHRASE: process.env.SSL_PASSPHRASE || "neeraj",
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    isProduction: process.env.NODE_ENV === "",
    isDevelopment: process.env.NODE_ENV === "development",

    // DB settings
    DB_NAME: process.env.DB_NAME,
    MONGODB_URI: process.env.MONGODB_URI,

};
