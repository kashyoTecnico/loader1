import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: BASE_URL,
};

// ✅ Verificación inicial
app.get("/", (req, res) => res.send("🎵 Musikfy Loader activo usando y2mate.best 🚀"));

/**
 * 🔍 /api/search?q=...
 * Busca canciones en y2mate.best y devuelve título, duración, thumbnail y videoId
 */
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta el parámetro q" });

  try {
    const url = `${BASE_URL}/search/?query=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
    const $ = cheerio.load(data);

    const results = [];

    $(".result_form").each((_, el) => {
      const videoId = $(el).find('input[name="videoId"]').val();
      const title = $(el).find("h3").text().trim();
      const thumbnail = $(el).find("img").attr("src");
      const duration = $(el).find(".time").text().trim();

      if (videoId && title) results.push({ title, videoId, thumbnail, duration });
    });

    // fallback por si cambian el formato del HTML
    if (results.length === 0) {
      $(".col-xs-6, .col-sm-4, .col-md-3").each((_, el) => {
        const videoId = $(el).find('input[name="videoId"]').val();
        const title = $(el).find("h3").text().trim();
        const thumbnail = $(el).find("img").attr("src");
        const duration = $(el).find(".time").text().trim();
        if (videoId && title) results.push({ title, videoId, thumbnail, duration });
      });
    }

    return res.json({ results });
  } catch (error) {
    console.error("❌ Error en búsqueda:", error.message);
    return res.status(500).json({ error: "Error al buscar canciones" });
  }
});

/**
 * 🎶 /api/download/:id
 * Devuelve el enlace MP3 320kbps (o más alto si no está disponible)
 */
app.get("/api/download/:id", async (req, res) => {
  const videoId = req.params.id;
  if (!videoId) return res.status(400).json({ error: "Falta videoId" });

  try {
    const url = `${BASE_URL}/convert/?videoId=${encodeURIComponent(videoId)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 20000 });
    const $ = cheerio.load(data);

    let audio = null;

    // Buscar botón con MP3 320kbps
    $("button.y2link-download.custom").each((_, el) => {
      const note = $(el).attr("data-note");
      const base = $(el).attr("data-base");
      const details = $(el).attr("data-details");
      if (note === "320" && base && details) audio = `${base}?${details}`;
    });

    // Si no hay 320, toma el más alto disponible
    if (!audio) {
      let bestNote = 0;
      $("button.y2link-download.custom").each((_, el) => {
        const note = parseInt($(el).attr("data-note") || "0");
        const base = $(el).attr("data-base");
        const details = $(el).attr("data-details");
        if (note > bestNote && base && details) {
          bestNote = note;
          audio = `${base}?${details}`;
        }
      });
    }

    // Fallback si no hay botones visibles
    if (!audio) {
      const m = data.match(/data-base="([^"]+)"\s+data-details="([^"]+)"/);
      if (m) audio = `${m[1]}?${m[2]}`;
    }

    console.log(`🎧 /api/download/${videoId} → ${audio ? "ENCONTRADO" : "NO AUDIO"}`);
    return res.json({ audio: audio || null });
  } catch (error) {
    console.error("❌ Error en descarga:", error.message);
    return res.status(500).json({ error: "Error al obtener el audio" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Musikfy Loader corriendo en http://localhost:${PORT} usando ${BASE_URL}`)
);
