import express from "express";
import ytdl from "ytdl-core";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/track", async (req, res) => {
  try {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).json({ error: "Missing video ID" });

    const info = await ytdl.getInfo(videoId);
    const format = ytdl.chooseFormat(info.formats, { quality: "highestaudio" });

    const data = {
      title: info.videoDetails.title,
      artist: info.videoDetails.author.name,
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
      audio: format.url,
    };

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch track audio" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
