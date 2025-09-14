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

// Buscar tracks
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const url = `https://www.ceenaija.com/?s=${encodeURIComponent(query)}`;
    console.log("Fetching URL:", url);

    const html = await axios.get(url, { timeout: 15000 }).then(r => r.data);
    console.log("HTML length:", html.length);

    const $ = cheerio.load(html);
    const tracks = [];

    $(".td-ss-main-content .item-details").each((i, el) => {
      const title = $(el).find(".entry-title a").text();
      const href = $(el).find(".entry-title a").attr("href");
      if (title && href) tracks.push({ title, url: href });
    });

    res.json(tracks);
  } catch (err) {
    console.error("Error fetching tracks:", err.message);
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
});

// Track info
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    console.log("Fetching track URL:", href);
    const html = await axios.get(href, { timeout: 15000 }).then(r => r.data);
    const $ = cheerio.load(html);

    const title = $("h1.entry-title").text() || "Unknown";
    const url = $("figure.wp-block-audio audio").attr("src") || "";
    const image = $("img.wp-post-image").attr("src") || "";

    res.json({ title, url, image });
  } catch (err) {
    console.error("Error fetching track:", err.message);
    res.status(500).json({ error: "Failed to fetch track" });
  }
});

// 🔹 OJO: Usa el puerto dinámico que Railway da
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});
