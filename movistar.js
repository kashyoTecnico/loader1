// index.js - simple reverse proxy
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use("/", createProxyMiddleware({
  target: "web.whatsapp.com",
  changeOrigin: true
}));

app.listen(10000, () => console.log("Proxy OK"));
