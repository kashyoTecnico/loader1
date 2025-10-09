import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as cheerio from "cheerio"; // <- Import correcto en ESM moderno

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("🎧 Musikfy server funcionando correctamente en Render 🚀");
});

// Buscar videos en Y2Mate
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta parámetro ?q=" });

  try {
    const response = await fetch(`https://y2mate.best/search/?query=${encodeURIComponent(query)}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];
    $(".video-result-item").each((i, el) => {
      const title = $(el).find(".video-title").text().trim();
      const id = $(el).attr("data-video-id");
      const thumbnail = $(el).find("img").attr("src");
      const author = $(el).find(".video-channel").text().trim();
      const duration = $(el).find(".video-duration").text().trim();
      results.push({ id, title, thumbnail, author, duration });
    });

    res.json({ results });
  } catch (err) {
    console.error("Error en /api/search:", err);
    res.status(500).json({ error: "Error al obtener resultados" });
  }
});

// Descargar audio de un ID
app.get("/api/download/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`https://y2mate.best/ajax/download?video=${id}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const downloadBtn = $(".btn-download-link");
    if (!downloadBtn.length) return res.json({ audio: null });

    const dataBase = downloadBtn.attr("data-base");
    const dataDetails = downloadBtn.attr("data-details");
    const audioUrl = `${dataBase}/videoplayback?video=${dataDetails}`;

    res.json({ audio: audioUrl });
  } catch (err) {
    console.error("Error en /api/download:", err);
    res.status(500).json({ audio: null });
  }
});

app.listen(PORT, () => console.log(`🎵 Musikfy server activo en puerto ${PORT}`));
