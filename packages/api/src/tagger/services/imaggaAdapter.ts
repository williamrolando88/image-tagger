import type { Tag } from '../taggerTypes.js';
import { env } from '../../common/settings/env.js';

// Adapter de integracion con la API de Imagga (v2/tags): envia la imagen y
// normaliza la respuesta al contrato interno `Tag[]` (confidence 0-1, orden
// descendente por confidence).

const IMAGGA_TAGS_URL = 'https://api.imagga.com/v2/tags';

// Forma minima de la respuesta de Imagga que consume este adapter.
interface ImaggaTagsResponse {
  result?: {
    tags?: Array<{
      confidence: number;
      tag: { en?: string };
    }>;
  };
  status?: {
    type?: string;
    text?: string;
  };
}

// Redondea a 2 decimales (ej. normalizacion de confidence 0-100 -> 0-1).
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function analyzeImage(
  imageBuffer: Buffer,
  filename: string,
): Promise<Tag[]> {
  const form = new FormData();
  // `Uint8Array.from` copia a un ArrayBuffer "normal": el tipo `Buffer` de Node
  // puede estar respaldado por un ArrayBufferLike (incluye SharedArrayBuffer),
  // que Blob no acepta segun los tipos de TS.
  form.append('image', new Blob([Uint8Array.from(imageBuffer)]), filename);

  const authorization =
    'Basic ' +
    Buffer.from(`${env.imaggaApiKey}:${env.imaggaApiSecret}`).toString(
      'base64',
    );

  const url = `${IMAGGA_TAGS_URL}?language=${env.imaggaTagLanguage}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authorization },
    body: form,
  });

  if (!res.ok) {
    throw new Error(
      `Imagga respondio con error (status ${res.status}) al analizar la imagen.`,
    );
  }

  const data = (await res.json()) as ImaggaTagsResponse;

  if (data.status?.type === 'error') {
    const detail = data.status.text ? `: ${data.status.text}` : '';
    throw new Error(`Imagga reporto un error al analizar la imagen${detail}`);
  }

  const tags = data.result?.tags ?? [];

  return tags
    .map((t) => ({
      label: t.tag.en ?? '',
      confidence: round2(t.confidence / 100),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
