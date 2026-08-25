// Variables de entorno dummy para el entorno de test.
//
// El adapter de Imagga se mockea en los tests, así que NO se usan credenciales
// reales; pero la validación de entorno de la app es estricta (sin fallback), por
// lo que definimos valores de prueba para que `createApp()` pueda inicializarse.
// Se usa `??=` para no pisar valores provistos por el entorno (por ejemplo en CI).
process.env.PORT ??= '3000';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.IMAGGA_API_KEY ??= 'test-key';
process.env.IMAGGA_API_SECRET ??= 'test-secret';
