const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const puppeteer = require("puppeteer"); // Puppeteer completo

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Musikfy loader running"));

// Endpoint /tracks?q=...
app.get("/tracks", async (req, res) => {
  const query = req.query.q || "";
  if (!query) return res.status(400).send("Missing search query");

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(
      `https://ytify.netlify.app/search?q=${encodeURIComponent(query)}`,
      { waitUntil: "networkidle2" }
    );
    await page.waitForSelector(".track", { timeout: 15000 });

    const tracks = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".track"))
        .map((el) => ({
          title: el.querySelector(".title")?.innerText || "",
          artist: el.querySelector(".artist")?.innerText || "",
          audioUrl: el.querySelector("audio")?.src || "",
        }))
        .filter((t) => t.audioUrl)
    );

    res.json(tracks);
  } catch (err) {
    console.error("Error fetching tracks:", err);
    res.status(500).send("Error fetching tracks");
  } finally {
    if (browser) await browser.close();
  }
});

// Proxy
app.get("/proxy", async (req, res) => {
  try {
    const b64 = req.query.url;
    if (!b64) return res.status(400).send("Missing url param");
    const url = Buffer.from(b64, "base64").toString("utf8");

    const fetch = (await import("node-fetch")).default;
    const forwardHeaders = {};
    if (req.headers.range) forwardHeaders["range"] = req.headers.range;
    if (req.headers["user-agent"]) forwardHeaders["user-agent"] = req.headers["user-agent"];
    if (req.headers.accept) forwardHeaders["accept"] = req.headers.accept;

    const upstreamResp = await fetch(url, { headers: forwardHeaders });
    res.status(upstreamResp.status);

    const ct = upstreamResp.headers.get("content-type");
    const cl = upstreamResp.headers.get("content-length");
    const accRanges = upstreamResp.headers.get("accept-ranges");
    const range = upstreamResp.headers.get("content-range");

    if (ct) res.setHeader("content-type", ct);
    if (cl) res.setHeader("content-length", cl);
    if (accRanges) res.setHeader("accept-ranges", accRanges);
    if (range) res.setHeader("content-range", range);

    upstreamResp.body.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error");
  }
});

// Ping cada 10 minutos para mantenerse vivo
setInterval(async () => {
  try {
    const fetch = (await import("node-fetch")).default;
    await fetch(`http://localhost:${process.env.PORT || 10000}/`);
    console.log("Self-pinged to stay alive");
  } catch (err) {
    console.error("Self-ping failed:", err);
  }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Musikfy loader listening on ${PORT}`));
