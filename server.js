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
    const url = "https://www.mp3juice.co/";
    const { data } = await axios.post(url, new URLSearchParams({ q: query }).toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.mp3juice.co/",
      },
    });

    const $ = cheerio.load(data);
    const results = [];

    // El contenedor principal de resultados puede variar, pero suele ser algo como:
    $(".video").each((i, el) => {
      const title = $(el).find(".title").text().trim();
      const duration = $(el).find(".duration").text().trim();
      const link = $(el).find("a.download_button").attr("href");
      const thumbnail = $(el).find("img").attr("src");

      if (title) {
        results.push({
          title,
          duration,
          link: link ? `https://www.mp3juice.co${link}` : null,
          thumbnail,
        });
      }
    });

    if (results.length === 0) {
      return res.status(404).json({ message: "No se encontraron resultados o estructura cambió" });
    }

    res.json({ query, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al scrapear MP3Juice" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Musikfy backend activo en puerto ${PORT}`));
