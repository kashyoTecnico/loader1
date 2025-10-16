import express from "express";
import cors from "cors";
import pkg from "yt-dlp-wrap";
const { YTDlpWrap } = pkg;

import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config(); // Carga variables del .env si existen

// 🧠 Configuración base
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());

// ⚙️ Render asigna el puerto automáticamente
const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ No se encontró el puerto (Render debe asignarlo automáticamente)");
  process.exit(1);
}

// 🗂️ Carpeta temporal para MP3
const TMP = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);

ffmpeg.setFfmpegPath(ffmpegPath);

// 🎧 Inicializa yt-dlp
const ytDlp = new YTDlpWrap();
YTDlpWrap.downloadFromGithub().catch(() => {
  console.log("📦 yt-dlp ya disponible localmente");
});

// ✅ Ruta principal
app.get("/", (req, res) => {
  res.json({
    status: "✅ Loader activo y funcional",
    version: "2.1",
    ejemplo: "/download?q=avicii+levels",
  });
});

// 🎵 Descargar y convertir canción completa
app.get("/download", async (req, res) => {
  const query = req.query.q;
  if (!query)
    return res.status(400).json({ error: "Falta el parámetro ?q" });

  try {
    const filename = `${Date.now()}.mp3`;
    const filePath = path.join(TMP, filename);

    console.log(`🎧 Descargando: ${query}`);

    // 🔹 Descarga el audio desde YouTube y lo convierte a MP3
    await ytDlp.execPromise([
      `ytsearch1:${query}`,
      "-x",
      "--audio-format",
      "mp3",
      "-o",
      filePath,
    ]);

    if (!fs.existsSync(filePath)) throw new Error("No se generó el MP3");

    // 🔹 Enviar el archivo como stream
    res.setHeader("Content-Type", "audio/mpeg");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    // 🔹 Borrar el archivo después de enviarlo
    stream.on("close", () => {
      fs.unlink(filePath, () => {});
      console.log(`🗑️ Archivo temporal eliminado: ${filename}`);
    });
  } catch (err) {
    console.error("❌ Error al convertir:", err);
    res.status(500).json({ error: "Fallo al convertir o descargar" });
  }
});

// 🚀 Iniciar servidor (Render maneja el puerto)
app.listen(PORT, () =>
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`)
);
