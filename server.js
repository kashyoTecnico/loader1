// server.js usando ESM + Puppeteer
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import puppeteer from "puppeteer";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BASE_URL = process.env.BASE_URL || "https://y2mate.best";

app.get("/", (req, res) => res.send("🎵 Musikfy Loader activo usando y2mate.best 🚀"));

/**
 * 🧠 Endpoint de búsqueda
 * Busca canciones y devuelve una lista con título, duración, thumbnail y videoId
 */
app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) return res.status(400).json({ error: "Falta parámetro q" });

  try {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"], headless: true });
    const page = await browser.newPage();

    await page.goto(`${BASE_URL}/search/?query=${encodeURIComponent(query)}`, {
      waitUntil: "networkidle2",
    });

    // Esperamos que carguen los resultados dinámicos
    await page.waitForSelector(".result_form, .col-xs-6, .col-sm-4, .col-md-3", { timeout: 10000 }).catch(() => {});

    const results = await page.evaluate(() => {
      const arr = [];
      const nodes = document.querySelectorAll(".result_form, .col-xs-6.col-sm-4.col-md-3");
      nodes.forEach(el => {
        const videoIdInput = el.querySelector('input[name="videoId"]');
        const videoId = videoIdInput ? videoIdInput.value : null;
        const titleEl = el.querySelector(".search-info h3") || el.querySelector("h3");
        const title = titleEl ? titleEl.innerText.trim() : "";
        const thumbEl = el.querySelector("img.vi_thumimage") || el.querySelector("img");
        const thumbnail = thumbEl ? thumbEl.src : "";
        const durationEl = el.querySelector(".time");
        const duration = durationEl ? durationEl.innerText.trim() : "";

        if (videoId) arr.push({ videoId, title, thumbnail, duration });
      });
      return arr;
    });

    await browser.close();
    return res.json({ results });
  } catch (err) {
    console.error("Search error:", err.message || err);
    return res.status(500).json({ error: "Error al buscar" });
  }
});

/**
 * 🎧 Endpoint de descarga
 * Obtiene enlace final MP3 320kbps
 */
app.get("/api/download/:id", async (req, res) => {
  const videoId = req.params.id;
  if (!videoId) return res.status(400).json({ error: "Falta videoId" });

  try {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"], headless: true });
    const page = await browser.newPage();

    await page.goto(`${BASE_URL}/convert/?videoId=${encodeURIComponent(videoId)}`, {
      waitUntil: "networkidle2",
    });

    // Esperamos que cargue el botón de MP3 320
    await page.waitForSelector('button.y2link-download.custom[data-note="320"]', { timeout: 10000 });

    const audio = await page.evaluate(() => {
      const btn = document.querySelector('button.y2link-download.custom[data-note="320"]');
      if (!btn) return null;
      const base = btn.getAttribute("data-base");
      const details = btn.getAttribute("data-details");
      return base && details ? `${base}?${details}` : null;
    });

    await browser.close();
    return res.json({ audio });
  } catch (err) {
    console.error("Download error:", err.message || err);
    return res.status(500).json({ error: "Error al obtener audio" });
  }
});

app.listen(PORT, () => console.log(`✅ Server ON: http://localhost:${PORT}`));
