import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../../common/errors/appError.js';
import { env } from '../../common/settings/env.js';

// Middleware de subida de archivos del modulo tagger: usa almacenamiento en
// memoria (el archivo queda disponible como Buffer en `req.file.buffer`, sin
// tocar disco) para poder pasarlo directo al adapter de Imagga.
//
// Incluye validacion de tipo (whitelist de mimetypes) y tamano maximo
// (configurable via env.maxFileSizeMb).

// Whitelist de mimetypes de imagen aceptados.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  // Nota: esta validacion se basa en el mimetype declarado por el cliente
  // (header del multipart), no en un analisis de los bytes reales del
  // archivo (magic bytes). Es suficiente para la "seguridad basica" pedida
  // por el enunciado; no se requiere sniffing de contenido.
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(
      new AppError(
        415,
        'INVALID_FILE_TYPE',
        `Tipo de archivo no soportado (${file.mimetype}). Tipos permitidos: ${ALLOWED_MIME_TYPES.join(', ')}.`,
      ),
    );
  },
});

// Envuelve `upload.single('image')` para traducir los errores de multer (y
// los AppError lanzados desde el fileFilter) al formato de error uniforme de
// la API, delegando siempre en `next` para que los resuelva el error handler
// centralizado.
export function uploadImage(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(
          new AppError(
            413,
            'FILE_TOO_LARGE',
            `La imagen supera el tamaño máximo de ${env.maxFileSizeMb} MB.`,
          ),
        );
        return;
      }

      // Otros codigos de MulterError (ej. campo inesperado): mensaje
      // generico, sin filtrar el detalle interno de multer.
      next(
        new AppError(
          400,
          'UPLOAD_ERROR',
          'No se pudo procesar el archivo subido.',
        ),
      );
      return;
    }

    if (err) {
      // Incluye el AppError(415, 'INVALID_FILE_TYPE', ...) del fileFilter.
      next(err);
      return;
    }

    next();
  });
}
