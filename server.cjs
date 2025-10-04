// server.cjs
const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const axios = require("axios");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Servidor Musikfy YouTube activo 🚀" });
});

// 🔹 Buscar videos
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(searchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });

    const match = html.match(/var ytInitialData = (.*?);<\/script>/s);
    if (!match || !match[1]) return res.json([]);

    const ytData = JSON.parse(match[1]);
    const items = ytData.contents.twoColumnSearchResultsRenderer.primaryContents
      .sectionListRenderer.contents[0].itemSectionRenderer.contents;

    const videos = items
      .filter(i => i.videoRenderer)
      .slice(0, 10)
      .map(i => {
        const v = i.videoRenderer;
        return {
          id: v.videoId,
          title: v.title.runs[0].text,
          author: v.ownerText.runs[0].text,
          duration: v.lengthText ? v.lengthText.simpleText : "0:00",
          image: v.thumbnail.thumbnails.slice(-1)[0]?.url || "",
          url: `/track?id=${v.videoId}`
        };
      });

    res.json(videos);
  } catch (err) {
    console.error("Error en búsqueda:", err.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

// 🔹 Obtener y reproducir audio como stream
app.get("/track", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "No video ID provided" });

  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    if (!audioFormats.length) return res.status(404).json({ error: "No audio formats found" });

    const bestAudio = audioFormats.find(f => f.itag === 140) || audioFormats[0];

    // Servir el audio directamente como stream
    res.setHeader("Content-Type", "audio/mpeg");
    ytdl(`https://www.youtube.com/watch?v=${videoId}`, { format: bestAudio }).pipe(res);

  } catch (err) {
    console.error("Error obteniendo track:", err.message);
    res.status(500).json({ error: "Failed to fetch track audio" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => console.log(`✅ Server running on port ${port}`));
