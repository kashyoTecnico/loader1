// server.js (ESM, búsqueda en mp3juice.blog + descarga via mp3youtube.cc)
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
const SEARCH_URL = process.env.BASE_SEARCH_URL || "https://wwd.mp3juice.blog";
const DOWNLOAD_URL = process.env.BASE_DOWNLOAD_URL || "https://api.mp3youtube.cc/v2";
const MP3Y_KEY = process.env.MP3Y_KEY;

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "es-US,es;q=0.9",
  Origin: SEARCH_URL,
  Referer: SEARCH_URL,
};

// 🟢 Root
app.get("/", (req, res) =>
  res.send("🎵 Musikfy Loader activo 🚀")
);

/**
 * 🔍 /search?q=...
 */
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  const url = `${SEARCH_URL}/search.php?q=${encodeURIComponent(q)}`;

  try {
    const r = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
    const data = r?.data || {};
    const results = data.items || [];

    console.log(` q="${q}" url=${url} found=${results.length}`);
    return res.json({ results });
  } catch (err) {
    console.error("Error en /search:", err.message || err);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

/**
 * 🎧 /download/:id
 */
app.post("/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta videoId" });

  try {
    const body = new URLSearchParams();
    body.append("videoId", id);
    body.append("key", MP3Y_KEY);

    const r = await axios.post(DOWNLOAD_URL + "/converter", body, {
      headers: { 
        ...DEFAULT_HEADERS, 
        "Content-Type": "application/x-www-form-urlencoded" 
      },
      timeout: 20000
    });

    const audio = r?.data?.result?.mp3 || null;

    console.log(`DOWNLOAD id=${id} foundAudio=${!!audio}`);
    return res.json({ audio });
  } catch (err) {
    console.error("Error en /download:", err.message || err);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Musikfy Loader corriendo en puerto ${PORT}`)
);
