// server.cjs
const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const axios = require("axios");

const app = express();
app.use(cors());

// Test root
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Servidor Musikfy YouTube activo 🚀" });
});

// Buscar videos (YouTube Search)
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const html = await axios
      .get(searchUrl, { headers: { "User-Agent": "Mozilla/5.0" } })
      .then((r) => r.data);

    const videoRegex = /"videoId":"([a-zA-Z0-9_-]{11})","thumbnail"/g;
    const titleRegex = /"title":{"runs":\[\{"text":"(.*?)"\}\]}/g;

    const results = [];
    let matchVideo, matchTitle;
    while ((matchVideo = videoRegex.exec(html)) && (matchTitle = titleRegex.exec(html))) {
      results.push({
        title: matchTitle[1],
        url: `https://www.youtube.com/watch?v=${matchVideo[1]}`,
        type: "track"
      });
      if (results.length >= 10) break;
    }

    res.json(results);
  } catch (err) {
    console.error("Error en búsqueda:", err.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

// 🔹 Corregido: Obtener info y link de audio
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    const info = await ytdl.getInfo(href);

    // Filtramos solo audio
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");

    // Buscar el stream estándar m4a (itag 140), si no, el primero disponible
    const bestAudio = audioFormats.find(f => f.itag === 140) || audioFormats[0];

    res.json({
      title: info.videoDetails.title,
      url: bestAudio.url,
      image: info.videoDetails.thumbnails.pop().url,
      author: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds
    });
  } catch (err) {
    console.error("Error obteniendo track:", err.message);
    res.status(500).json({ error: "Failed to fetch track" });
  }
});

// Puerto dinámico para Render
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});
