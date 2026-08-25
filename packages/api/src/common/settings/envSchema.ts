import { z } from 'zod';

// Schema de validacion de las variables de entorno de la API. Usamos zod para
// tener validacion en runtime y tipado fuerte derivado del schema (una unica
// fuente de verdad).

// Entero positivo leido del entorno. `coerce` convierte el string del entorno a
// number; se valida entero y positivo. Si la variable no viene definida se usa
// `defaultValue`.
function positiveIntEnv(defaultValue: number) {
  return z.coerce.number().int().positive().default(defaultValue);
}

// String requerido no vacio. `trim` evita aceptar valores en blanco (ej. '   ').
const requiredString = z.string().trim().min(1);

const envSchema = z.object({
  // Opcional: por defecto 3000.
  PORT: positiveIntEnv(3000),
  // Requerido (sin fallback): origen del frontend permitido por CORS.
  CORS_ORIGIN: requiredString,
  // Requeridas (sin fallback): credenciales de Imagga.
  IMAGGA_API_KEY: requiredString,
  IMAGGA_API_SECRET: requiredString,
  // Opcional: por defecto 10 MB.
  MAX_FILE_SIZE_MB: positiveIntEnv(10),
});

// Configuracion tipada que consume el resto de la API.
export interface EnvConfig {
  port: number;
  corsOrigin: string;
  imaggaApiKey: string;
  imaggaApiSecret: string;
  maxFileSizeMb: number;
}

// Valida y normaliza un origen de variables de entorno (normalmente
// process.env). Lanza un Error con un mensaje claro (incluye el nombre de cada
// variable con problema) si la validacion falla, para facilitar el diagnostico.
export function parseEnv(source: NodeJS.ProcessEnv): EnvConfig {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('; ');
    throw new Error(
      `Configuracion de entorno invalida. Revisa packages/api/.env (ver .env.example). Detalles: ${details}`,
    );
  }

  return {
    port: result.data.PORT,
    corsOrigin: result.data.CORS_ORIGIN,
    imaggaApiKey: result.data.IMAGGA_API_KEY,
    imaggaApiSecret: result.data.IMAGGA_API_SECRET,
    maxFileSizeMb: result.data.MAX_FILE_SIZE_MB,
  };
}
