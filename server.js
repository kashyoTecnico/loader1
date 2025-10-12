// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DEEZER_BASE = "https://api.deezer.com";

// Ruta raíz
app.get("/", (req, res) => {
  res.json({ service: "Musikfy (Deezer API)", status: "ok" });
});

/**
 * /search?q=QUERY[&limit=10&index=0]
 * Busca tracks (o artistas, playlists etc si cambias endpoint)
 */
app.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Falta ?q=" });

  const limit = req.query.limit || 10;
  const index = req.query.index || 0;

  try {
    // endpoint de búsqueda (busca tracks por defecto)
    const url = `${DEEZER_BASE}/search?q=${encodeURIComponent(q)}&limit=${limit}&index=${index}`;
    const r = await fetch(url);
    const data = await r.json();

    // Mapea lo que te interesa
    const results = (data.data || []).map(item => ({
      id: item.id,
      title: item.title,
      artist: item.artist?.name,
      artist_id: item.artist?.id,
      album: item.album?.title,
      album_id: item.album?.id,
      duration: item.duration, // en segundos
      preview: item.preview,   // enlace MP3 30s
      link: item.link,         // link a Deezer web
      cover: item.album?.cover_medium || item.album?.cover || null
    }));

    res.json({ q, total: data.total || 0, count: results.length, results });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Error en búsqueda Deezer" });
  }
});

/**
 * /track?id=TRACK_ID
 * Información detallada de una pista
 */
app.get("/track", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "Falta ?id=" });

  try {
    const url = `${DEEZER_BASE}/track/${encodeURIComponent(id)}`;
    const r = await fetch(url);
    const item = await r.json();

    if (item.error) return res.status(404).json({ error: "Track no encontrada", details: item.error });

    const track = {
      id: item.id,
      title: item.title,
      artist: item.artist?.name,
      artist_id: item.artist?.id,
      album: item.album?.title,
      album_id: item.album?.id,
      duration: item.duration,
      release_date: item.release_date,
      rank: item.rank,
      explicit_content: item.explicit_lyrics,
      preview: item.preview,
      link: item.link,
      cover: item.album?.cover_big || item.album?.cover_medium || null
    };

    res.json(track);
  } catch (err) {
    console.error("Track error:", err);
    res.status(500).json({ error: "Error al obtener track Deezer" });
  }
});

/**
 * /stream?id=TRACK_ID
 * Reenvía (proxy) el archivo preview MP3 de Deezer para reproducir desde Flutter sin CORS
 * - Esto no devuelve la pista completa, solo el preview (30s) que provee Deezer.
 */
app.get("/stream", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "Falta ?id=" });

  try {
    // obtener info para conseguir preview
    const infoRes = await fetch(`${DEEZER_BASE}/track/${encodeURIComponent(id)}`);
    const info = await infoRes.json();
    if (info.error) return res.status(404).json({ error: "Track no encontrada", details: info.error });

    const previewUrl = info.preview;
    if (!previewUrl) return res.status(404).json({ error: "No existe preview para esta pista" });

    // Reenvía la respuesta de Deezer directamente al cliente (stream)
    const upstream = await fetch(previewUrl);
    // Copiamos headers importantes
    res.setHeader("Content-Type", "audio/mpeg");
    // Opcional: permitir descarga directo
    if (req.query.download === "1") {
      res.setHeader("Content-Disposition", `attachment; fi
