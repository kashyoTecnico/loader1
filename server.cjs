// server.cjs
const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const yts = require("yt-search");

const app = express();
app.use(cors());

// Test root
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Servidor Musikfy YouTube activo 🚀" });
});

// 🔹 Buscar videos (YouTube Search)
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if(!query) return res.json([]);

  try {
    const r = await yts(query);
    const videos = r.videos.slice(0, 10).map(v => ({
      id: v.videoId,
      title: v.title,
      author: v.author.name,
      duration: v.timestamp,
      thumbnail: v.thumbnail,
      url: `/track?id=${v.videoId}`
    }));
    res.json(videos);
  } catch (err) {
    console.error("Error en búsqueda:", err.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

// 🔹 Obtener URL directa de audio de YouTube
app.get("/track", async (req, res) => {
  const videoId = req.query.id;
  if(!videoId) return res.status(400).json({ error: "No video ID provided" });

  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    const bestAudio = audioFormats.find(f => f.itag === 140) || audioFormats[0];

    res.json({
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      image: info.videoDetails.thumbnails.pop().url,
      audioUrl: bestAudio.url
    });
  } catch (err) {
    console.error("Error obteniendo track:", err.message);
    res.status(500).json({ error: "Failed to fetch track audio" });
  }
});

// Puerto
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});
