const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());

app.get("/", (req, res) => res.send("Musikfy loader running"));

// Proxy
app.get("/proxy", async (req, res) => {
  try {
    const b64 = req.query.url;
    if (!b64) return res.status(400).send("Missing url param");
    const url = Buffer.from(b64, "base64").toString("utf8");

    const forwardHeaders = {};
    if (req.headers.range) forwardHeaders["range"] = req.headers.range;
    if (req.headers["user-agent"]) forwardHeaders["user-agent"] = req.headers["user-agent"];
    if (req.headers["accept"]) forwardHeaders["accept"] = req.headers["accept"];

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Musikfy loader listening on ${PORT}`));
