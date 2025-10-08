// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import cheerio from "cheerio";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Musikfy Server funcionando correctamente.");
});

// Endpoint de búsqueda de canciones
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta parámetro ?q=" });

  try {
    const searchUrl = `https://y2mate.best/search/?query=${encodeURIComponent(
      query
    )}`;

    const { data } = await axios.get(searchUrl);
    const $ = cheerio.load(data);

    const results = [];
    $(".item").each((i, el) => {
      const title = $(el).find(".title").text().trim();
      const id = $(el).find("a").attr("href")?.split("/video/")[1];
      const thumbnail = $(el).find("img").attr("src");
      const author = $(el).find(".channel").text().trim();
      if (id && title) {
        results.push({ id, title, thumbnail, author });
      }
    });

    res.json({ results });
  } catch (err) {
    console.error("Error en búsqueda:", err);
    res.status(500).json({ error: "No se pudo obtener resultados." });
  }
});

// Endpoint para obtener URL directa de MP3
app.get("/api/download/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const videoPage = `https://y2mate.best/video/${id}`;
    const { data } = await axios.get(videoPage);
    const $ = cheerio.load(data);

    // Obtener URL del botón de descarga MP3 320kbps
    const audioButton = $("button.btn-success.y2link-download")
      .filter((i, el) => $(el).attr("data-note") === "320" && $(el).attr("data-format") === "mp3")
      .first();

    const audioUrl = audioButton.attr("data-href") || null;

    res.json({ audio: audioUrl });
  } catch (err) {
    console.error("Error obteniendo stream:", err);
    res.status(500).json({ error: "No se pudo obtener el enlace de descarga." });
  }
});

app.listen(PORT, () => {
  console.log(`🎧 Musikfy server corriendo en puerto ${PORT}`);
});
