import process from 'node:process';
import express from 'express';

// Load packages/api/.env when present; otherwise fall back to the ambient
// environment (e.g. vars provided by the shell or a deployment platform).
try {
  process.loadEnvFile();
} catch {
  // No .env file found — that's fine, use process.env as-is.
}

const app = express();
const port = process.env.PORT ?? 3000;

// Origen (URL) del frontend permitido. Se lee desde el .env y queda reservado
// para habilitar CORS o una validacion de URL a futuro (aun sin middleware).
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Allowed frontend origin (CORS reservado): ${corsOrigin}`);
});
