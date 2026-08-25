import { z } from 'zod';
import type { Tag } from '../taggerTypes.js';
import { env } from '../../common/settings/env.js';
import { AppError } from '../../common/errors/appError.js';
import { IMAGGA_TAG_LANGUAGE } from '../taggerConstants.js';

// Adapter de integracion con la API de Imagga (v2/tags): envia la imagen y
// normaliza la respuesta al contrato interno `Tag[]` (confidence 0-1, orden
// descendente por confidence).

const IMAGGA_TAGS_URL = 'https://api.imagga.com/v2/tags';

// Schema de la respuesta de Imagga que consume este adapter. Validar la
// respuesta con zod nos da tipado fuerte y evita "sorpresas": si Imagga cambia
// el formato o devuelve algo inesperado, fallamos de forma controlada en vez de
// propagar datos malformados. Las claves desconocidas se ignoran (modo strip).
const imaggaResponseSchema = z.object({
  result: z
    .object({
      // `tags` opcional: una respuesta valida puede no traerlo (ej. una
      // respuesta de error de Imagga con `status.type === 'error'`). Si se
      // marcara requerido, esas respuestas fallarian la validacion y
      // enmascararian el error real de Imagga con un generico de formato.
      tags: z
        .array(
          z.object({
            confidence: z.number(),
            // Indexado por idioma (ej. 'en', 'es'): Imagga devuelve la etiqueta
            // en la clave correspondiente al `language` pedido en la query.
            tag: z.record(z.string(), z.string()),
          }),
        )
        .optional(),
    })
    .optional(),
  status: z
    .object({
      type: z.string().optional(),
      text: z.string().optional(),
    })
    .optional(),
});

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

  const url = `${IMAGGA_TAGS_URL}?${new URLSearchParams({ language: IMAGGA_TAG_LANGUAGE })}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authorization },
    body: form,
  });

  if (!res.ok) {
    throw new AppError(
      502,
      'AI_SERVICE_ERROR',
      `Imagga respondio con error (status ${res.status}) al analizar la imagen.`,
    );
  }

  // Valida la respuesta contra el schema esperado antes de usarla.
  const parsed = imaggaResponseSchema.safeParse(await res.json());

  if (!parsed.success) {
    throw new AppError(
      502,
      'AI_SERVICE_ERROR',
      'Imagga devolvio una respuesta con un formato inesperado.',
    );
  }

  const data = parsed.data;

  if (data.status?.type === 'error') {
    const detail = data.status.text ? `: ${data.status.text}` : '';
    throw new AppError(
      502,
      'AI_SERVICE_ERROR',
      `Imagga reporto un error al analizar la imagen${detail}`,
    );
  }

  const tags = data.result?.tags ?? [];

  return tags
    .map((t) => ({
      // Etiqueta en el idioma configurado; si no existe, respaldo a ingles.
      label: t.tag[IMAGGA_TAG_LANGUAGE] ?? t.tag.en ?? '',
      confidence: round2(t.confidence / 100),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
