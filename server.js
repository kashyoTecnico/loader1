// server.js (ESM, integrado con mp3juice.blog y mp3youtube.cc)
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

// URLs base
const BASE_SEARCH = "https://wwd.mp3juice.blog"; // para search
const BASE_DOWNLOAD = "https://api.mp3youtube.cc/v2/converter"; // para download
const DOWNLOAD_KEY = "MGI1YzJiYTdjNDI1YzQxOTEyNmZmMDhjYWRlYjFkNzZkZDcxNWUzMjNiMTljN2UzNjZkNDM1MDA1MTZlYjc0OXxNVGMxT1RrNU1EZzVPREEwTkE9PQ==";

// Headers default
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// 🟢 Root
app.get("/", (req, res) =>
  res.send("🎵 Musikfy Loader activo usando mp3juice.blog & mp3youtube.cc 🚀")
);

/**
 * 🔍 /search?q=...
 * Busca usando mp3juice.blog
 */
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  const url = `${BASE_SEARCH}/search.php?q=${encodeURIComponent(q)}`;

  try {
    const r = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
    if (!r?.data) return res.json({ results: [] });

    const data = r.data;
    const results = (data.items || []).map((item) => ({
      videoId: item.id,
      title: item.title,
      duration: item.duration,
      size: item.size,
      channelTitle: item.channelTitle,
      source: item.source,
    }));

    console.log(` q="${q}" url=${url} found=${results.length}`);
    return res.json({ results });
  } catch (err) {
    console.error("Error en /search:", err.message || err);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

/**
 * 🎧 /download/:id
 * Descarga usando mp3youtube.cc
 */
app.post("/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta videoId" });

  try {
    const r = await axios.post(
      BASE_DOWNLOAD,
      new URLSearchParams({ key: DOWNLOAD_KEY, videoId: id }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
          Origin: "https://iframe.y2meta-uk.com",
          Referer: "https://iframe.y2meta-uk.com",
        },
        timeout: 20000,
      }
    );

    if (!r?.data) return res.json({ audio: null });

    const audio = r.data?.audio?.url || null;
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
