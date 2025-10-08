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

// Ruta principal
app.get("/", (req, res) => {
  res.send("✅ Musikfy Server funcionando con y2mate.best");
});

// Endpoint de búsqueda
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Falta parámetro ?q=" });

  try {
    const url = `https://y2mate.best/search/?query=${encodeURIComponent(query)}`;
    const html = await (await fetch(url)).text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const items = Array.from(document.querySelectorAll(".search-result-item")).map(el => {
      return {
        id: el.querySelector("a")?.href.split("/").pop(),
        title: el.querySelector(".title")?.textContent,
        thumbnail: el.querySelector("img")?.src,
        author: el.querySelector(".channel")?.textContent,
      };
    });

    res.json({ results: items });
  } catch (err) {
    console.error("Error en búsqueda:", err);
    res.status(500).json({ error: "No se pudo obtener resultados." });
  }
});

// Endpoint para obtener enlace de descarga MP3
app.get("/api/download/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `https://y2mate.best/watch/${id}`;
    const html = await (await fetch(url)).text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const button = document.querySelector("button.y2link-download[data-format='mp3']");
    const downloadUrl = button?.getAttribute("data-attr");

    res.json({
      title: document.querySelector("h1.title")?.textContent,
      audio: downloadUrl || null,
    });
  } catch (err) {
    console.error("Error obteniendo descarga:", err);
    res.status(500).json({ error: "No se pudo obtener el enlace de descarga." });
  }
});

app.listen(PORT, () => {
  console.log(`🎧 Musikfy server corriendo en puerto ${PORT}`);
});
