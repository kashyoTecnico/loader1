import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = "https://v3.mp3juices.click";

app.get("/", (req, res) =>
  res.send("🎧 Musikfy Scraper activo en mp3juices.click 🚀")
);

app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Falta parámetro q" });

  try {
    console.log(`🔎 Buscando: ${q}`);

    const { data } = await axios.get(`${BASE_URL}/search/${encodeURIComponent(q)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
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

      if (title && id) {
        results.push({
          id,
          title,
          duration,
          size,
          source: BASE_URL,
        });
      }
    });

    console.log(`✅ ${results.length} resultados`);
    return res.json({ results });
  } catch (err) {
    console.error("❌ Error en /search:", err.message);
    return res.status(500).json({ error: "Error al hacer scraping" });
  }
});

app.post("/download/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Falta ID de canción" });

  try {
    console.log(`🎶 Buscando enlace de descarga para ID: ${id}`);

    const { data } = await axios.get(`${BASE_URL}/download/${id}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
      },
      timeout: 20000,
    });

    const $ = cheerio.load(data);
    const audio = $("a.btn-success").attr("href");

    if (!audio) {
      console.log("⚠️ No se encontró enlace de audio");
      return res.status(404).json({ error: "No se encontró audio" });
    }

    console.log(`✅ Enlace de audio encontrado`);
    return res.json({ audio });
  } catch (err) {
    console.error("❌ Error en /download:", err.message);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Musikfy Scraper corriendo en puerto ${PORT}`)
);
