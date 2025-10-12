import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "AIzaSyCAIiQc5yce1Cyrku5KAFjw1kFwepW9p_g";

// Ruta principal
app.get("/", (req, res) => {
  res.send("🎵 Musikfy API funcionando correctamente");
});

// Ruta de búsqueda de canciones o artistas
app.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Falta el parámetro de búsqueda 'q'" });
  }

  try {
    // Endpoint oficial de búsqueda en YouTube
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(
      query
    )}&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return res.status(404).json({ message: "No se encontraron resultados" });
    }

    // Adaptar los resultados al formato tipo MP3Juice
    const results = data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
    }));

    res.json({ count: results.length, results });
  } catch (err) {
    console.error("Error en /search:", err);
    res.status(500).json({ error: "Error al conectar con YouTube API" });
  }
});

// Render/Render.com usa este puerto
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Musikfy API escuchando en el puerto ${PORT}`);
});
