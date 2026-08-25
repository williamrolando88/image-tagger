import express, { type Express } from 'express';
import { corsMiddleware } from './common/settings/cors.js';
import { errorHandler } from './common/errors/errorHandler.js';
import healthRoutes from './health/healthRoutes.js';
import taggerRoutes from './tagger/taggerRoutes.js';

// Ensambla la app Express: middleware comun + rutas de cada modulo bajo /api.
// No llama listen (eso es responsabilidad de index.ts) para que sea testeable
// directamente con Supertest.
export function createApp(): Express {
  const app = express();

  // CORS antes de las rutas para que aplique (incluyendo preflight OPTIONS) a
  // todos los endpoints montados bajo /api.
  app.use(corsMiddleware);
  app.use(express.json());

  app.use('/api', healthRoutes);
  app.use('/api', taggerRoutes);

  // Al final: middleware de error de Express (4 params) para capturar tanto
  // los errores sincronos como los rechazos de promesas reenviados por
  // Express 5 desde los handlers async de las rutas anteriores.
  app.use(errorHandler);

  return app;
}
