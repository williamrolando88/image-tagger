import { Router } from 'express';
import { getHealth } from './healthController.js';

// Rutas del modulo health, a nivel de modulo (sin prefijo). El prefijo /api
// lo agrega el montaje en app.ts.
const healthRoutes = Router();

healthRoutes.get('/health', getHealth);

export default healthRoutes;
