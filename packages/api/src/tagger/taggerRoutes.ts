import { Router } from 'express';
import { analyze } from './taggerController.js';
import { uploadImage } from './middleware/uploadMiddleware.js';

// Rutas del modulo tagger, a nivel de modulo (sin prefijo). El prefijo /api
// lo agrega el montaje en app.ts.
const taggerRoutes = Router();

taggerRoutes.post('/analyze', uploadImage, analyze);

export default taggerRoutes;
