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

// 🔹 Buscar videos (YouTube Search estilo ytify)
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(searchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });

    // Extraer ytInitialData
    const match = html.match(/var ytInitialData = (.*?);<\/script>/);
    if (!match) return res.json([]);

    const ytData = JSON.parse(match[1]);

    const items = ytData.contents.twoColumnSearchResultsRenderer.primaryContents
      .sectionListRenderer.contents[0].itemSectionRenderer.contents;

    const videos = items
      .filter(i => i.videoRenderer)
      .slice(0, 10) // máximo 10 resultados
      .map(i => {
        const v = i.videoRenderer;
        return {
          id: v.videoId,
          title: v.title.runs[0].text,
          author: v.ownerText.runs[0].text,
          duration: v.lengthText ? v.lengthText.simpleText : "0:00",
          thumbnail: v.thumbnail.thumbnails.pop().url,
          url: `/track?id=${v.videoId}` // aquí apuntamos al endpoint de audio
        };
      });

    res.json(videos);
  } catch (err) {
    console.error("Error en búsqueda:", err.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

// 🔹 Obtener URL directa de audio de YouTube
app.get("/track", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "No video ID provided" });

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

// Puerto dinámico
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});
