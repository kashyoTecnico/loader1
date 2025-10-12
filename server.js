import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "🎵 Musikfy API activa — conexión con MP3Juice establecida" });
});

app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta el parámetro ?q=" });

  try {
    // Llamada al endpoint AJAX de MP3Juice
    const apiUrl = `https://www.mp3juice.co/api/ajax_search.php?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://www.mp3juice.co/",
      },
    });

    // Si la respuesta ya es JSON (como en tu ejemplo)
    if (data && data.yt) {
      const results = data.yt.map(item => ({
        id: item.id,
        title: item.title,
        thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        youtube_url: `https://www.youtube.com/watch?v=${item.id}`,
      }));

      return res.json({
        query,
        count: data.count,
        results,
      });
    } else {
      return res.status(404).json({ message: "No se encontraron resultados válidos" });
    }
  } catch (error) {
    console.error("❌ Error al obtener resultados:", error.message);
    res.status(500).json({ error: "Error al conectar con MP3Juice API" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Musikfy backend activo en puerto ${PORT}`));
