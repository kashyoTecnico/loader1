import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import cors from "cors";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = "https://v3.mp3juices.click";
const CDN_API = "https://api.cdnframe.com/api/v5/info";
const ORIGIN = "https://v3.mp3juices.click";
const SECRET = "LLfwMtN6IxmCeGoZgfAjuLYjQQTRJ6suPo-cRLfQu70";

// Home
app.get("/", (req, res) => {
  res.send("🎧 Musikfy Scraper activo y listo 🚀");
});

// 🔍 Search
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  try {
    const { data } = await axios.get(`${BASE_URL}/search/${encodeURIComponent(q)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
        Referer: BASE_URL,
      },
      timeout: 20000,
    });

    const $ = cheerio.load(data);
    const results = [];

    $(".list-group-item").each((i, el) => {
      const title = $(el).find(".title").text().trim();
      const duration = $(el).find(".duration").text().trim();
      const size = $(el).find(".size").text().trim();
      const link = $(el).find("a.btn-success").attr("href");
      const id = link ? link.split("/").pop() : null;

      if (title && id) results.push({ id, title, duration, size });
    });

    res.json({ results });
  } catch (err) {
    console.error("❌ Error en /search:", err.message);
    res.status(500).json({ error: "Error al hacer scraping" });
  }
});

// 🔑 Generar token
function generarToken(origin) {
  const sessionId = crypto.randomUUID();
  const payload = { origin, sessionId };
  return jwt.sign(payload, SECRET, { algorithm: "HS256", expiresIn: "10m" });
}

// 🎧 Info / download
app.get("/info/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Falta ID" });

  try {
    const token = generarToken(ORIGIN);

    const { data } = await axios.get(`${CDN_API}?id=${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: ORIGIN,
        Referer: BASE_URL,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
      },
      timeout: 20000,
    });

    if (!data || !data.url) return res.status(404).json({ error: "No se pudo obtener enlace" });

    res.json({ audio: data.url, info: data });
  } catch (err) {
    console.error("❌ Error en /info:", err.response?.status || err.message);
    res.status(500).json({
      error: "Fallo al obtener info del CDN",
      details: err.response?.data || err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Musikfy Scraper corriendo en puerto ${PORT}`));
