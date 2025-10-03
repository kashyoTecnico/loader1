const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// Middleware para habilitar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Ruta para obtener información de canciones y artistas
app.get('/scrape', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Falta el parámetro "query"' });
  }

  try {
    const url = `https://soundfly.es/search/${encodeURIComponent(query)}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const results = [];

    // Obtener canciones
    $('div.song-item').each((i, el) => {
      const title = $(el).find('h3').text().trim();
      const audioUrl = $(el).find('a').attr('href');
      const imageUrl = $(el).find('img').attr('src');
      results.push({ type: 'track', title, url: audioUrl, image: imageUrl });
    });

    // Obtener artistas
    $('div.artist-item').each((i, el) => {
      const name = $(el).find('h3').text().trim();
      const artistUrl = $(el).find('a').attr('href');
      const artistImage = $(el).find('img').attr('src');
      results.push({ type: 'artist', name, url: artistUrl, image: artistImage });
    });

    res.json(results);
  } catch (error) {
    console.error('Error al realizar el scraping:', error);
    res.status(500).json({ error: 'Error al obtener los datos' });
  }
});

// Iniciar el servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
