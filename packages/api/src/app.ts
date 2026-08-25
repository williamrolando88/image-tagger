import express, { type Express } from 'express';
import { corsMiddleware } from './common/settings/cors.js';
import healthRoutes from './health/healthRoutes.js';

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

  return app;
}
