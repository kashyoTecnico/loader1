// server.cjs
const express = require("express");
const cors = require("cors");
const { Youtube } = require("youtube-explode");

const app = express();
app.use(cors());

const yt = new Youtube();

// Root test
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Servidor Musikfy YouTube activo 🚀" });
});

// Buscar videos
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const videos = await yt.search(query, { type: "video" });
    const results = videos.map(video => ({
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      image: video.thumbnails.length > 0 ? video.thumbnails[0].url : "",
      type: "track"
    }));
    res.json(results);
  } catch (err) {
    console.error("Error buscando videos:", err.message);
    res.status(500).json({ error: "Failed to fetch videos from YouTube" });
  }
});

// Obtener info de un video
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    const videoId = href.split("v=")[1];
    const video = await yt.getVideo(videoId);
    const manifest = await yt.getVideoStreams(videoId);
    const audioStream = manifest.audio[0]; // primer stream de audio

    res.json({
      title: video.title,
      url: audioStream.url,
      image: video.thumbnails.length > 0 ? video.thumbnails[0].url : ""
    });
  } catch (err) {
    console.error("Error obteniendo track:", err.message);
    res.status(500).json({ error: "Failed to fetch track info" });
  }
});

// Puerto dinámico
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server YouTube running on port ${port}`);
});
