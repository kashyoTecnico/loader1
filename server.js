import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ✅ Buscar canciones en SoundCloud
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta parámetro ?q" });

  try {
    const url = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(query)}`;
    const html = await (await fetch(url)).text();

    // Extrae enlaces de tracks
    const matches = [...html.matchAll(/href="(\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)"/g)];
    const unique = [...new Set(matches.map((m) => m[1]))].slice(0, 10);

    const results = unique.map((path) => ({
      title: decodeURIComponent(path.split("/")[1]).replace(/-/g, " "),
      url: `https://soundcloud.com${path}`,
    }));

    res.json({ results });
  } catch (err) {
    console.error("❌ Error en búsqueda:", err);
    res.status(500).json({ error: "No se pudieron obtener los resultados" });
  }
});

// ✅ Descargar desde Cobalt.tools (nueva API)
app.get("/download", async (req, res) => {
  const trackUrl = req.query.url;
  if (!trackUrl) return res.status(400).json({ error: "Falta parámetro ?url" });

  try {
    const cobaltAPI = "https://api.cobalt.tools/api/json";
    const response = await fetch(cobaltAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://cobalt.tools",
      },
      body: JSON.stringify({
        url: trackUrl,
        vCodec: "none",     // solo audio
        aFormat: "mp3",     // formato mp3
        filenamePattern: "basic",
        isAudioOnly: true,
      }),
    });

    const data = await response.json();
    if (!data.url) throw new Error("No se pudo obtener enlace de descarga");

    res.json({
      status: "ok",
      title: data.meta?.title || "Desconocido",
      downloadUrl: data.url,
    });
  } catch (err) {
    console.error("❌ Error al descargar:", err);
    res.status(500).json({ error: "Fallo al convertir o descargar" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
