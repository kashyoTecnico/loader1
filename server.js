import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = "https://v3.mp3juices.click";
const CDN_API = "https://api.cdnframe.com/api/v5/info";
const ORIGIN = "https://clickapi.net";
const SECRET = "LLfwMtN6IxmCeGoZgfAjuLYjQQTRJ6suPo-cRLfQu70"; // Token base usado por la web original

app.get("/", (req, res) => {
  res.send("🎧 Musikfy Scraper activo y listo 🚀");
});

// 🔎 Scraping del buscador
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  try {
    console.log(`🔍 Buscando: ${q}`);
    const { data } = await axios.get(`${BASE_URL}/search/${encodeURIComponent(q)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);
    const results = [];

    $(".list-group-item").each((i, el) => {
      const title = $(el).find(".title").text().trim();
      const duration = $(el).find(".duration").text().trim();
      const size = $(el).find(".size").text().trim();
      const link = $(el).find("a.btn-success").attr("href");
      const id = link ? link.split("/").pop() : null;

      if (title && id) {
        results.push({ id, title, duration, size });
      }
    });

    console.log(`✅ ${results.length} resultados`);
    res.json({ results });
  } catch (err) {
    console.error("❌ Error en /search:", err.message);
    res.status(500).json({ error: "Error al hacer scraping" });
  }
});

// 🧠 Genera token JWT válido para CDN API
function generarToken() {
  const payload = {
    origin: ORIGIN,
    sessionId: crypto.randomUUID(),
  };

  return jwt.sign(payload, SECRET, { expiresIn: "10m" });
}

// 🎧 Info y descarga directa desde CDN
app.get("/info/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Falta ID" });

  try {
    const token = generarToken();
    console.log(`🪙 Token generado OK para ${id}`);

    const { data } = await axios.get(`${CDN_API}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: ORIGIN,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
      },
    });

    // En algunos casos la API devuelve 401 si el token no se firma igual
    if (!data || !data.url) {
      console.warn("⚠️ No se obtuvo URL de descarga válida");
      return res.status(404).json({ error: "No se pudo obtener enlace" });
    }

    res.json({ audio: data.url, info: data });
  } catch (err) {
    console.error("❌ Error en /info:", err.response?.status, err.message);
    res.status(500).json({ error: "Fallo al obtener info del CDN" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Musikfy Scraper corriendo en puerto ${PORT}`)
);
