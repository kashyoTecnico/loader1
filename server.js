// server.js (ESM sin Puppeteer, adaptado a y2mate.best)
import express from "express";
import axios from "axios";
import { load } from "cheerio";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BASE_URL = process.env.BASE_URL || "https://y2mate.best";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: BASE_URL,
};

// 🟢 Root
app.get("/", (req, res) =>
  res.send("🎵 Musikfy Loader activo usando y2mate.best 🚀")
);

/**
 * 🔍 /api/search?q=...
 */
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  const url = `${BASE_URL}/search/?query=${encodeURIComponent(q)}`;

  try {
    const r = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
    if (!r?.data) return res.json({ results: [] });

    const $ = load(r.data);
    const results = [];

    // cada resultado está en form.result_form dentro de col-xs-6
    $("form.result_form").each((_, el) => {
      const videoId = $(el).find('input[name="videoId"]').val();
      const title = $(el).find(".search-info h3").text().trim() || "";
      const thumbnail = $(el).find("img.vi_thumimage").attr("src") || "";
      const duration = $(el).find(".iwrap span.time").text().trim() || "";
      if (videoId && title) results.push({ videoId, title, thumbnail, duration });
    });

    console.log(`SEARCH q="${q}" url=${url} found=${results.length}`);
    return res.json({ results });
  } catch (err) {
    console.error("Error en /api/search:", err.message || err);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

/**
 * 🎧 /api/download/:id
 */
app.get("/api/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta videoId" });

  const url = `${BASE_URL}/convert/?videoId=${encodeURIComponent(id)}`;

  try {
    const r = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 20000 });
    if (!r?.data) return res.json({ audio: null });

    const $ = load(r.data);
    let audio = null;

    // botón 320kbps
    const btn = $('button.y2link-download.custom[data-note="320"]').first();
    if (btn.length) {
      const base = btn.attr("data-base");
      const details = btn.attr("data-details");
      if (base && details) audio = `${base}?${details}`;
    }

    // fallback: mayor nota disponible
    if (!audio) {
      let bestNote = 0;
      $('button.y2link-download.custom').each((_, el) => {
        const note = parseInt($(el).attribs["data-note"] || "0");
        const base = $(el).attribs["data-base"];
        const details = $(el).attribs["data-details"];
        if (note > bestNote && base && details) {
          bestNote = note;
          audio = `${base}?${details}`;
        }
      });
    }

    console.log(`DOWNLOAD id=${id} url=${url} foundAudio=${!!audio}`);
    return res.json({ audio: audio || null });
  } catch (err) {
    console.error("Error en /api/download:", err.message || err);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Musikfy Loader corriendo en puerto ${PORT} usando ${BASE_URL}`)
);
