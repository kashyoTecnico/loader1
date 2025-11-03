import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// ✅ Ruta para buscar canciones (por nombre)
app.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Falta el parámetro 'q'" });

  try {
    const url = `https://api-v2.scdlapi.org/yt/search?q=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url);
    res.json(data);
  } catch (err) {
    console.error("Error en búsqueda:", err.message);
    res.status(500).json({ error: "Error al buscar canciones" });
  }
});

// ✅ Ruta para descargar canción por ID
app.get("/download", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Falta el parámetro 'id'" });

  try {
    // obtiene enlace de descarga MP3 completo
    const url = `https://api-v2.scdlapi.org/yt/download?id=${id}`;
    const { data } = await axios.get(url);
    const mp3Url = data?.url;

    if (!mp3Url) return res.status(404).json({ error: "No se pudo obtener enlace MP3" });

    // descarga el MP3
    const filePath = path.resolve(`downloads/${id}.mp3`);
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
      url: mp3Url,
      method: "GET",
      responseType: "stream",
    });

    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log(`✅ Descargado: ${filePath}`);
      res.download(filePath);
    });

    writer.on("error", (err) => {
      console.error("Error al guardar MP3:", err.message);
      res.status(500).json({ error: "Fallo al guardar MP3" });
    });

  } catch (err) {
    console.error("Error al descargar:", err.message);
    res.status(500).json({ error: "Fallo al convertir o descargar" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
