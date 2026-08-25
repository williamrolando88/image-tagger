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

// Origen (URL) del frontend permitido. Es REQUERIDO (sin fallback): se lee del
// .env y queda reservado para habilitar CORS o validacion de URL a futuro.
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error(
    'CORS_ORIGIN es requerido. Definelo en packages/api/.env (ver .env.example).',
  );
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Allowed frontend origin (CORS reservado): ${corsOrigin}`);
});
