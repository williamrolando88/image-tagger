import type { ErrorRequestHandler } from 'express';
import { AppError } from './appError.js';

// Middleware de error centralizado de Express 5. Express solo lo reconoce como
// error handler si declara EXACTAMENTE 4 parametros (err, req, res, next), por
// eso `req` y `next` se mantienen aunque no se usen (prefijo `_` para lint).
//
// Contrato de respuesta, unico para toda la API: `{ error: { message, code } }`.
// - AppError: se respeta su statusCode/code/message (ya pensados para el cliente).
// - Cualquier otro error (no controlado): 500 + code INTERNAL_ERROR + mensaje
//   generico, sin filtrar el detalle interno real. El detalle real se loguea
//   con console.error para debugging en servidor.
export const errorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next,
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  console.error(err);

  res.status(500).json({
    error: {
      message: 'Ocurrio un error inesperado en el servidor.',
      code: 'INTERNAL_ERROR',
    },
  });
};
