// server.js (versión final, robusta y compatible con Flutter)
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BASE_SEARCH = process.env.BASE_SEARCH;
const BASE_DOWNLOAD = process.env.BASE_DOWNLOAD;
const DOWNLOAD_KEY = process.env.DOWNLOAD_KEY;

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// 🟢 Root
app.get("/", (req, res) =>
  res.send("🎵 Musikfy Loader activo usando mp3juice.blog & mp3youtube.cc 🚀")
);

// 🔍 Search
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  const url = `${BASE_SEARCH}/search.php?q=${encodeURIComponent(q)}`;
  try {
    const r = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
    if (!r?.data) return res.json({ results: [] });

    const items = r.data.items || r.data.results || [];
    const results = items.map((item) => ({
      id: item.id || item.videoId,
      title: item.title,
      duration: item.duration,
      size: item.size,
      channelTitle: item.channelTitle || item.author,
      source: item.source || BASE_SEARCH,
    }));

    console.log(`🔎 SEARCH q="${q}" found=${results.length}`);
    return res.json({ results });
  } catch (err) {
    console.error("❌ Error en /search:", err.message || err);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

// 🎧 Download principal
app.post("/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta videoId" });

  try {
    const r = await axios.post(
      BASE_DOWNLOAD,
      new URLSearchParams({
        key: DOWNLOAD_KEY,
        videoId: id,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": DEFAULT_HEADERS["User-Agent"],
          Origin: "https://iframe.y2meta-uk.com",
          Referer: "https://iframe.y2meta-uk.com",
        },
        timeout: 20000,
      }
    );

    const audio =
      r.data?.audio?.url ||
      r.data?.audio ||
      r.data?.link ||
      r.data?.download ||
      null;

    console.log(`🎶 DOWNLOAD id=${id} foundAudio=${!!audio}`);
    return res.json({ audio });
  } catch (err) {
    console.error("❌ Error en /download:", err.message || err);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

// 🎧 GET alternativo (para fallback del cliente Flutter)
app.get("/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta videoId" });

  try {
    const r = await axios.get(`${BASE_DOWNLOAD}?videoId=${id}`, {
      headers: DEFAULT_HEADERS,
      timeout: 20000,
    });

    const audio =
      r.data?.audio?.url ||
      r.data?.audio ||
      r.data?.link ||
      r.data?.download ||
      null;

    console.log(`🔁 GET /download/${id} -> foundAudio=${!!audio}`);
    return res.json({ audio });
  } catch (err) {
    console.error("❌ Error GET /download:", err.message || err);
    return res.status(500).json({ error: "Error alternativo al obtener audio" });
  }
});

// 🧩 Endpoint alternativo (para el tercer intento del cliente Flutter)
app.get("/api/v1/download/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const r = await axios.get(`${BASE_DOWNLOAD}?id=${id}`, {
      headers: DEFAULT_HEADERS,
      timeout: 20000,
    });

    const audio =
      r.data?.audio?.url ||
      r.data?.audio ||
      r.data?.link ||
      r.data?.download ||
      null;

    console.log(`🔁 /api/v1/download/${id} foundAudio=${!!audio}`);
    return res.json({ audio });
  } catch (err) {
    console.error("❌ Error en /api/v1/download:", err.message || err);
    return res.status(500).json({ error: "Error en endpoint alternativo" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Musikfy Loader corriendo en puerto ${PORT}`)
);
