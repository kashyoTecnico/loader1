// server.js (versión mejorada y corregida)
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BASE_SEARCH = process.env.BASE_SEARCH || "https://mp3juice.blog";
const BASE_DOWNLOAD = process.env.BASE_DOWNLOAD || "https://y2meta.uk/api";
const DOWNLOAD_KEY = process.env.DOWNLOAD_KEY || "MGI1YzJiYTdjNDI1YzQxOTEyNmZmMDhjYWRlYjFkNzZkZDcxNWUzMjNiMTljN2UzNjZkNDM1MDA1MTZlYjc0OXxNVGMxT1RrNU1EZzVPREEwTkE9PQ==";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://y2meta.uk",
  Referer: "https://y2meta.uk/",
  Connection: "keep-alive",
};

// 🟢 Root
app.get("/", (req, res) =>
  res.send("🎵 Musikfy Loader activo con proxy seguro y fallback automático 🚀")
);

// 🔍 Search
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  const url = `${BASE_SEARCH}/search.php?q=${encodeURIComponent(q)}`;
  try {
    const r = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
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
    console.error("❌ Error en /search:", err.message);
    return res.status(500).json({ error: "Error al buscar canciones" });
  }
});

// 🎧 Descarga principal (POST)
app.post("/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta videoId" });

  try {
    const payload = new URLSearchParams({
      key: DOWNLOAD_KEY,
      videoId: id,
      format: "mp3",
      quality: "320",
    }).toString();

    const r = await axios.post(BASE_DOWNLOAD, payload, {
      headers: {
        ...DEFAULT_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 25000,
      validateStatus: () => true, // no romper por 403/400
    });

    // Manejo de fallos
    if (!r.data || typeof r.data !== "object") {
      console.warn("⚠️ Respuesta inesperada del servidor externo:", r.data);
      return res.status(502).json({ error: "Servidor externo no válido" });
    }

    const audio =
      r.data?.audio?.url ||
      r.data?.url ||
      r.data?.download ||
      r.data?.link ||
      null;

    if (!audio) {
      console.warn("⚠️ No se encontró URL de audio en la respuesta:", r.data);
      return res.status(404).json({ error: "No se pudo obtener audio" });
    }

    console.log(`🎶 DOWNLOAD OK id=${id}`);
    return res.json({ audio });
  } catch (err) {
    console.error("❌ Error en /download:", err.message);
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
      validateStatus: () => true,
    });

    const audio =
      r.data?.audio?.url ||
      r.data?.url ||
      r.data?.download ||
      r.data?.link ||
      null;

    console.log(`🔁 GET /download/${id} -> foundAudio=${!!audio}`);
    return res.json({ audio });
  } catch (err) {
    console.error("❌ Error GET /download:", err.message);
    return res.status(500).json({ error: "Error alternativo al obtener audio" });
  }
});

// 🧩 Fallback adicional (3er intento)
app.get("/api/v1/download/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const r = await axios.get(`${BASE_DOWNLOAD}?id=${id}`, {
      headers: DEFAULT_HEADERS,
      timeout: 20000,
      validateStatus: () => true,
    });

    const audio =
      r.data?.audio?.url ||
      r.data?.url ||
      r.data?.download ||
      r.data?.link ||
      null;

    console.log(`🔁 /api/v1/download/${id} foundAudio=${!!audio}`);
    return res.json({ audio });
  } catch (err) {
    console.error("❌ Error en /api/v1/download:", err.message);
    return res.status(500).json({ error: "Error en endpoint alternativo" });
  }
});

// 🚀 Start
app.listen(PORT, () =>
  console.log(`✅ Musikfy Loader corriendo en puerto ${PORT}`)
);
