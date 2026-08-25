import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeImage } from './imaggaAdapter';

// Test UNITARIO del adapter de Imagga, colocado junto a imaggaAdapter.ts.
//
// Fija el CONTRATO del adapter sin llamar a la API real: se mockea el `fetch`
// nativo. Las credenciales del entorno de test las provee vitest.setup.ts
// (IMAGGA_API_KEY=test-key, IMAGGA_API_SECRET=test-secret).

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
        { label: 'grass', confidence: 0.98 },
        { label: 'dog', confidence: 0.91 },
        { label: 'park', confidence: 0.88 },
      ]);
    });
  });

  describe('request — autenticación y endpoint', () => {
    it('hace POST al endpoint v2/tags de Imagga con query language=en por defecto', async () => {
      fetchMock.mockResolvedValue(mockResponse(imaggaSuccessBody));

      await analyzeImage(Buffer.from('img'), 'photo.jpg');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [
        string | URL,
        RequestInit | undefined,
      ];
      expect(String(url)).toContain('https://api.imagga.com/v2/tags');
      expect(String(url)).toContain('language=en');
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

  describe('errores', () => {
    it('lanza cuando la respuesta HTTP no es ok (ej. 500)', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({}, { ok: false, status: 500 }),
      );

      await expect(
        analyzeImage(Buffer.from('img'), 'photo.jpg'),
      ).rejects.toThrow();
    });

    it('lanza cuando el body reporta status.type === "error"', async () => {
      fetchMock.mockResolvedValue(
        mockResponse(
          { status: { type: 'error', text: 'algo salió mal' }, result: { tags: [] } },
          { ok: true, status: 200 },
        ),
      );

      await expect(
        analyzeImage(Buffer.from('img'), 'photo.jpg'),
      ).rejects.toThrow();
    });
  });
});

// Regresión: el adapter debe leer el label del idioma configurado
// (IMAGGA_TAG_LANGUAGE), no siempre `tag.en`.
//
// Este describe está AISLADO del anterior porque `env.imaggaTagLanguage` se
// resuelve al importar `../../common/settings/env`, que a su vez se importa al
// cargar `./imaggaAdapter`. Para que el adapter tome un idioma distinto de 'en'
// hay que cambiar la env ANTES de (re)importar ambos módulos:
//   1) vi.stubEnv('IMAGGA_TAG_LANGUAGE', 'es')
//   2) vi.resetModules()  -> descarta el grafo de módulos cacheado (env + adapter)
//   3) await import('./imaggaAdapter')  -> reimporta con la env ya aplicada
// Todo se restaura en afterEach (unstubAllEnvs + resetModules) para no
// contaminar los casos por defecto ('en') del describe de arriba.
describe('analyzeImage — idioma de tags configurable (IMAGGA_TAG_LANGUAGE)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('lee el label en el idioma configurado (es) cuando Imagga devuelve tag.es', async () => {
    // La env se aplica antes de reimportar los módulos que la leen.
    vi.stubEnv('IMAGGA_TAG_LANGUAGE', 'es');
    vi.resetModules();
    const { analyzeImage: analyzeImageEs } = await import('./imaggaAdapter');

    // Respuesta de Imagga con la etiqueta bajo la clave 'es' (sin 'en'),
    // desordenada por confidence para verificar también el orden descendente.
    fetchMock.mockResolvedValue(
      mockResponse({
        result: {
          tags: [
            { confidence: 95, tag: { es: 'perro' } },
            { confidence: 80, tag: { es: 'parque' } },
          ],
        },
        status: { type: 'success', text: '' },
      }),
    );

    const result = await analyzeImageEs(Buffer.from('img'), 'photo.jpg');

    expect(result).toEqual([
      { label: 'perro', confidence: 0.95 },
      { label: 'parque', confidence: 0.8 },
    ]);
  });
});
