// server.js — versión 100% funcional con Render y Flutter (scraping MP3Juices)
import express from "express";
import axios from "axios";
import cors from "cors";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BASE_URL = "https://v3.mp3juices.click";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// 🟢 Root
app.get("/", (req, res) => {
  res.send("🎵 Musikfy Loader corriendo con MP3Juices.click 🚀");
});

// 🔍 SEARCH - Scrapea los resultados de MP3Juices
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  try {
    const searchUrl = `${BASE_URL}/?url=${encodeURIComponent(q)}`;
    const { data } = await axios.get(searchUrl, { headers: HEADERS, timeout: 20000 });

    const $ = cheerio.load(data);
    const results = [];

    $(".result").each((_, el) => {
      const title = $(el).find(".title b").text().trim();
      const id = $(el).find("input.videoId").attr("value");
      const duration = $(el).find(".videoDuration").text().trim();

      if (id && title) {
        results.push({ id, title, duration });
      }
    });

    console.log(`🔎 SEARCH "${q}" => ${results.length} resultados`);
    return res.json({ results });
  } catch (err) {
    console.error("❌ Error en /search:", err.message);
    return res.status(500).json({ error: "Error al buscar canciones" });
  }
});

// 🎧 DOWNLOAD - Obtiene el enlace de descarga real
app.post("/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta videoId" });

  try {
    const videoUrl = `${BASE_URL}/?url=${id}`;
    const { data } = await axios.get(videoUrl, { headers: HEADERS, timeout: 20000 });

    const $ = cheerio.load(data);
    const link = $(".download_btn a").attr("href");

    if (!link) {
      console.log(`⚠️ No se encontró link de descarga para ${id}`);
      return res.status(404).json({ error: "No se encontró link de descarga" });
    }

    const finalUrl = link.startsWith("http") ? link : `${BASE_URL}${link}`;
    console.log(`🎶 DOWNLOAD ${id} -> ${finalUrl}`);
    return res.json({ audio: finalUrl });
  } catch (err) {
    console.error("❌ Error en /download:", err.message);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

// 🎧 GET fallback (para compatibilidad con tu Flutter)
app.get("/download/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const videoUrl = `${BASE_URL}/?url=${id}`;
    const { data } = await axios.get(videoUrl, { headers: HEADERS, timeout: 20000 });

    const $ = cheerio.load(data);
    const link = $(".download_btn a").attr("href");
    const finalUrl = link?.startsWith("http") ? link : `${BASE_URL}${link}`;

    console.log(`🔁 GET /download/${id} -> ${!!finalUrl}`);
    return res.json({ audio: finalUrl });
  } catch (err) {
    console.error("❌ Error GET /download:", err.message);
    return res.status(500).json({ error: "Error alternativo al obtener audio" });
  }
});

app.listen(PORT, () => console.log(`✅ Musikfy Loader corriendo en puerto ${PORT}`));
