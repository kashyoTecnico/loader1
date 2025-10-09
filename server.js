// server.js (usa ESM)
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: BASE_URL,
};

app.get("/", (req, res) => res.send("Musikfy loader running"));

/**
 * /api/search?q=...
 * Hace GET a BASE_URL/search/?query=... y extrae los resultados.
 */
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Missing q parameter" });

  try {
    const url = `${BASE_URL}/search/?query=${encodeURIComponent(q)}`;
    const r = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
    const $ = load(r.data);

    const results = [];
    // selector esperado: cada resultado dentro de <form class="result_form">...
    $(".result_form").each((_, el) => {
      const videoId =
        $(el).find('input[name="videoId"]').attr("value") ||
        $(el).find('input[name="videoId"]').val();
      const title = $(el).find(".search-info h3").text().trim() || $(el).find("h3").text().trim();
      const thumbnail =
        $(el).find("img.vi_thumimage").attr("src") ||
        $(el).find("img").attr("src") ||
        "";
      const duration = $(el).find(".time").text().trim() || "";

      if (videoId) {
        results.push({ title, videoId, thumbnail, duration });
      }
    });

    // fallback: si no hay .result_form, busco otras tarjetas
    if (results.length === 0) {
      $(".col-xs-6, .col-sm-4, .col-md-3").each((_, el) => {
        const videoId = $(el).find('input[name="videoId"]').attr("value") || "";
        const title = $(el).find("h3").text().trim();
        const thumbnail = $(el).find("img").attr("src") || "";
        const duration = $(el).find(".time").text().trim() || "";
        if (videoId) results.push({ title, videoId, thumbnail, duration });
      });
    }

    return res.json({ results });
  } catch (err) {
    console.error("search error:", err?.message || err);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

/**
 * /api/download/:id
 * Intenta extraer el enlace final de MP3 320kbps del HTML de la página de conversión.
 * Devuelve { audio: <url> } o { audio: null } si no lo encuentra.
 */
app.get("/api/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    // Pido la página de conversión para el video
    const url = `${BASE_URL}/convert/?videoId=${encodeURIComponent(id)}`;
    const r = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 20000 });
    const $ = load(r.data);

    let audio = null;

    // 1) Buscamos <a class="btn-download-link custom-btn" data-base="..." data-details="...">
    const anchor = $('a.btn-download-link.custom-btn[data-base][data-details]').first();
    if (anchor.length) {
      const base = anchor.attr("data-base");
      const details = anchor.attr("data-details");
      if (base && details) audio = `${base}?${details}`;
    }

    // 2) Si no, intentamos localizar el botón de la tabla con data-note=320
    if (!audio) {
      const btn = $('button.y2link-download.custom[data-note="320"][data-format="mp3"]').first();
      if (btn.length) {
        // en algunos clones el botón tiene data-base/data-details
        const base = btn.attr("data-base");
        const details = btn.attr("data-details");
        if (base && details) audio = `${base}?${details}`;
      }
    }

    // 3) fallback: buscar en todo el HTML pattern data-base / data-details
    if (!audio) {
      const m = r.data.match(/data-base="([^"]+)"\s+data-details="([^"]+)"/);
      if (m && m[1] && m[2]) audio = `${m[1]}?${m[2]}`;
    }

    console.log(`/api/download/${id} -> ${audio}`);
    return res.json({ audio: audio || null });
  } catch (err) {
    console.error("download error:", err?.message || err);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

app.listen(PORT, () => console.log(`Musikfy loader listening on ${PORT}`));
import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;
const BASE_URL = process.env.BASE_URL || "https://www.best";

/**
 * 🧠 1. Endpoint de búsqueda
 * Busca canciones y devuelve una lista con título, duración, thumbnail y videoId
 */
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ error: "Falta el parámetro q" });

  try {
    const { data } = await axios.get(`${BASE_URL}/search/${encodeURIComponent(query)}`);
    const $ = cheerio.load(data);

    const results = [];
    $(".result_form").each((_, el) => {
      const videoId = $(el).find('input[name="videoId"]').val();
      const title = $(el).find("h3").text().trim();
      const thumbnail = $(el).find("img").attr("src");
      const duration = $(el).find(".time").text().trim();

      if (videoId) {
        results.push({ title, videoId, thumbnail, duration });
      }
    });

    return res.json({ results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

/**
 * 🎧 2. Endpoint de descarga
 * Obtiene el enlace final en MP3 320kbps
 */
app.get("/api/download/:id", async (req, res) => {
  const videoId = req.params.id;
  if (!videoId) return res.json({ error: "Falta videoId" });

  try {
    const { data } = await axios.get(`${BASE_URL}/convert/${videoId}`);
    const $ = cheerio.load(data);

    let audio = null;

    $("button.y2link-download.custom").each((_, el) => {
      const note = $(el).attr("data-note");
      const base = $(el).attr("data-base");
      const details = $(el).attr("data-details");

      if (note === "320") {
        audio = `${base}?${details}`;
      }
    });

    if (!audio) {
      return res.json({ audio: null, message: "No se encontró enlace de 320kbps" });
    }

    return res.json({ audio });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

app.listen(PORT, () => console.log(`✅ Server ON: http://localhost:${PORT}`));
