import express from 'express';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chrome-aws-lambda';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(`https://mp3juice.co/search?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#results .result', { timeout: 15000 });

    const results = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#results .result')).map(r => {
        const title = r.querySelector('div')?.innerText || '';
        const mp3Url = r.querySelector('a.clicked')?.href || '';
        const playUrl = r.querySelector('a[id]')?.href || '';
        return { title, mp3Url, playUrl };
      });
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
