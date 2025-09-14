const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());

app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);
  
  const url = `https://www.ceenaija.com/?s=${encodeURIComponent(query)}`;
  const html = await axios.get(url).then(r => r.data);
  const $ = cheerio.load(html);
  const tracks = [];
  
  $(".td-ss-main-content .item-details").each((i, el) => {
    const title = $(el).find(".entry-title a").text();
    const href = $(el).find(".entry-title a").attr("href");
    tracks.push({ title, url: href });
  });
  
  res.json(tracks);
});

app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });
  
  const html = await axios.get(href).then(r => r.data);
  const $ = cheerio.load(html);
  const title = $("h1.entry-title").text() || "Unknown";
  const url = $("figure.wp-block-audio audio").attr("src") || "";
  const image = $("img.wp-post-image").attr("src") || "";
  
  res.json({ title, url, image });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
