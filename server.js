import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Crea carpeta de descargas si no existe
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

// ✅ Búsqueda de canciones (YouTube -> API scdlapi.org)
app.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Falta el parámetro 'q'" });

  try {
    const url = `https://api-v2.scdlapi.org/yt/search?q=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url);
    res.json(data);
  } catch (err) {
    console.error("❌ Error en búsqueda:", err.message);
    res.status(500).json({ error: "Error al buscar canciones" });
  }
});

// ✅ Descarga de canción por ID
app.get("/download", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Falta el parámetro 'id'" });

  try {
    const apiUrl = `https://api-v2.scdlapi.org/yt/download?id=${id}`;
    const { data } = await axios.get(apiUrl);
    const mp3Url = data?.url;

    if (!mp3Url) return res.status(404).json({ error: "No se encontró enlace MP3" });

    const filePath = path.join(downloadsDir, `${id}.mp3`);
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
      url: mp3Url,
      method: "GET",
      responseType: "stream",
    });

    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log(`✅ MP3 guardado: ${filePath}`);
      res.download(filePath);
    });

    writer.on("error", (err) => {
      console.error("❌ Error al guardar MP3:", err.message);
      res.status(500).json({ error: "Fallo al guardar MP3" });
    });

  } catch (err) {
    console.error("❌ Error en descarga:", err.message);
    res.status(500).json({ error: "Fallo al convertir o descargar" });
  }
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🎵 API Loader1 activa y lista para descargar música 🎧");
});

app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
