import { createApp } from './app.js';
import { env } from './common/settings/env.js';

// Bootstrap: la carga/validacion de entorno vive en common/settings/env.ts
// (se ejecuta al importarla, arriba). Aqui solo se ensambla la app y se
// levanta el servidor.
const app = createApp();

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`CORS allowed origin: ${env.corsOrigin}`);
});
