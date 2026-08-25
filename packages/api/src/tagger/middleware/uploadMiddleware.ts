import multer from 'multer';

// Middleware de subida de archivos del modulo tagger: usa almacenamiento en
// memoria (el archivo queda disponible como Buffer en `req.file.buffer`, sin
// tocar disco) para poder pasarlo directo al adapter de Imagga.
//
// La validacion de tipo de archivo y tamano maximo se agrega en una sub-tarea
// posterior; aqui solo se configura la subida de un unico archivo en el
// campo `image`.
const upload = multer({ storage: multer.memoryStorage() });

export const uploadImage = upload.single('image');
