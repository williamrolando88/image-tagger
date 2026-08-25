import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';

// Test de la configuración de CORS, colocado junto a la config (cors.ts).
// Verifica que la app ensamblada por createApp() habilita CORS únicamente para
// el origen configurado en el entorno (CORS_ORIGIN). En el entorno de test ese
// origen es http://localhost:5173 (ver vitest.setup.ts).

// Origen permitido según el entorno de test (CORS_ORIGIN en vitest.setup.ts).
const allowedOrigin = 'http://localhost:5173';
// Origen arbitrario que NO está en la lista blanca.
const disallowedOrigin = 'http://evil.example';

describe('CORS', () => {
  it('refleja access-control-allow-origin para el origen permitido en GET /api/health', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/health')
      .set('Origin', allowedOrigin);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('responde al preflight (OPTIONS) del origen permitido con status de preflight y el header CORS', async () => {
    const app = createApp();

    const response = await request(app)
      .options('/api/health')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'GET');

    // El preflight suele responder 204 (No Content); se acepta 200 según la config.
    expect([204, 200]).toContain(response.status);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('no autoriza un origen que no está en la lista blanca', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/health')
      .set('Origin', disallowedOrigin);

    // El origen no permitido no debe reflejarse en access-control-allow-origin
    // (idealmente el header está ausente).
    expect(response.headers['access-control-allow-origin']).not.toBe(
      disallowedOrigin,
    );
  });
});
