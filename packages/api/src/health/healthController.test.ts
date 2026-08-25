import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// Test de ENDPOINT del módulo health (integración con Supertest).
// Verifica que la app ensamblada por createApp() monta las rutas del módulo
// bajo el prefijo /api, dejando el health check en GET /api/health.
describe('GET /api/health', () => {
  it('responde 200 con body { status: "ok" }', async () => {
    const app = createApp();

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
