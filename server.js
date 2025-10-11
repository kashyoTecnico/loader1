import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Server is running'));

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const { data } = await axios.get(`https://mp3juice.co/search?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(data);

    const results = [];
    $('#results .result').each((i, elem) => {
      const title = $(elem).find('div').first().text().trim();
      const playHref = $(elem).find('a[id]').attr('href') || '';
      const mp3Href = $(elem).find('a.clicked').attr('href') || '';
      results.push({ title, playUrl: playHref, mp3Url: mp3Href });
    });

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
