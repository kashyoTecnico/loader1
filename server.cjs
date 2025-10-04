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

// 🔹 Buscar videos (YouTube Search) – versión corregida
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    // Extraer JSON de ytInitialData
    const ytInitialDataMatch = html.match(/var ytInitialData = (.*?);<\/script>/);
    if (!ytInitialDataMatch) return res.json([]);

    const ytInitialData = JSON.parse(ytInitialDataMatch[1]);

    const videos = [];
    const contents = ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents
      .sectionListRenderer.contents[0].itemSectionRenderer.contents;

    for (const item of contents) {
      if (item.videoRenderer) {
        const video = item.videoRenderer;
        videos.push({
          title: video.title.runs[0].text,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          image: video.thumbnail.thumbnails.pop().url,
          duration: video.lengthText ? video.lengthText.simpleText : "0:00",
          author: video.ownerText.runs[0].text,
          type: "track"
        });
      }
      if (videos.length >= 10) break; // máximo 10 resultados
    }

    res.json(videos);
  } catch (err) {
    console.error("Error en búsqueda:", err.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

// 🔹 Obtener info y link de audio
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    const info = await ytdl.getInfo(href);

    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");

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
