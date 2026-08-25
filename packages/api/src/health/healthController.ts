import type { Request, Response } from 'express';

// Controller del modulo health: responde el estado basico de la API.
export function getHealth(_req: Request, res: Response): void {
  res.json({ status: 'ok' });
}
