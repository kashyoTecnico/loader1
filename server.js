import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// Proxy hacia el host SNI
app.use("/", createProxyMiddleware({
  target: "https://u.mitec.com.mx",
  changeOrigin: true,
  secure: false, // ignora SSL inválido
  headers: {
    Host: "u.mitec.com.mx",
    "User-Agent": "Mozilla/5.0",
  }
}));

// Puerto asignado por Render
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor proxy activo");
});
