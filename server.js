import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import fs from "fs";
import { stderr, stdout } from "process";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
dotenv.config();

// Define __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:8000";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Serve the downloads directory statically
app.use("/downloads", express.static(path.join(__dirname, "downloads")));
app.use(morgan('dev'));

// Rate limiting middleware
const downloadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // limit each IP to 10 download requests per windowMs
  message: { error: "Too many download requests from this IP, please try again later." }
});

// --- Video deletion logic ---
// (Removed: videoTimers, DELETE_AFTER_MS, scheduleDeletion, markDownloaded, fs.readdir, fs.watch)

// --- Download endpoint for client ---
app.get("/downloads/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(downloadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error("Error sending file:", err.message);
    } else {
      // Delete the file after successful download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Failed to delete ${filename} after download:`, unlinkErr.message);
        } else {
          console.log(`Deleted ${filename} after successful download.`);
        }
      });
    }
  });
});

app.post("/download", downloadLimiter, (req, res) => {
  const { url } = req.body;
  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return res.status(400).json({ error: "Invalid URL format." });
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Only HTTP and HTTPS URLs are allowed." });
  }
  // Optionally, restrict to certain domains (e.g., YouTube, Vimeo, etc.)
  // if (!/youtube\.com|youtu\.be|vimeo\.com/.test(parsedUrl.hostname)) {
  //   return res.status(400).json({ error: "Only YouTube or Vimeo URLs are allowed." });
  // }
  if (!url || typeof url !== "string" || url.trim() === "") {
    return res.status(400).json({ error: "No URL provided" });
  }
  const downloadsDir = path.join(__dirname, "downloads");
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
  const filename = `video-${Date.now()}.mp4`;
  const filePath = path.join(downloadsDir, filename);

  // Use yt-dlp as an array to avoid shell interpolation
  const { spawn } = require('child_process');
  const ytDlp = spawn('yt-dlp', ['-o', filePath, url]);

  ytDlp.on('error', (err) => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(500).json({ error: "yt-dlp failed to start", details: err.message });
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ error: `yt-dlp exited with code ${code}` });
    }
    // Start download to client
    const cleanup = () => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    };
    res.download(filePath, (downloadErr) => {
      if (downloadErr) {
        console.error("Error sending file:", downloadErr.message);
      }
    });
    res.on("finish", cleanup);
    res.on("close", cleanup);
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
