import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "🎵 Musikfy API activa — Scraper de MP3Juice" });
});

app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta el parámetro ?q=" });

  try {
    // 🔍 Simula lo que hace MP3Juice cuando escribes en el buscador
    const { data } = await axios.post("https://www.mp3juice.co/", new URLSearchParams({ q: query }).toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://www.mp3juice.co/",
        "Origin": "https://www.mp3juice.co"
      },
    });

    const $ = cheerio.load(data);

    // Extrae la lista de sugerencias <li> que se ve en el autocompletado
    const suggestions = [];
    $("form ul li").each((i, el) => {
      const text = $(el).text().trim();
      if (text) suggestions.push(text);
    });

    if (suggestions.length === 0) {
      return res.status(404).json({ message: "No se encontraron sugerencias o la estructura cambió" });
    }

    res.json({ query, suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener sugerencias desde MP3Juice" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Musikfy backend activo en puerto ${PORT}`));
