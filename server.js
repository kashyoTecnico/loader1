import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    const searchUrl = `https://mp3juice.co/search?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    await page.waitForSelector('#results .result', { timeout: 8000 }).catch(() => null);

    const results = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('#results .result').forEach(el => {
        const title = el.querySelector('div')?.innerText || '';
        const mp3Url = el.querySelector('a[href^="https://eocc.eooc.cc/api/v1/download"]')?.href || '';
        if (title && mp3Url) items.push({ title, mp3Url });
      });
      return items;
    });

    res.json(results.length ? results : []);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch results' });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
