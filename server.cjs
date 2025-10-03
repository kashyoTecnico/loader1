// server.cjs
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());

// Test root
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Servidor Musikfy activo 🚀" });
});

// Buscar tracks y artistas en Soundfly
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const tracksUrl = `https://soundfly.es/search/${encodeURIComponent(query)}/tracks`;
    const artistsUrl = `https://soundfly.es/search/${encodeURIComponent(query)}/artists`;

    const fetchHtml = async (url) => {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000,
      });
      return response.data;
    };

    // Scraping tracks
    const htmlTracks = await fetchHtml(tracksUrl);
    const $t = cheerio.load(htmlTracks);
    const tracks = [];
    $t('div.flex.gap-x-16.break-inside-avoid[role="option"]').each((i, el) => {
      const anchor = $t(el).find("a");
      const img = $t(el).find("img").attr("src") || "";
      if (anchor.length > 0) {
        tracks.push({
          title: anchor.text().trim(),
          url: `https://soundfly.es${anchor.attr("href")}`,
          image: img,
          type: "track"
        });
      }
    });

    // Scraping artists
    const htmlArtists = await fetchHtml(artistsUrl);
    const $a = cheerio.load(htmlArtists);
    const artists = [];
    $a('div.content-grid[role="option"]').each((i, el) => {
      const anchor = $a(el).find("a");
      const img = $a(el).find("img").attr("src") || "";
      if (anchor.length > 0) {
        artists.push({
          title: anchor.text().trim(),
          url: `https://soundfly.es${anchor.attr("href")}`,
          image: img,
          type: "artist"
        });
      }
    });

    res.json([...tracks, ...artists]);
  } catch (err) {
    console.error("Error fetching Soundfly:", err.message);
    res.status(500).json({ error: "Failed to fetch data from Soundfly" });
  }
});

// Obtener info de un track
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    const html = await axios.get(href, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    }).then(r => r.data);

    const $ = cheerio.load(html);
    const title = $("h1").first().text().trim() || "Unknown";
    const audioUrl = $("audio").attr("src") || "";
    const image = $("img").first().attr("src") || "";

    res.json({ title, url: audioUrl, image });
  } catch (err) {
    console.error("Error fetching track:", err.message);
    res.status(500).json({ error: "Failed to fetch track" });
  }
});

// Puerto dinámico para Railway/Render
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});
