const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());

// Axios con timeout para evitar que se cuelgue
const axiosInstance = axios.create({ timeout: 10000 }); // 10s

// Buscar tracks
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  const url = `https://www.ceenaija.com/?s=${encodeURIComponent(query)}`;
  console.log("Search request:", query);
  console.log("Fetching URL:", url);

  try {
    const html = await axiosInstance.get(url).then(r => r.data);
    const $ = cheerio.load(html);
    const tracks = [];

    $(".td-ss-main-content .item-details").each((i, el) => {
      const title = $(el).find(".entry-title a").text().trim();
      const href = $(el).find(".entry-title a").attr("href") || "";
      if (title && href) tracks.push({ title, url: href });
    });

    console.log("Tracks found:", tracks.length);
    res.json(tracks);
  } catch (err) {
    console.error("Error fetching tracks:", err.message);
    res.status(500).json({ error: "Failed to fetch tracks", message: err.message });
  }
});

// Obtener info de un track específico
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  console.log("Track request:", href);

  try {
    const html = await axiosInstance.get(href).then(r => r.data);
    const $ = cheerio.load(html);

    const title = $("h1.entry-title").text().trim() || "Unknown";
    const url = $("figure.wp-block-audio audio").attr("src") || "";
    const image = $("img.wp-post-image").attr("src") || "";

    res.json({ title, url, image });
  } catch (err) {
    console.error("Error fetching track:", err.message);
    res.status(500).json({ error: "Failed to fetch track", message: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
