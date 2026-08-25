// Tipos compartidos del modulo tagger.

// Tag normalizado devuelto por el adapter: confidence en rango 0-1
// (Imagga lo devuelve en rango 0-100).
export interface Tag {
  label: string;
  confidence: number;
}
