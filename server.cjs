const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Endpoint de búsqueda
app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query missing' });

    const url = `https://www.ceenaija.com/?s=${encodeURIComponent(query)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const results = [];

        $('.td-ss-main-content .item-details h3.entry-title a').each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');
            results.push({ title, href });
        });

        res.json(results);
    } catch (error) {
        console.log('Error search:', error.message);
        res.status(500).json({ error: 'Failed to fetch search results' });
    }
});

// Endpoint para obtener MP3 de una página de canción
app.get('/track', async (req, res) => {
    const trackUrl = req.query.url;
    if (!trackUrl) return res.status(400).json({ error: 'Track URL missing' });

    try {
        const { data } = await axios.get(trackUrl);
        const $ = cheerio.load(data);
        const audioElement = $('figure.wp-block-audio audio').first();
        const audioUrl = audioElement.attr('src');
        const title = $('h1.entry-title').text().trim() || audioUrl.split('/').pop();

        if (!audioUrl) return res.status(404).json({ error: 'Audio not found' });

        res.json({ title, url: audioUrl });
    } catch (error) {
        console.log('Error track:', error.message);
        res.status(500).json({ error: 'Failed to fetch track' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
