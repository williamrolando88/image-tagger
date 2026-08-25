import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeImage } from './imaggaAdapter';
import { IMAGGA_TAG_LANGUAGE } from '../taggerConstants';

// Test UNITARIO del adapter de Imagga, colocado junto a imaggaAdapter.ts.
//
// Fija el CONTRATO del adapter sin llamar a la API real: se mockea el `fetch`
// nativo. Las credenciales del entorno de test las provee vitest.setup.ts
// (IMAGGA_API_KEY=test-key, IMAGGA_API_SECRET=test-secret). El idioma de los
// tags es una constante de codigo (IMAGGA_TAG_LANGUAGE), no una env var.

// Credencial esperada en el header Authorization: Basic base64(key:secret).
const expectedAuth =
  'Basic ' + Buffer.from('test-key:test-secret').toString('base64');

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

// Extrae el header Authorization de un RequestInit sin asumir su representación
// interna: fetch acepta headers como objeto plano, arreglo de pares o Headers.
// Así el test fija el VALOR del header sin sobre-restringir la forma.
function getAuthHeader(init: RequestInit | undefined): string | null {
  const headers = init?.headers;
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get('authorization');
  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === 'authorization');
    return found ? found[1] : null;
  }
  const record = headers as Record<string, string>;
  return record.Authorization ?? record.authorization ?? null;
}

// Respuesta de éxito real de Imagga v2 /tags, con tags DESORDENADOS por
// confidence para verificar que el adapter los ordena. Confidences enteras para
// que la normalización (/100) sea exacta y no dependa de tolerancia de flotantes.
// Las etiquetas vienen en la clave del idioma configurado ('es').
const imaggaSuccessBody = {
  result: {
    tags: [
      { confidence: 91, tag: { es: 'perro' } },
      { confidence: 88, tag: { es: 'parque' } },
      { confidence: 98, tag: { es: 'cesped' } },
    ],
  },
  status: { type: 'success', text: '' },
};

describe('analyzeImage — adapter de Imagga', () => {
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

  describe('happy path — normalización y orden', () => {
    it('mapea label/confidence, normaliza a 0–1 y ordena por confidence descendente', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));

      const result = await analyzeImage(Buffer.from('img'), 'photo.jpg');

      expect(result).toEqual([
        { label: 'cesped', confidence: 0.98 },
        { label: 'perro', confidence: 0.91 },
        { label: 'parque', confidence: 0.88 },
      ]);
    });
  });

  describe('request — autenticación y endpoint', () => {
    it('hace POST al endpoint v2/tags de Imagga con el idioma configurado en la query', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));

      await analyzeImage(Buffer.from('img'), 'photo.jpg');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [
        string | URL,
        RequestInit | undefined,
      ];
      expect(String(url)).toContain('https://api.imagga.com/v2/tags');
      expect(String(url)).toContain(`language=${IMAGGA_TAG_LANGUAGE}`);
      expect(init?.method?.toUpperCase()).toBe('POST');
    });

    it('envía el header Authorization Basic con las credenciales del entorno', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));

      await analyzeImage(Buffer.from('img'), 'photo.jpg');

      const [, init] = fetchMock.mock.calls[0] as [
        string | URL,
        RequestInit | undefined,
      ];
      expect(getAuthHeader(init)).toBe(expectedAuth);
    });

    it('envía la imagen como multipart/form-data en el campo image', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));

      await analyzeImage(Buffer.from('img'), 'photo.jpg');

      const [, init] = fetchMock.mock.calls[0] as [
        string | URL,
        RequestInit | undefined,
      ];
      expect(init?.body).toBeInstanceOf(FormData);
      // El campo image debe llevar la imagen como Blob/File (File extiende Blob).
      expect((init?.body as FormData).get('image')).toBeInstanceOf(Blob);
    });
  });

  describe('idioma de tags', () => {
    it('prefiere el idioma configurado sobre inglés cuando el tag trae ambos', async () => {
      // Con etiqueta en el idioma configurado ('es') Y en inglés, debe ganar el
      // idioma configurado (fija la precedencia `tag[lang] ?? tag.en`).
      fetchMock.mockResolvedValue(
        mockResponse({
          result: { tags: [{ confidence: 90, tag: { es: 'perro', en: 'dog' } }] },
          status: { type: 'success', text: '' },
        }),
      );

      const result = await analyzeImage(Buffer.from('img'), 'photo.jpg');

      expect(result).toEqual([{ label: 'perro', confidence: 0.9 }]);
    });

    it('cae a inglés cuando el tag no trae la etiqueta en el idioma configurado', async () => {
      // El tag solo tiene 'en' (no el idioma configurado): debe usar el respaldo.
      fetchMock.mockResolvedValue(
        mockResponse({
          result: { tags: [{ confidence: 90, tag: { en: 'dog' } }] },
          status: { type: 'success', text: '' },
        }),
      );

      const result = await analyzeImage(Buffer.from('img'), 'photo.jpg');

      expect(result).toEqual([{ label: 'dog', confidence: 0.9 }]);
    });
  });

  describe('errores', () => {
    it('lanza AppError 502 AI_SERVICE_ERROR cuando la respuesta HTTP no es ok (ej. 500)', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({}, { ok: false, status: 500 }),
      );

      await expect(
        analyzeImage(Buffer.from('img'), 'photo.jpg'),
      ).rejects.toMatchObject({ statusCode: 502, code: 'AI_SERVICE_ERROR' });
    });

    it('lanza AppError 502 AI_SERVICE_ERROR cuando el body reporta status.type === "error"', async () => {
      fetchMock.mockResolvedValue(
        mockResponse(
          { status: { type: 'error', text: 'algo salió mal' }, result: { tags: [] } },
          { ok: true, status: 200 },
        ),
      );

      await expect(
        analyzeImage(Buffer.from('img'), 'photo.jpg'),
      ).rejects.toMatchObject({ statusCode: 502, code: 'AI_SERVICE_ERROR' });
    });

    it('lanza AppError 502 AI_SERVICE_ERROR cuando la respuesta no cumple el schema (tipado fuerte)', async () => {
      // confidence llega como string: la validación con zod debe rechazarla en
      // vez de propagar datos malformados.
      fetchMock.mockResolvedValue(
        mockResponse({
          result: { tags: [{ confidence: 'muy alta', tag: { es: 'perro' } }] },
          status: { type: 'success', text: '' },
        }),
      );

      await expect(
        analyzeImage(Buffer.from('img'), 'photo.jpg'),
      ).rejects.toMatchObject({ statusCode: 502, code: 'AI_SERVICE_ERROR' });
    });
  });
});
