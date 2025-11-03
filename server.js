import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// ✅ Buscar canciones usando SCDLAPI
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta parámetro ?q" });

  try {
    const { data } = await axios.get(`https://api.scdlapi.org/search/tracks`, {
      params: { q: query, limit: 10 }
    });

    if (!data || !data.results || data.results.length === 0)
      return res.status(404).json({ error: "No se encontraron canciones" });

    const results = data.results.map(track => ({
      title: track.title,
      artist: track.user.username,
      duration: track.duration,
      url: track.permalink_url
    }));

    res.json({ results });
  } catch (err) {
    console.error("❌ Error al buscar:", err.message);
    res.status(500).json({ error: "Error al buscar canciones" });
  }
});

// ✅ Descargar canción desde SCDLAPI
app.get("/download", async (req, res) => {
  const trackUrl = req.query.url;
  if (!trackUrl) return res.status(400).json({ error: "Falta parámetro ?url" });

  try {
    const { data } = await axios.get(`https://api.scdlapi.org/info`, {
      params: { url: trackUrl }
    });

    if (!data || !data.download) throw new Error("No se pudo obtener enlace de descarga");

    res.json({ downloadUrl: data.download });
  } catch (err) {
    console.error("❌ Error al descargar:", err.message);
    res.status(500).json({ error: "Fallo al convertir o descargar" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
