// server.js
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

app.get("/", (req, res) => res.send("🎵 Musikfy Loader activo usando y2mate.best 🚀"));

/**
 * /api/search?q=...
 * Intenta varias rutas (/en/search/, /search/) hasta obtener HTML con resultados.
 * Devuelve { results: [ { title, videoId, thumbnail, duration } ] }
 */
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  const candidates = [
    `${BASE_URL}/en/search/?query=${encodeURIComponent(q)}`,
    `${BASE_URL}/search/?query=${encodeURIComponent(q)}`,
    `${BASE_URL}/en/search/?q=${encodeURIComponent(q)}`,
    `${BASE_URL}/search/?q=${encodeURIComponent(q)}`,
  ];

  try {
    let html = null;
    let usedUrl = null;

    for (const u of candidates) {
      try {
        const r = await axios.get(u, { headers: DEFAULT_HEADERS, timeout: 15000 });
        if (r && r.status === 200 && r.data && r.data.length > 1000) {
          html = r.data;
          usedUrl = u;
          break;
        }
      } catch (e) {
        // ignora e intenta siguiente candidato
        console.debug("search candidate failed:", u, e?.message || e);
      }
    }

    if (!html) {
      console.warn("No se obtuvo HTML de búsqueda para:", q);
      return res.json({ results: [] });
    }

    const $ = load(html);
    const results = [];

    // Selector principal: forms con clase result_form (ejemplos en el HTML que nos pasaste)
    $(".result_form").each((_, el) => {
      const videoId = $(el).find('input[name="videoId"]').attr("value") || $(el).find('input[name="videoId"]').val();
      const title = $(el).find(".search-info h3").text().trim() || $(el).find("h3").text().trim();
      const thumbnail = $(el).find("img.vi_thumimage").attr("src") || $(el).find("img").attr("src") || "";
      const duration = $(el).find(".time").text().trim() || "";
      if (videoId && title) results.push({ title, videoId, thumbnail, duration });
    });

    // Fallback: tarjetas (.col-xs-6 / .col-sm-4 ...)
    if (results.length === 0) {
      $("#SearchResultsDiv .col-xs-6, .col-sm-4, .col-md-3").each((_, el) => {
        const videoId = $(el).find('input[name="videoId"]').attr("value") || "";
        const title = $(el).find("h3").text().trim();
        const thumbnail = $(el).find("img").attr("src") || "";
        const duration = $(el).find(".time").text().trim() || "";
        if (videoId && title) results.push({ title, videoId, thumbnail, duration });
      });
    }

    // último fallback: si el HTML contiene un bloque con <div id="SearchResultsDiv"> con contenido HTML
    if (results.length === 0) {
      const raw = $("#SearchResultsDiv").html();
      if (raw && raw.length > 20) {
        // intentar buscar videoId con regex
        const re = /name="videoId"\s+value="([^"]+)"/g;
        let m;
        while ((m = re.exec(raw)) !== null) {
          const vid = m[1];
          // intentar tomar título cercano
          const titleMatch = raw.slice(Math.max(0, m.index - 200), m.index + 200).match(/<h3[^>]*>([^<]+)<\/h3>/);
          const title = titleMatch ? titleMatch[1].trim() : vid;
          results.push({ title, videoId: vid, thumbnail: "", duration: "" });
        }
      }
    }

    console.log(`SEARCH q="${q}" used=${usedUrl} found=${results.length}`);
    return res.json({ results });
  } catch (err) {
    console.error("Error en /api/search:", err?.message || err);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

/**
 * /api/download/:id
 * Intenta obtener el enlace final de MP3 (320kbps preferido) a partir de la página de conversión.
 * Respuesta: { audio: "<url>" } o { audio: null }
 */
app.get("/api/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const candidates = [
    `${BASE_URL}/convert/?videoId=${encodeURIComponent(id)}`,
    `${BASE_URL}/en/convert/?videoId=${encodeURIComponent(id)}`,
    `${BASE_URL}/convert/${encodeURIComponent(id)}`,
  ];

  try {
    let html = null;
    let usedUrl = null;
    for (const u of candidates) {
      try {
        const r = await axios.get(u, { headers: DEFAULT_HEADERS, timeout: 20000 });
        if (r && r.status === 200 && r.data && r.data.length > 1000) {
          html = r.data;
          usedUrl = u;
          break;
        }
      } catch (e) {
        console.debug("download candidate failed:", u, e?.message || e);
      }
    }

    if (!html) {
      console.warn("No se obtuvo HTML de convert para id:", id);
      return res.json({ audio: null });
    }

    const $ = load(html);
    let audio = null;

    // 1) anchor directo con data-base + data-details
    const anchor = $('a.btn-download-link.custom-btn[data-base][data-details]').first();
    if (anchor.length) {
      const base = anchor.attr("data-base");
      const details = anchor.attr("data-details");
      if (base && details) audio = `${base}?${details}`;
    }

    // 2) botones en la tabla (ej.: button.y2link-download.custom[data-note="320"])
    if (!audio) {
      $('button.y2link-download.custom').each((_, el) => {
        const note = $(el).attr("data-note");
        const base = $(el).attr("data-base");
        const details = $(el).attr("data-details");
        // preferir 320
        if (note === "320" && base && details) {
          audio = `${base}?${details}`;
        }
      });
    }

    // 3) si no hay 320, elegir la mayor nota disponible
    if (!audio) {
      let bestNote = 0;
      $('button.y2link-download.custom').each((_, el) => {
        const note = parseInt($(el).attr("data-note") || "0");
        const base = $(el).attr("data-base");
        const details = $(el).attr("data-details");
        if (note > bestNote && base && details) {
          bestNote = note;
          audio = `${base}?${details}`;
        }
      });
    }

    // 4) fallback regex en todo el HTML
    if (!audio) {
      const m = html.match(/data-base="([^"]+)"\s+data-details="([^"]+)"/);
      if (m && m[1] && m[2]) audio = `${m[1]}?${m[2]}`;
    }

    console.log(`DOWNLOAD id=${id} used=${usedUrl} foundAudio=${!!audio}`);
    return res.json({ audio: audio || null });
  } catch (err) {
    console.error("Error en /api/download:", err?.message || err);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Musikfy Loader corriendo en puerto ${PORT} usando ${BASE_URL}`)
);
