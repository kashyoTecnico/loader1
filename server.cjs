// server.cjs
// Simple proxy streamer para audio. Diseño para deploy en Render (web service).
// Nota: evita que el frontend haga CORS directo al origen y permite reenviar Range headers.

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

// Health
app.get("/", (req, res) => res.send("Musikfy loader running"));

// /proxy?url=<base64-url>
// Recibe la URL destino codificada en base64 para evitar que la query contenga caracteres raros.
// Reenvía headers importantes como Range para streaming parcial.
app.get("/proxy", async (req, res) => {
  try {
    const b64 = req.query.url;
    if (!b64) return res.status(400).send("Missing url param");
    const url = Buffer.from(b64, "base64").toString("utf8");

    // Construir headers para upstream (forward range & user-agent if present)
    const forwardHeaders = {};
    if (req.headers.range) forwardHeaders["range"] = req.headers.range;
    if (req.headers["user-agent"]) forwardHeaders["user-agent"] = req.headers["user-agent"];
    if (req.headers["accept"]) forwardHeaders["accept"] = req.headers["accept"];

    const upstreamResp = await fetch(url, { headers: forwardHeaders, compress: false });

    // Pasar estado y headers mínimos al cliente
    res.status(upstreamResp.status);
    // Copiar algunos headers útiles (content-type, content-length, accept-ranges)
    const ct = upstreamResp.headers.get("content-type");
    const cl = upstreamResp.headers.get("content-length");
    const accRanges = upstreamResp.headers.get("accept-ranges");
    const range = upstreamResp.headers.get("content-range");

    if (ct) res.setHeader("content-type", ct);
    if (cl) res.setHeader("content-length", cl);
    if (accRanges) res.setHeader("accept-ranges", accRanges);
    if (range) res.setHeader("content-range", range);

    // Stream del body directamente al cliente
    const body = upstreamResp.body;
    if (!body) {
      return res.status(502).send("No body from upstream");
    }
    body.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error");
  }
});

// Puerto (Render proporciona process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Musikfy loader listening on ${PORT}`));
