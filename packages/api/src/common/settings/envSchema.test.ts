import { describe, it, expect } from 'vitest';
import { parseEnv } from './envSchema';

// Tests del validador de variables de entorno (zod), colocados junto a
// envSchema.ts. parseEnv es una funcion pura sobre un objeto tipo process.env,
// asi que se puede probar sin manipular el entorno real.

// Base valida reutilizable: cada test la clona y sobreescribe lo que necesita.
function validSource(): NodeJS.ProcessEnv {
  return {
    PORT: '4000',
    CORS_ORIGIN: 'http://localhost:5173',
    IMAGGA_API_KEY: 'test-key',
    IMAGGA_API_SECRET: 'test-secret',
    MAX_FILE_SIZE_MB: '5',
  };
}

describe('parseEnv', () => {
  it('parsea y normaliza una configuracion valida (enteros como number)', () => {
    expect(parseEnv(validSource())).toEqual({
      port: 4000,
      corsOrigin: 'http://localhost:5173',
      imaggaApiKey: 'test-key',
      imaggaApiSecret: 'test-secret',
      maxFileSizeMb: 5,
    });
  });

  it('aplica defaults cuando PORT y MAX_FILE_SIZE_MB no vienen definidos', () => {
    const source = validSource();
    delete source.PORT;
    delete source.MAX_FILE_SIZE_MB;

    const config = parseEnv(source);

    expect(config.port).toBe(3000);
    expect(config.maxFileSizeMb).toBe(10);
  });

  it('lanza (con el nombre) cuando falta CORS_ORIGIN', () => {
    const source = validSource();
    delete source.CORS_ORIGIN;
    expect(() => parseEnv(source)).toThrow('CORS_ORIGIN');
  });

  it('lanza (con el nombre) cuando falta IMAGGA_API_KEY', () => {
    const source = validSource();
    delete source.IMAGGA_API_KEY;
    expect(() => parseEnv(source)).toThrow('IMAGGA_API_KEY');
  });

  it('lanza (con el nombre) cuando falta IMAGGA_API_SECRET', () => {
    const source = validSource();
    delete source.IMAGGA_API_SECRET;
    expect(() => parseEnv(source)).toThrow('IMAGGA_API_SECRET');
  });

  it('lanza (con el nombre) cuando CORS_ORIGIN es cadena vacia', () => {
    expect(() => parseEnv({ ...validSource(), CORS_ORIGIN: '' })).toThrow(
      'CORS_ORIGIN',
    );
  });

  it('lanza (con el nombre) cuando CORS_ORIGIN es solo espacios', () => {
    // `trim` + min(1): un valor en blanco no debe considerarse valido.
    expect(() => parseEnv({ ...validSource(), CORS_ORIGIN: '   ' })).toThrow(
      'CORS_ORIGIN',
    );
  });

  // Incluye casos que la coercion permisiva de Number() aceptaria (hex,
  // notacion cientifica, espacios, decimal .0, signo +) pero que deben
  // rechazarse: solo se permiten cadenas de digitos.
  it.each(['abc', '0', '-5', '3.5', '', '0x10', '1e9', ' 10 ', '10.0', '+10'])(
    'lanza (con el nombre) cuando PORT es invalido: "%s"',
    (value) => {
      expect(() => parseEnv({ ...validSource(), PORT: value })).toThrow('PORT');
    },
  );

  it.each(['abc', '0', '-5', '3.5', '', '0x10', '1e9', ' 10 ', '10.0', '+10'])(
    'lanza (con el nombre) cuando MAX_FILE_SIZE_MB es invalido: "%s"',
    (value) => {
      expect(() =>
        parseEnv({ ...validSource(), MAX_FILE_SIZE_MB: value }),
      ).toThrow('MAX_FILE_SIZE_MB');
    },
  );
});
