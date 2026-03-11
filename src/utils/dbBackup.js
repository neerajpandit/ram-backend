
import mongoose from "mongoose";
import archiver from "archiver";
import { EJSON } from "bson";
import fs from "fs-extra";
import path from "path";
import cron from "node-cron";
import dotenv from "dotenv";
import { UPLOAD_DIR_BACKUP } from "../config/constants.js";

dotenv.config();

// ------------------ Core backup function ------------------
export const backupMongoCollectionsToStream = async (stream) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB not connected");
  }

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(stream);

  for (const col of collections) {
    const docs = await db.collection(col.name).find({}).toArray();
    const json = EJSON.stringify(docs, null, 2);
    archive.append(json, { name: `${col.name}.json` });
  }

  await archive.finalize();
};

// ------------------ Express download ------------------
export const autoDownloadMongoBackup = async (req, res) => {
  try {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=mongo-backup-${Date.now()}.zip`
    );

    await backupMongoCollectionsToStream(res);
  } catch (err) {
    console.error("❌ Backup failed:", err);
    res.status(500).json({ message: "Backup failed", error: err.message });
  }
};

// ------------------ Cron job save to file ------------------
export const saveMongoBackupToFile = async (
  backupDir,
  type,
  maxBackups = 7
) => {
  fs.ensureDirSync(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${type}-backup-${timestamp}.zip`;
  const filePath = `${backupDir}/${filename}`;


  const output = fs.createWriteStream(filePath);
  await backupMongoCollectionsToStream(output);


  // Cleanup old backups
  const files = await fs.readdir(backupDir);
  const backupFiles = files
    .filter((f) => f.endsWith(".zip"))
    .sort(
      (a, b) =>
        fs.statSync(path.join(backupDir, a)).mtimeMs -
        fs.statSync(path.join(backupDir, b)).mtimeMs
    );

  if (backupFiles.length > maxBackups) {
    const toDelete = backupFiles.slice(0, backupFiles.length - maxBackups);
    for (const file of toDelete) {
      await fs.remove(path.join(backupDir, file));
      // console.log(`🗑 Removed old backup: ${file}`);
    }
  }
};


// ------------------ Config ------------------
const HOURLY_MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS) || 24;
const DAILY_MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS) || 7;
const WEEKLY_MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS) || 5;
const HOURLY_DIR = path.join(UPLOAD_DIR_BACKUP, "hourly");
const DAILY_DIR = path.join(UPLOAD_DIR_BACKUP, "daily");
const WEEKLY_DIR = path.join(UPLOAD_DIR_BACKUP, "weekly");

// Ensure directories exist
fs.ensureDirSync(HOURLY_DIR);
fs.ensureDirSync(DAILY_DIR);
fs.ensureDirSync(WEEKLY_DIR);

// ------------------ Schedule backups ------------------

cron.schedule(process.env.CRON_HOURLY, () =>
  saveMongoBackupToFile(HOURLY_DIR, "hourly", HOURLY_MAX_BACKUPS)
);

// Daily Backup
cron.schedule(
  process.env.CRON_DAILY,
  () => saveMongoBackupToFile(DAILY_DIR, "daily", DAILY_MAX_BACKUPS)
);

// Weekly Backup
// cron.schedule(
//   process.env.CRON_WEEKLY,
//   () => saveMongoBackupToFile(WEEKLY_DIR, "weekly", WEEKLY_MAX_BACKUPS)
// );

console.log("Backup cron jobs scheduled!");
