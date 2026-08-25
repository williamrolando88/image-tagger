import process from 'node:process';

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
const port = Number(process.env.PORT ?? 3000);

// Origen (URL) del frontend permitido. Es REQUERIDO (sin fallback): se lee del
// .env y queda reservado para habilitar CORS o validacion de URL a futuro.
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error(
    'CORS_ORIGIN es requerido. Definelo en packages/api/.env (ver .env.example).',
  );
}

// Credenciales de Imagga. Son REQUERIDAS (sin fallback): sin ellas el adapter
// no puede autenticarse contra la API externa.
const imaggaApiKey = process.env.IMAGGA_API_KEY;
if (!imaggaApiKey) {
  throw new Error(
    'IMAGGA_API_KEY es requerido. Definelo en packages/api/.env (ver .env.example).',
  );
}

const imaggaApiSecret = process.env.IMAGGA_API_SECRET;
if (!imaggaApiSecret) {
  throw new Error(
    'IMAGGA_API_SECRET es requerido. Definelo en packages/api/.env (ver .env.example).',
  );
}

// Idioma de los tags devueltos por Imagga. Opcional: por defecto ingles ('en').
const imaggaTagLanguage = process.env.IMAGGA_TAG_LANGUAGE ?? 'en';

export const env = {
  port,
  corsOrigin,
  imaggaApiKey,
  imaggaApiSecret,
  imaggaTagLanguage,
};
