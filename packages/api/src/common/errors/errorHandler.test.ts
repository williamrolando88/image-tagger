import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from './errorHandler';
import { AppError } from './appError';

// Test UNITARIO del middleware de error centralizado, colocado junto a
// errorHandler.ts. Fija el CONTRATO de la respuesta de error: una forma JSON
// CONSISTENTE `{ error: { message, code } }`, con el statusCode correcto y sin
// filtrar detalles internos de errores no controlados.
//
// `errorHandler` es un middleware de error de Express 5 con firma
// `(err, req, res, next)`. Aquí se le pasa un `res` FALSO que captura las
// llamadas a status()/json() en lugar de emitir una respuesta HTTP real; por eso
// es unitario y no de endpoint (ese caso vive en taggerController.test.ts).

// Construye un contexto de invocación falso con un `res` que registra las
// llamadas a status()/json(). status() devuelve `this` (mockReturnThis) para
// permitir el encadenamiento `res.status(x).json(y)`. Se crea FRESCO en cada
// test para que los historiales de los mocks no se acumulen entre casos. Se
// castea a los tipos de Express con `as unknown as` porque solo implementamos la
// superficie que el handler consume.
function makeContext() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
  const req = {} as unknown as Request;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe('errorHandler — middleware de error centralizado', () => {
  describe('AppError — error tipado de la aplicación', () => {
    it('responde con el statusCode del AppError y la forma { error: { message, code } }', () => {
      const { req, res, next } = makeContext();

      errorHandler(
        new AppError(413, 'FILE_TOO_LARGE', 'La imagen supera el tamaño máximo'),
        req,
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'La imagen supera el tamaño máximo',
          code: 'FILE_TOO_LARGE',
        },
      });
    });
  });

  describe('error no controlado — no filtra detalles internos', () => {
    it('responde 500 con code INTERNAL_ERROR y un mensaje genérico (no el detalle interno)', () => {
      const { req, res, next } = makeContext();

      errorHandler(new Error('detalle interno secreto'), req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: expect.any(String),
          code: 'INTERNAL_ERROR',
        },
      });

      // El mensaje enviado al cliente NO debe ser el detalle interno real del
      // error: los errores no controlados se responden con un texto genérico.
      const payload = vi.mocked(res.json).mock.calls[0][0] as {
        error: { message: string; code: string };
      };
      expect(payload.error.message).not.toBe('detalle interno secreto');
    });
  });
});
