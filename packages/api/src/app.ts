import express, { type Express } from 'express';
import healthRoutes from './health/healthRoutes.js';

// Ensambla la app Express: middleware comun + rutas de cada modulo bajo /api.
// No llama listen (eso es responsabilidad de index.ts) para que sea testeable
// directamente con Supertest.
export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.use('/api', healthRoutes);

  return app;
}
