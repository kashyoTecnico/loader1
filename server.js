// server.js — versión lista para Render
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Base API y token temporal (puedes regenerarlo si expira)
const API_BASE = "https://api.cdnframe.com/api/v5";
const AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmlnaW4iOiJodHRwczovL2NsaWNrYXBpLm5ldCIsInNlc3Npb25JZCI6IjY0ZmI2ZmZmLTEzOWMtNDJiYy1hYmE3LWU0OTY3NGE1MzdhZiIsImlhdCI6MTc2MDExOTcyNSwiZXhwIjoxNzYwMTIwMzI1fQ.LLfwMtN6IxmCeGoZgfAjuLYjQQTRJ6suPo-cRLfQu70";

// 🟢 Root
app.get("/", (req, res) => {
  res.send("🎧 Musikfy Loader API funcionando en Render 🚀");
});

// 🔍 Buscar canciones
app.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  try {
    const { data } = await axios.get(`${API_BASE}/search`, {
      params: { q },
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        Origin: "https://clickapi.net",
        Referer: "https://clickapi.net/",
      },
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /search:", err.response?.data || err.message);
    res.status(500).json({ error: "Fallo en búsqueda", details: err.message });
  }
});

// 🔊 Obtener información de un video (links MP3)
app.get("/info/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta videoId" });

  try {
    const { data } = await axios.get(`${API_BASE}/info/${id}`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        Origin: "https://clickapi.net",
        Referer: "https://clickapi.net/",
      },
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /info:", err.response?.data || err.message);
    res.status(500).json({ error: "Fallo en info", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`✅ Musikfy Loader corriendo en puerto ${PORT}`)
);
