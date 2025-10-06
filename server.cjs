import express from "express";
import ytdl from "ytdl-core";

const app = express();

app.get("/api/audio", async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("Falta parámetro 'url'");

    // Obtener información del video
    const info = await ytdl.getInfo(videoUrl);
    
    // Buscar el stream de audio de mejor calidad (Opus/webm)
    const format = ytdl.chooseFormat(info.formats, {
      filter: "audioonly",
      quality: "highestaudio"
    });

    res.json({
      title: info.videoDetails.title,
      audioUrl: format.url
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error al obtener el audio");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server en puerto ${PORT}`));
