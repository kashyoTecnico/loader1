// server.cjs
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());

// Root test
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Servidor Musikfy activo 🚀" });
});

// Buscar tracks y artistas
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const tracksUrl = `https://soundfly.es/search/${encodeURIComponent(query)}/tracks`;
    const artistsUrl = `https://soundfly.es/search/${encodeURIComponent(query)}/artists`;

    console.log("Buscando tracks:", tracksUrl);
    console.log("Buscando artists:", artistsUrl);

    // Fetch tracks
    const htmlTracks = await axios.get(tracksUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    }).then(r => r.data);

    const $t = cheerio.load(htmlTracks);
    const tracks = [];
    $t('[id*="-tabpanel"] div div a').each((i, el) => {
      const title = $t(el).text().trim();
      const href = $t(el).attr("href");
      const img = $t(el).find("img").attr("src") || "";
      if (title && href) tracks.push({ title, url: href, image: img, type: "track" });
    });

    // Fetch artists
    const htmlArtists = await axios.get(artistsUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    }).then(r => r.data);

    const $a = cheerio.load(htmlArtists);
    const artists = [];
    $a('[id*="-tabpanel"] div div a').each((i, el) => {
      const title = $a(el).text().trim();
      const href = $a(el).attr("href");
      const img = $a(el).find("img").attr("src") || "";
      if (title && href) artists.push({ title, url: href, image: img, type: "artist" });
    });

    res.json([...tracks, ...artists]);

  } catch (err) {
    console.error("Error fetching search results:", err.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

// Obtener info de un track
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    const html = await axios.get(href, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    }).then(r => r.data);

    const $ = cheerio.load(html);

    // Extraer info real del track
    const title = $("h1").text().trim() || "Unknown";
    const audioUrl = $("audio").attr("src") || "";
    const image = $("img").attr("src") || "";

    res.json({ title, url: audioUrl, image });

  } catch (err) {
    console.error("Error fetching track:", err.message);
    res.status(500).json({ error: "Failed to fetch track" });
  }
});

// Puerto dinámico para Railway
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});
