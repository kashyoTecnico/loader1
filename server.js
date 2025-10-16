import express from "express";
import cors from "cors";
import { YTDlpWrap } from "yt-dlp-wrap";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Configuración base
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const TMP = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);

ffmpeg.setFfmpegPath(ffmpegPath);

// 🧩 Inicializa yt-dlp
const ytDlp = new YTDlpWrap();
YTDlpWrap.downloadFromGithub().catch(() => {
  console.log("yt-dlp ya estaba descargado");
});

// ✅ Ruta principal
app.get("/", (req, res) => {
  res.json({
    status: "✅ Loader activo",
    version: "2.0",
    endpoints: ["/download?q=nombre+de+cancion"],
  });
});

// 🎵 Buscar y convertir canción completa a MP3
app.get("/download", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta el parámetro ?q" });

  try {
    const filename = `${Date.now()}.mp3`;
    const filePath = path.join(TMP, filename);

    console.log(`🎧 Buscando y descargando: ${query}`);

    // 🔹 Descarga y convierte directamente desde YouTube
    await ytDlp.execPromise([
      `ytsearch1:${query}`,
      "-x",
      "--audio-format",
      "mp3",
      "-o",
      filePath,
    ]);

    if (!fs.existsSync(filePath)) throw new Error("No se generó el MP3");

    // 🔹 Envía el archivo MP3 completo
    res.setHeader("Content-Type", "audio/mpeg");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on("close", () => {
      fs.unlink(filePath, () => {});
      console.log(`🗑️ Archivo temporal eliminado: ${filename}`);
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Fallo al convertir" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
