import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import fs from "fs";
import { stderr, stdout } from "process";

// Define __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Serve the downloads directory statically
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

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

app.post("/download", (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string" || url.trim() === "") {
    return res.status(400).json({ error: "No URL provided" });
  }
  const downloadsDir = path.join(__dirname, "downloads");
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
  const filename = `video-${Date.now()}.mp4`;
  const filePath = path.join(downloadsDir, filename);

  exec(`yt-dlp -o "${filePath}" "${url}"`, (err, stdout, stderr) => {
    if (err) {
      console.error("Download failed:", stderr);
      // If a partial file was created, delete it
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({
        error: "Download failed",
        details: stderr || err.message,
      });
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

app.listen(8000, () => console.log("Server running on http://localhost:8000"));
