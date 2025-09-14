// server.cjs
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

// axios defaults (usa cabecera de navegador para evitar bloqueos básicos)
axios.defaults.headers.common['User-Agent'] =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
axios.defaults.timeout = 20000; // 20s

// Capturadores globales para evitar que el proceso muera sin log
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at Promise', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});

// Rutas de comprobación
app.get('/', (_req, res) => res.json({ ok: true, message: 'musikfy server' }));
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Endpoint de probe rápido para testear si desde el container se puede llegar a ceenaija
app.get('/probe', async (_req, res) => {
  try {
    const r = await axios.get('https://www.ceenaija.com/', { timeout: 15000 });
    res.json({ ok: true, status: r.status, length: (r.data || '').length });
  } catch (err) {
    console.error('Probe error:', err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
  }
});

// /search?q=...
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);
  try {
    const url = `https://www.ceenaija.com/?s=${encodeURIComponent(query)}`;
    console.log('Fetching search URL:', url);

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const tracks = [];

    $(".td-ss-main-content .item-details").each((i, el) => {
      const $el = $(el);
      const title = $el.find(".entry-title a").text().trim();
      const href = ($el.find(".entry-title a").attr("href") || "").trim();
      if (title && href) tracks.push({ title, url: href });
    });

    // fallback selector (si el markup cambió)
    if (tracks.length === 0) {
      $(".td-module-title a").each((i, el) => {
        const title = $(el).text().trim();
        const href = ($(el).attr("href") || "").trim();
        if (title && href) tracks.push({ title, url: href });
      });
    }

    console.log('Found tracks:', tracks.length);
    res.json(tracks);
  } catch (err) {
    console.error('Error in /search:', err && err.message ? err.message : err);
    res.status(502).json({
      status: 'error',
      code: 502,
      message: 'Failed to fetch remote site or parse results',
      detail: err && err.message ? err.message : String(err)
    });
  }
});

// /track?url=...
app.get('/track', async (req, res) => {
  const href = req.query.url;
  if (!href) return res.status(400).json({ error: "No URL provided" });

  try {
    console.log('Fetching track page:', href);
    const r = await axios.get(href);
    const $ = cheerio.load(r.data);

    const title =
      ($("h1.entry-title").text() || "").trim() ||
      ($("title").text() || "").trim() ||
      "Unknown";

    // intenta obtener el src del <audio>, primer intento con clase wp-block-audio
    let audio = $('figure.wp-block-audio audio').attr('src') || '';
    if (!audio) {
      audio = $('audio').first().attr('src') || '';
    }

    // image: intenta imagen destacada o meta og:image
    const image =
      $('img.wp-post-image').attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      '';

    res.json({ title, url: audio || '', image: image || '' });
  } catch (err) {
    console.error('Error in /track:', err && err.message ? err.message : err);
    res.status(502).json({
      status: 'error',
      code: 502,
      message: 'Failed to fetch track page or parse it',
      detail: err && err.message ? err.message : String(err)
    });
  }
});

// listen
const port = process.env.PORT || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => console.log(`Server running on http://${host}:${port}`));
