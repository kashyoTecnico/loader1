import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Buscar tracks
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const searchUrl = `https://mp3juice.co/search?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // Esperar que cargue resultados
    await page.waitForSelector('#results .result', { timeout: 5000 }).catch(() => null);

    const results = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('#results .result').forEach(el => {
        const title = el.querySelector('div')?.innerText || '';
        const mp3Url = el.querySelector('a[href^="https://eocc.eooc.cc/api/v1/download"]')?.href || '';
        items.push({ title, mp3Url });
      });
      return items;
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  } finally {
    if (browser) await browser.close();
  }
});

// Endpoint simple para test /track (opcional)
app.get('/track', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  res.json({ downloadUrl: url });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
