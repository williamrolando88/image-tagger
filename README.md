# Analizador Inteligente de Contenido de Imágenes

Aplicación web full-stack que permite subir una imagen, la analiza con un servicio
de IA (**Imagga**) y muestra las **etiquetas** detectadas junto con su nivel de
confianza. La interfaz muestra la imagen subida y la lista de tags, con indicadores
de carga y manejo de errores.

---

## Tecnologías

Monorepo **pnpm** (Node **≥ 24**, pnpm **10**).

**Backend** (`packages/api`)
- Node.js 24 + **Express 5** + **TypeScript**
- **zod** (validación de entorno y de la respuesta de Imagga)
- **multer** (subida `multipart/form-data`, en memoria)
- **Vitest** + **Supertest** (tests)

**Frontend** (`packages/ui`)
- **React 19** + **Vite 8** + **TypeScript** (React Compiler)
- **Tailwind CSS 4** + **daisyUI 5** (tema claro/oscuro)
- **axios** (con progreso de subida), **react-dropzone** (drag & drop)
- **Vitest** + **React Testing Library** + jsdom (tests)

**IA:** [Imagga](https://imagga.com/) — endpoint `v2/tags`.
**Contenedores:** Docker (`node:24-alpine`, `nginx:alpine`) + docker-compose.

---

## Estructura del proyecto

```
.
├── packages/
│   ├── api/          # Backend Express (modular por features: tagger, health, common)
│   └── ui/           # Frontend React (feature-based: features/tagger, shared)
├── docker-compose.yml
├── CLAUDE.md         # Manual de arquitectura y metodología del repo
└── README.md
```

Detalles de arquitectura y convenciones en [`CLAUDE.md`](./CLAUDE.md).

---

## Requisitos previos

- **Node.js ≥ 24** y **pnpm ≥ 10** (`corepack enable` o instalar pnpm manualmente).
- Una cuenta de **Imagga** para obtener las credenciales de la API
  (plan gratuito para desarrolladores en <https://imagga.com/>): necesitarás
  `IMAGGA_API_KEY` e `IMAGGA_API_SECRET` desde tu dashboard.
- **Docker** + **Docker Compose** (opcional, solo para la ejecución containerizada).

---

## Configuración de variables de entorno

Las claves de Imagga **nunca** van hardcodeadas: se leen de variables de entorno.
Cada contexto tiene su propio `.env.example` que debes copiar a `.env` y completar.

### Para desarrollo local (`pnpm dev`)

**`packages/api/.env`** (copia de `packages/api/.env.example`):

| Variable | Requerida | Por defecto | Descripción |
|----------|:---:|:---:|-------------|
| `IMAGGA_API_KEY` | ✅ | — | API key de Imagga |
| `IMAGGA_API_SECRET` | ✅ | — | API secret de Imagga |
| `CORS_ORIGIN` | ✅ | — | Origen del frontend permitido (dev: `http://localhost:5173`) |
| `PORT` | ❌ | `3000` | Puerto del backend |
| `MAX_FILE_SIZE_MB` | ❌ | `10` | Tamaño máximo de imagen (MB) |

**`packages/ui/.env`** (copia de `packages/ui/.env.example`):

| Variable | Requerida | Por defecto | Descripción |
|----------|:---:|:---:|-------------|
| `VITE_API_URL` | ✅ (solo dev) | — | Backend al que apunta el proxy de Vite (`http://localhost:3000`) |

```bash
cp packages/api/.env.example packages/api/.env
cp packages/ui/.env.example  packages/ui/.env
# edita ambos y coloca tus credenciales de Imagga en packages/api/.env
```

### Para Docker (`docker compose`)

**`.env`** en la raíz (copia de `.env.example`): `IMAGGA_API_KEY`, `IMAGGA_API_SECRET`
y opcionalmente `MAX_FILE_SIZE_MB`. (`CORS_ORIGIN`/`VITE_API_URL` los gestiona el
propio compose.)

> El idioma de los tags de Imagga es una constante de código
> (`packages/api/src/tagger/taggerConstants.ts`), no una variable de entorno.

---

## Ejecución local (sin Docker)

```bash
pnpm install        # instala dependencias de todo el monorepo
pnpm dev            # levanta backend + frontend juntos (mprocs)
```

- **Frontend:** <http://localhost:5173>
- **Backend:** <http://localhost:3000> (el frontend lo consume vía el proxy `/api`)

También puedes levantarlos por separado:

```bash
pnpm dev:api        # solo backend
pnpm dev:ui         # solo frontend
```

---

## Ejecución con Docker

Levanta toda la app containerizada con un solo comando:

```bash
cp .env.example .env      # coloca tus credenciales de Imagga
docker compose up --build
```

- **App:** <http://localhost:8080> — nginx sirve el frontend y hace de proxy de `/api`
  hacia el backend (el backend no se expone al host; se accede solo vía el proxy).

Para detener: `docker compose down`.

---

## Testing y calidad

```bash
pnpm --filter picture-tagger-api test        # tests backend (Vitest + Supertest)
pnpm --filter picture-tagger-frontend test   # tests frontend (Vitest + RTL)
pnpm lint                                     # lint de todos los paquetes
pnpm build                                    # build de producción de todos los paquetes
```

---

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/analyze` | Recibe una imagen (`multipart/form-data`, campo `image`), la analiza con Imagga y devuelve los tags |
| `GET` | `/api/health` | Healthcheck (`{ "status": "ok" }`) |

Respuesta de `POST /api/analyze`:

```json
{
  "tags": [
    { "label": "Perro", "confidence": 0.98 },
    { "label": "Parque", "confidence": 0.91 }
  ]
}
```

`confidence` está normalizado a **0–1**. Los errores se devuelven como JSON con el
status HTTP apropiado y un mensaje claro:

```json
{ "error": { "message": "La imagen supera el tamaño máximo de 10 MB.", "code": "FILE_TOO_LARGE" } }
```

Validaciones del backend: tipo de archivo (solo imágenes: JPG, PNG, WEBP, GIF) y
tamaño máximo; fallos del servicio de IA se traducen a un `502` controlado.
