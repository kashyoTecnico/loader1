import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { JSDOM } from "jsdom";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Musikfy Server funcionando correctamente.");
});

// Endpoint para buscar canciones/videos
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta parámetro ?q=" });

  try {
    const response = await fetch(`https://y2mate.best/search/?query=${encodeURIComponent(query)}`);
    const text = await response.text();

    const dom = new JSDOM(text);
    const document = dom.window.document;

    const items = Array.from(document.querySelectorAll(".video-item")); // Ajusta según la clase real
    const results = items.map((item) => ({
      id: item.getAttribute("data-id"),
      title: item.querySelector(".video-title")?.textContent || "Sin título",
      thumbnail: item.querySelector("img")?.src || "",
      author: item.querySelector(".video-author")?.textContent || "",
      duration: item.querySelector(".video-duration")?.textContent || "",
    }));

    res.json({ results });
  } catch (err) {
    console.error("Error en búsqueda:", err);
    res.status(500).json({ error: "No se pudo obtener resultados." });
  }
});

// Endpoint para obtener URL directa de audio
app.get("/api/download/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(`https://y2mate.best/download/${id}`);
    const text = await response.text();

    const dom = new JSDOM(text);
    const document = dom.window.document;

    const audioBtn = document.querySelector("button[data-note='320'][data-format='mp3']");
    const audioUrl = audioBtn?.getAttribute("data-attr"); // Aquí está la URL real de descarga

    if (!audioUrl) return res.json({ audio: null });

    res.json({
      audio: audioUrl,
    });
  } catch (err) {
    console.error("Error obteniendo audio:", err);
    res.status(500).json({ error: "No se pudo obtener el enlace de descarga." });
  }
});

app.listen(PORT, () => {
  console.log(`🎧 Musikfy server corriendo en puerto ${PORT}`);
});
