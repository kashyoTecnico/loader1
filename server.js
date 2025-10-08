import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import cheerio from "cheerio";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("🎧 Musikfy server funcionando.");
});

// Buscar videos
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta parámetro ?q=" });

  try {
    const html = await fetch(`https://y2mate.best/search/?query=${encodeURIComponent(query)}`).then(r => r.text());
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
    console.error(err);
    res.status(500).json({ error: "No se pudo obtener resultados." });
  }
});

// Obtener audio
app.get("/api/download/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const html = await fetch(`https://y2mate.best/ajax/download?video=${id}`).then(r => r.text());
    const $ = cheerio.load(html);
    const downloadBtn = $(".btn-download-link");
    if (!downloadBtn) return res.json({ audio: null });

    const dataBase = downloadBtn.attr("data-base");
    const dataDetails = downloadBtn.attr("data-details");
    const audioUrl = `${dataBase}/videoplayback?video=${dataDetails}`;

    res.json({ audio: audioUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ audio: null });
  }
});

app.listen(PORT, () => console.log(`🎵 Musikfy server corriendo en puerto ${PORT}`));
