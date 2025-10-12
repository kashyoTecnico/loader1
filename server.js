import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "AIzaSyCAIiQc5yce1Cyrku5KAFjw1kFwepW9p_g";

// --- Ruta principal ---
app.get("/", (req, res) => {
  res.send("🎵 Musikfy backend activo");
});

// --- BUSCAR videos ---
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta ?q=" });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    const results = data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
      youtube_url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    res.json({ count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al conectar con YouTube API" });
  }
});

// --- STREAMING DE AUDIO ---
app.get("/stream", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "Falta ?id=VIDEO_ID" });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  res.setHeader("Content-Type", "audio/mpeg");

  try {
    const stream = ytdl(url, { filter: "audioonly" });
    ffmpeg(stream)
      .audioBitrate(128)
      .format("mp3")
      .pipe(res, { end: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al reproducir audio" });
  }
});

// --- DESCARGA DE AUDIO ---
app.get("/download", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "Falta ?id=VIDEO_ID" });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  res.setHeader("Content-Disposition", `attachment; filename="${videoId}.mp3"`);
  res.setHeader("Content-Type", "audio/mpeg");

  try {
    const stream = ytdl(url, { filter: "audioonly" });
    ffmpeg(stream)
      .audioBitrate(128)
      .format("mp3")
      .pipe(res, { end: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al descargar audio" });
  }
});

// --- Puerto ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Musikfy backend escuchando en puerto ${PORT}`));
