import process from 'node:process';
import { parseEnv } from './envSchema.js';

// Carga y validacion centralizada de variables de entorno para toda la API.
// Cualquier variable nueva (ej. credenciales de Imagga) se agrega al schema en
// envSchema.ts, no en index.ts ni en los modulos de feature.

// Carga packages/api/.env cuando existe; si no, se usa el entorno ambiente tal
// cual (ej. variables provistas por el shell o una plataforma de despliegue).
// Se hace aqui (y no en index.ts) para garantizar que .env este cargado antes
// de validar, sin importar el orden de imports del modulo que consuma `env`.
try {
  process.loadEnvFile();
} catch {
  // No se encontro archivo .env — esta bien, se usa process.env tal cual.
}

// Valida y expone la configuracion tipada. Lanza al arrancar si falta o es
// invalida alguna variable requerida (fail fast).
export const env = parseEnv(process.env);
