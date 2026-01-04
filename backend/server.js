require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const Groq = require("groq-sdk");

const app = express();
app.use(cors());

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    console.log("Incoming file:", file);
    cb(null, true); // accept all files
  },
});


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


app.post("/api/voice-query", upload.single("audio"), async (req, res) => {
  console.log("Received file:", req.file);
  if (!req.file) {
  return res.status(400).json({ error: "No file received" });
  }

  try {
    const filePath = req.file.path;

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
    });

    const text = transcription.text;


    fs.unlinkSync(filePath);

    res.json({ text });
  } catch (err) {
    console.error("Whisper error:", err);
    res.status(500).json({ error: "Speech recognition failed" });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Backend running on http://0.0.0.0:3000");
});

