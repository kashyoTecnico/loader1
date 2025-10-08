import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ✅ Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Musikfy Server funcionando correctamente.");
});

// ✅ Endpoint para buscar canciones o videos
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta parámetro ?q=" });

  try {
    const response = await fetch(
      `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    const results = data.items
      .filter((item) => item.type === "video")
      .map((item) => ({
        id: item.id,
        title: item.title,
        thumbnail: item.thumbnail,
        author: item.uploader,
        duration: item.duration,
      }));

    res.json({ results });
  } catch (err) {
    console.error("Error en búsqueda:", err);
    res.status(500).json({ error: "No se pudo obtener resultados." });
  }
});

// ✅ Endpoint para obtener URL directa de descarga o streaming
app.get("/api/download/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(`https://pipedapi.kavin.rocks/streams/${id}`);
    const data = await response.json();

    res.json({
      title: data.title,
      audio: data.audioStreams?.[0]?.url || null,
      video: data.videoStreams?.[0]?.url || null,
      thumbnail: data.thumbnailUrl,
      duration: data.duration,
    });
  } catch (err) {
    console.error("Error obteniendo stream:", err);
    res.status(500).json({ error: "No se pudo obtener el enlace de descarga." });
  }
});

app.listen(PORT, () => {
  console.log(`🎧 Musikfy server corriendo en puerto ${PORT}`);
});
