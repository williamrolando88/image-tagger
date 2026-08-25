// Helpers puros de parseo/validacion de variables de entorno. Centralizan la
// logica compartida por env.ts para evitar duplicar el patron "requerir env
// var" y el parseo/validacion de enteros positivos opcionales.

// Exige que `value` este presente (no undefined ni cadena vacia). Devuelve el
// valor tal cual si es valido; si no, lanza un Error que incluye `name` para
// facilitar identificar que variable de entorno falta.
export function requireEnv(value: string | undefined, name: string): string {
  if (value === undefined || value === '') {
    throw new Error(
      `${name} es requerido. Definelo en packages/api/.env (ver .env.example).`,
    );
  }

  return value;
}

// Parsea un entero positivo opcional. Si `value` es undefined, devuelve
// `fallback`. Si `value` esta presente pero no es un entero positivo valido
// (no numerico, cadena vacia, cero, negativo o decimal), lanza un Error que
// incluye `name`.
export function parseOptionalPositiveInt(
  value: string | undefined,
  name: string,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(
      `${name} debe ser un entero positivo. Valor recibido: "${value}".`,
    );
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${name} debe ser un entero positivo. Valor recibido: "${value}".`,
    );
  }

  return parsed;
}
