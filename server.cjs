import express from "express";
import ytdl from "ytdl-core";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/audio", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Falta parámetro 'url'" });

  try {
    const info = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
    
    res.json({
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      audioUrl: format.url, // el link directo tipo "videoplayback?...itag=251..."
      thumbnail: info.videoDetails.thumbnails.pop().url
    });
  } catch (err) {
    console.error("❌ Error generando audio:", err);
    res.status(500).json({ error: "No se pudo obtener el audio" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server activo en puerto ${PORT}`));
