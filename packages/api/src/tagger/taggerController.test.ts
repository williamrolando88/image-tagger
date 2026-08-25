import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// Test de ENDPOINT del módulo tagger (integración con Supertest), colocado junto
// al controller. Ejercita POST /api/analyze de punta a punta a través de la app
// ensamblada por createApp(): upload multipart -> controller -> adapter real.
//
// Solo se mockea el `fetch` global (la llamada HTTP a Imagga); el resto de la
// cadena es código real, de modo que este test también fija que el endpoint
// delega la normalización (0–1) y el orden (desc) en el adapter, sin
// re-implementarlas en el controller. Las credenciales del entorno de test las
// provee vitest.setup.ts.

// Construye una Response mock mínima con la superficie que consume el adapter:
// `ok`, `status` y `json()`. Se castea a Response porque solo implementamos lo
// que el adapter usa (no toda la interfaz de fetch).
function mockResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

// Respuesta de éxito real de Imagga v2 /tags, con tags DESORDENADOS por
// confidence para verificar que el endpoint (vía adapter) los devuelve ordenados
// de forma descendente. Confidences enteras para que la normalización (/100) sea
// exacta y no dependa de tolerancia de flotantes.
const imaggaSuccessBody = {
  result: {
    tags: [
      { confidence: 91, tag: { en: 'dog' } },
      { confidence: 88, tag: { en: 'park' } },
      { confidence: 98, tag: { en: 'grass' } },
    ],
  },
  status: { type: 'success', text: '' },
};

describe('POST /api/analyze — endpoint de análisis de imágenes', () => {
  // Mock del fetch global reiniciado en cada test.
  const fetchMock = vi.fn();

  beforeEach(() => {
    // Limpia el historial de llamadas del vi.fn() plano entre tests: ni
    // vi.unstubAllGlobals() ni vi.restoreAllMocks() resetean mock.calls de un
    // vi.fn() creado a mano, así que sin esto se acumularían entre tests.
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('happy path — imagen válida', () => {
    it('responde 200 con { tags } normalizados a 0–1 y ordenados por confidence descendente', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));
      const app = createApp();

      const response = await request(app)
        .post('/api/analyze')
        .attach('image', Buffer.from('fake-image-bytes'), 'photo.jpg');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        tags: [
          { label: 'grass', confidence: 0.98 },
          { label: 'dog', confidence: 0.91 },
          { label: 'park', confidence: 0.88 },
        ],
      });
    });
  });

  describe('error de Imagga — fallo del servicio de IA', () => {
    it('responde 502 con { error: { code: "AI_SERVICE_ERROR", message } } cuando Imagga falla (HTTP no ok)', async () => {
      // Imagga responde con error HTTP (500): el adapter debe traducirlo a un
      // AppError(502, "AI_SERVICE_ERROR") y el error handler centralizado debe
      // emitir la forma JSON consistente `{ error: { message, code } }`, en vez
      // del 500 en texto/HTML del handler por defecto de Express.
      fetchMock.mockResolvedValue(mockResponse({}, { ok: false, status: 500 }));
      const app = createApp();

      const response = await request(app)
        .post('/api/analyze')
        .attach('image', Buffer.from('fake-image-bytes'), 'photo.jpg');

      expect(response.status).toBe(502);
      expect(response.body.error.code).toBe('AI_SERVICE_ERROR');
      expect(typeof response.body.error.message).toBe('string');
      expect(response.body.error.message.length).toBeGreaterThan(0);
    });
  });

  describe('validación de archivo — tipo, tamaño y ausencia', () => {
    // En estos casos el rechazo debe ocurrir por VALIDACIÓN, antes de tocar
    // Imagga. Por eso se mockea `fetch` con éxito: si a pesar de ello la
    // respuesta no es el error de validación esperado (o se llama a Imagga),
    // sabemos que la validación no cortó el flujo. Todos los rechazos fluyen por
    // el error handler central → forma `{ error: { message, code } }`.

    it('responde 415 con code "INVALID_FILE_TYPE" cuando el archivo no es una imagen (mimetype fuera de la whitelist)', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));
      const app = createApp();

      const response = await request(app)
        .post('/api/analyze')
        .attach('image', Buffer.from('esto no es imagen'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(415);
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
      // La validación de tipo corta ANTES del adapter: nunca se llama a Imagga.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('responde 413 con code "FILE_TOO_LARGE" cuando el archivo supera MAX_FILE_SIZE_MB', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));
      const app = createApp();

      // vitest.setup.ts fija MAX_FILE_SIZE_MB=1, así que 1 MiB + 1 byte lo supera.
      // El mimetype es válido (image/jpeg) para aislar el fallo al tamaño.
      const response = await request(app)
        .post('/api/analyze')
        .attach('image', Buffer.alloc(1024 * 1024 + 1), {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('responde 400 con code "NO_FILE" cuando no se adjunta ningún archivo', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));
      const app = createApp();

      const response = await request(app).post('/api/analyze');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_FILE');
    });
  });
});
