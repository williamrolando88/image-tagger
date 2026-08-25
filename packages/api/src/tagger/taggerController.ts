import type { Request, Response } from 'express';
import { AppError } from '../common/errors/appError.js';
import { analyzeImage } from './services/imaggaAdapter.js';

// Controller del modulo tagger: recibe la imagen ya parseada por el
// middleware de subida (`req.file`, via multer con almacenamiento en
// memoria) y delega el analisis en el adapter de Imagga.
//
// Express 5 reenvia automaticamente los rechazos de promesas de handlers
// async al error handler, asi que no hace falta un try/catch aqui.
export async function analyze(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new AppError(
      400,
      'NO_FILE',
      'No se recibió ningún archivo de imagen.',
    );
  }

  const tags = await analyzeImage(req.file.buffer, req.file.originalname);

  res.status(200).json({ tags });
}
