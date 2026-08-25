import { describe, it, expect } from 'vitest';
import { requireEnv, parseOptionalPositiveInt } from './envParsers';

// Tests de los helpers puros de parseo/validacion de variables de entorno,
// colocados junto a envParsers.ts. Fijan el contrato acordado antes de existir
// la implementacion (TDD): al ejecutarse deben quedar en ROJO porque el modulo
// ./envParsers aun no existe.

describe('requireEnv', () => {
  it('devuelve el valor cuando esta presente', () => {
    expect(requireEnv('http://localhost:5173', 'CORS_ORIGIN')).toBe(
      'http://localhost:5173',
    );
  });

  it('lanza (con el name en el mensaje) cuando el valor es undefined', () => {
    expect(() => requireEnv(undefined, 'CORS_ORIGIN')).toThrow('CORS_ORIGIN');
  });

  it('lanza (con el name en el mensaje) cuando el valor es cadena vacia', () => {
    expect(() => requireEnv('', 'CORS_ORIGIN')).toThrow('CORS_ORIGIN');
  });
});

describe('parseOptionalPositiveInt', () => {
  it('devuelve el fallback cuando el valor es undefined', () => {
    expect(parseOptionalPositiveInt(undefined, 'MAX_FILE_SIZE_MB', 10)).toBe(10);
  });

  it('parsea un entero positivo valido como numero', () => {
    expect(parseOptionalPositiveInt('10', 'MAX_FILE_SIZE_MB', 5)).toBe(10);
  });

  it('lanza (con el name en el mensaje) para un valor no numerico', () => {
    expect(() =>
      parseOptionalPositiveInt('abc', 'MAX_FILE_SIZE_MB', 10),
    ).toThrow('MAX_FILE_SIZE_MB');
  });

  it('lanza (con el name en el mensaje) para una cadena vacia', () => {
    expect(() => parseOptionalPositiveInt('', 'MAX_FILE_SIZE_MB', 10)).toThrow(
      'MAX_FILE_SIZE_MB',
    );
  });

  it('lanza (con el name en el mensaje) para cero', () => {
    expect(() => parseOptionalPositiveInt('0', 'MAX_FILE_SIZE_MB', 10)).toThrow(
      'MAX_FILE_SIZE_MB',
    );
  });

  it('lanza (con el name en el mensaje) para un entero negativo', () => {
    expect(() => parseOptionalPositiveInt('-5', 'MAX_FILE_SIZE_MB', 10)).toThrow(
      'MAX_FILE_SIZE_MB',
    );
  });

  it('lanza (con el name en el mensaje) para un valor decimal', () => {
    expect(() =>
      parseOptionalPositiveInt('3.5', 'MAX_FILE_SIZE_MB', 10),
    ).toThrow('MAX_FILE_SIZE_MB');
  });
});
