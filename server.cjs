// server.cjs
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer'); // Instalar puppeteer
const fetch = require('node-fetch');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Musikfy loader running'));

// Endpoint para scrapear Ytify dinámicamente
app.get('/tracks', async (req, res) => {
  try {
    const searchQuery = req.query.q || ''; // Permite buscar algo
    const url = `https://ytify.netlify.app/search?q=${encodeURIComponent(searchQuery)}`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Aquí extraemos los tracks que la web carga dinámicamente
    const tracks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.track-item')).map(el => {
        const titleEl = el.querySelector('.track-title');
        const artistEl = el.querySelector('.track-artist');
        const audioEl = el.querySelector('audio');

        return {
          title: titleEl ? titleEl.textContent.trim() : '',
          artist: artistEl ? artistEl.textContent.trim() : '',
          audioUrl: audioEl ? audioEl.src : ''
        };
      });
    });

    await browser.close();
    res.json(tracks.filter(t => t.title && t.audioUrl)); // solo tracks válidos
  } catch (err) {
    console.error('Error scraping tracks:', err);
    res.status(500).send('Error fetching tracks');
  }
});

// Proxy para reproducir audio
app.get('/proxy', async (req, res) => {
  try {
    const b64 = req.query.url;
    if (!b64) return res.status(400).send('Missing url param');
    const url = Buffer.from(b64, 'base64').toString('utf8');

    const forwardHeaders = {};
    if (req.headers.range) forwardHeaders['range'] = req.headers.range;
    if (req.headers['user-agent']) forwardHeaders['user-agent'] = req.headers['user-agent'];
    if (req.headers['accept']) forwardHeaders['accept'] = req.headers['accept'];

    const upstreamResp = await fetch(url, { headers: forwardHeaders });
    res.status(upstreamResp.status);

    const ct = upstreamResp.headers.get('content-type');
    const cl = upstreamResp.headers.get('content-length');
    const accRanges = upstreamResp.headers.get('accept-ranges');
    const range = upstreamResp.headers.get('content-range');

    if (ct) res.setHeader('content-type', ct);
    if (cl) res.setHeader('content-length', cl);
    if (accRanges) res.setHeader('accept-ranges', accRanges);
    if (range) res.setHeader('content-range', range);

    upstreamResp.body.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Musikfy loader listening on ${PORT}`));
