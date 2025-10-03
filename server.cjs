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
    // URL Soundfly
    const tracksUrl = `https://soundfly.es/search/${encodeURIComponent(query)}/tracks`;
    const artistsUrl = `https://soundfly.es/search/${encodeURIComponent(query)}/artists`;

    // Función helper para scrapear HTML
    const fetchHtml = async (url) => {
      const resp = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000
      });
      return resp.data;
    };

    // Scrape tracks
    const htmlTracks = await fetchHtml(tracksUrl);
    const $t = cheerio.load(htmlTracks);
    const tracks = [];
    $t('#\\:r5\\:-1-tabpanel > div > div.isolate.select-none.text-sm.outline-none.focus-visible\\:ring-2 [role="option"]').each((i, el) => {
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

    // Scrape artists
    const htmlArtists = await fetchHtml(artistsUrl);
    const $a = cheerio.load(htmlArtists);
    const artists = [];
    $a('#\\:r5\\:-2-tabpanel > div > div.content-grid.grid.grid-cols-\\[repeat\\(var\\(--nVisibleItems\\),minmax\\(0,1fr\\)\\)\\].gap-18 [role="option"]').each((i, el) => {
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

    // Combinar y enviar
    res.json([...tracks, ...artists]);
  } catch (err) {
    console.error("Error fetching Soundfly:", err.message);
    res.status(500).json({ error: "Failed to fetch data from Soundfly" });
  }
});

// Obtener info de track
app.get("/track", async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    const html = await axios.get(href, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
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
