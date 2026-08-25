// Error tipado de la aplicacion: transporta el statusCode HTTP y un `code`
// estable (para que el cliente pueda discriminar el tipo de error) junto al
// mensaje. El error handler centralizado lo distingue de errores no
// controlados con `instanceof AppError`.
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
