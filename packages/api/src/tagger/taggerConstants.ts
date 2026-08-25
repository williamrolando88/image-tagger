// Constantes de configuracion del feature "tagger". No son secretos ni cambian
// por entorno de despliegue, por eso viven en el codigo (no en variables de
// entorno).

// Idioma en el que se solicitan las etiquetas a Imagga. La app es en espanol,
// asi que pedimos las etiquetas en espanol; si Imagga no provee la etiqueta en
// ese idioma para un tag, el adapter cae a 'en' como respaldo.
export const IMAGGA_TAG_LANGUAGE = 'es';
