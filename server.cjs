// server.cjs
const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const yts = require("yt-search");

const app = express();
app.use(cors());

// Test de conexión
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Servidor Musikfy activo con YouTube 🚀" });
});

// Buscar canciones por nombre o artista
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "No query provided" });

  try {
    const result = await yts(query);
    const videos = result.videos.slice(0, 10).map(v => ({
      title: v.title,
      url: v.url,
      image: v.thumbnail,
      duration: v.timestamp,
      author: v.author.name
    }));

    res.json(videos);
  } catch (err) {
    console.error("Error buscando canciones:", err.message);
    res.status(500).json({ error: "Error fetching search results" });
  }
});

// Obtener información y enlace directo al audio
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    const info = await ytdl.getInfo(href);
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    const bestAudio = audioFormats[0]?.url || "";

    res.json({
      title: info.videoDetails.title,
      url: bestAudio,
      image: info.videoDetails.thumbnails.pop().url,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds
    });
  } catch (err) {
    console.error("Error obteniendo track:", err.message);
    res.status(500).json({ error: "Error fetching track info" });
  }
});

// Puerto para Render
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});
