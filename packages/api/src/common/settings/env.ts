import process from 'node:process';
import { requireEnv, parseOptionalPositiveInt } from './envParsers.js';

// Carga y validacion centralizada de variables de entorno para toda la API.
// Cualquier variable nueva (ej. credenciales de Imagga) se agrega aqui, no en
// index.ts ni en los modulos de feature.

// Carga packages/api/.env cuando existe; si no, se usa el entorno ambiente tal
// cual (ej. variables provistas por el shell o una plataforma de despliegue).
// Se hace aqui (y no en index.ts) para garantizar que .env este cargado antes
// de validar, sin importar el orden de imports del modulo que consuma `env`.
try {
  process.loadEnvFile();
} catch {
  // No se encontro archivo .env — esta bien, se usa process.env tal cual.
}

// PORT es opcional: si no viene definido, el servidor arranca en 3000.
const port = parseOptionalPositiveInt(process.env.PORT, 'PORT', 3000);

// Origen (URL) del frontend permitido. Es REQUERIDO (sin fallback): se lee del
// .env y lo usa el middleware de CORS (common/settings/cors.ts) para
// restringir que solo ese origen pueda consumir la API desde el navegador.
const corsOrigin = requireEnv(process.env.CORS_ORIGIN, 'CORS_ORIGIN');

// Credenciales de Imagga. Son REQUERIDAS (sin fallback): sin ellas el adapter
// no puede autenticarse contra la API externa.
const imaggaApiKey = requireEnv(process.env.IMAGGA_API_KEY, 'IMAGGA_API_KEY');

const imaggaApiSecret = requireEnv(
  process.env.IMAGGA_API_SECRET,
  'IMAGGA_API_SECRET',
);

// Idioma de los tags devueltos por Imagga. Opcional: por defecto ingles ('en').
const imaggaTagLanguage = process.env.IMAGGA_TAG_LANGUAGE ?? 'en';

// Tamano maximo permitido para la imagen subida, en MB. Opcional: por
// defecto 10 MB.
const maxFileSizeMb = parseOptionalPositiveInt(
  process.env.MAX_FILE_SIZE_MB,
  'MAX_FILE_SIZE_MB',
  10,
);

export const env = {
  port,
  corsOrigin,
  imaggaApiKey,
  imaggaApiSecret,
  imaggaTagLanguage,
  maxFileSizeMb,
};
