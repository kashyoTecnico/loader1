import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;
const BASE_URL = process.env.BASE_URL || "https://www.y2mate.is";

/**
 * 🧠 1. Endpoint de búsqueda
 * Busca canciones y devuelve una lista con título, duración, thumbnail y videoId
 */
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ error: "Falta el parámetro q" });

  try {
    const { data } = await axios.get(`${BASE_URL}/search/${encodeURIComponent(query)}`);
    const $ = cheerio.load(data);

    const results = [];
    $(".result_form").each((_, el) => {
      const videoId = $(el).find('input[name="videoId"]').val();
      const title = $(el).find("h3").text().trim();
      const thumbnail = $(el).find("img").attr("src");
      const duration = $(el).find(".time").text().trim();

      if (videoId) {
        results.push({ title, videoId, thumbnail, duration });
      }
    });

    return res.json({ results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

/**
 * 🎧 2. Endpoint de descarga
 * Obtiene el enlace final en MP3 320kbps
 */
app.get("/api/download/:id", async (req, res) => {
  const videoId = req.params.id;
  if (!videoId) return res.json({ error: "Falta videoId" });

  try {
    const { data } = await axios.get(`${BASE_URL}/convert/${videoId}`);
    const $ = cheerio.load(data);

    let audio = null;

    $("button.y2link-download.custom").each((_, el) => {
      const note = $(el).attr("data-note");
      const base = $(el).attr("data-base");
      const details = $(el).attr("data-details");

      if (note === "320") {
        audio = `${base}?${details}`;
      }
    });

    if (!audio) {
      return res.json({ audio: null, message: "No se encontró enlace de 320kbps" });
    }

    return res.json({ audio });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

app.listen(PORT, () => console.log(`✅ Server ON: http://localhost:${PORT}`));
