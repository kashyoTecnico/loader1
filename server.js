import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "🎵 API scraper de música activo" });
});

// Endpoint principal
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta el parámetro q" });

  try {
    // 🔍 ejemplo: busca en una página pública (ajustaremos después)
    const url = `https://www.musica.com/letras.asp?letra=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const results = [];

    $("a.enlaceCancion").each((i, el) => {
      const title = $(el).text();
      const link = $(el).attr("href");
      results.push({
        title,
        link: `https://www.musica.com/${link}`,
      });
    });

    res.json({ query, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener resultados" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
