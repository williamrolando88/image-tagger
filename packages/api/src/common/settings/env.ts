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

export const env = {
  port,
  corsOrigin,
};
