// Tipos de dominio del feature "tagger": representan una etiqueta detectada
// por el servicio de IA (Imagga) sobre la imagen subida por el usuario.
export interface Tag {
  label: string
  confidence: number
}
