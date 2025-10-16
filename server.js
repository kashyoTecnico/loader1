import express from "express";
import YTDlpWrap from "yt-dlp-wrap";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

const app = express();
const ytDlp = new YTDlpWrap();
const TMP = "./tmp";
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);

ffmpeg.setFfmpegPath(ffmpegPath);

// 🔍 Buscar y convertir canción
app.get("/download", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta el parámetro ?q" });

  try {
    const filename = `${Date.now()}.mp3`;
    const filePath = path.join(TMP, filename);

    // 🔹 Descargar audio desde YouTube en mp3
    await ytDlp.execPromise([
      `ytsearch1:${query}`,
      "-x",
      "--audio-format", "mp3",
      "-o", filePath
    ]);

    if (!fs.existsSync(filePath)) throw new Error("Error al crear MP3");

    res.setHeader("Content-Type", "audio/mpeg");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    // 🔹 Borra archivo temporal luego
    stream.on("close", () => fs.unlink(filePath, () => {}));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fallo al convertir" });
  }
});

app.listen(3000, () => console.log("Servidor en puerto 3000"));
