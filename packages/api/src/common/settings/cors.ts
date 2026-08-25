import cors from 'cors';
import { env } from './env.js';

// Se restringe CORS al origen configurado (env.corsOrigin, ej. la URL del
// frontend en Vite) en lugar de aceptar cualquier origen ('*'), para que solo
// el frontend autorizado pueda consumir la API desde el navegador.
export const corsMiddleware = cors({
  origin: env.corsOrigin,
});
