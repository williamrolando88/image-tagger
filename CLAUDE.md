# CLAUDE.md — Analizador Inteligente de Contenido de Imágenes

Manual operativo del repositorio. Léelo antes de trabajar en cualquier tarea.

## Proyecto

App web full-stack: el usuario sube una imagen, el backend la envía a un servicio
de IA (**Imagga**) y devuelve etiquetas (*tags*) con su nivel de confianza. La UI
muestra la imagen subida y la lista de tags.

Este repo es la solución a una prueba técnica. Se evalúa: funcionalidad completa,
calidad de código, **manejo de errores**, calidad del historial de Git, calidad del
README y UX.

## Stack y estructura

Monorepo **pnpm** (`pnpm-workspace.yaml` → `packages/*`), **Node >= 24**.

- `packages/api` — Backend. **Express 5 + TypeScript + ESLint**. Dev con `tsx watch`,
  build con `tsc`. Variables de entorno vía `process.loadEnvFile()` nativo (sin dotenv).
- `packages/ui` — Frontend. **React 19 + Vite 8 + TypeScript + ESLint + React Compiler**.
  Estilos: **Tailwind + daisyUI** (pendiente de instalar en M2).
- Orquestación de dev: **mprocs** (levanta API + UI juntos).
- Testing: **Vitest** en ambos paquetes (backend: + **Supertest**; frontend: +
  **React Testing Library**). Pendiente de instalar en su milestone.

### Comandos

```bash
pnpm dev          # levanta API + UI (mprocs)
pnpm dev:api      # solo API
pnpm dev:ui       # solo UI
pnpm build        # build recursivo de todos los paquetes
pnpm lint         # lint recursivo
pnpm --filter picture-tagger-api test       # tests backend (cuando existan)
pnpm --filter picture-tagger-frontend test  # tests frontend (cuando existan)
```

## Arquitectura del backend (modular por features)

El backend (`packages/api`) se organiza de forma **modular por features**, no por capas
técnicas globales. Objetivo: una base **escalable y ordenada** donde cada feature es un
módulo autocontenido y lo transversal vive en `common/`. Un módulo nuevo se agrega sin
tocar los existentes.

```
packages/api/src/
├── common/                        # Transversal a todos los módulos
│   ├── settings/
│   │   ├── env.ts                 # Carga env (.env) y expone config validada
│   │   ├── envSchema.ts           # Schema zod + parseEnv() para validar el entorno
│   │   └── cors.ts                # Configuración/middleware de CORS
│   └── errors/
│       ├── appError.ts            # Error tipado (statusCode + code)
│       └── errorHandler.ts        # Middleware de error centralizado -> JSON
├── tagger/                        # Feature principal: análisis de imágenes
│   ├── taggerController.ts
│   ├── taggerController.test.ts   # Tests de ENDPOINT (Supertest), junto al controller
│   ├── taggerRoutes.ts
│   ├── taggerTypes.ts
│   ├── taggerConstants.ts        # Constantes del feature (ej. idioma de tags)
│   ├── middleware/
│   │   └── uploadMiddleware.ts    # multer (memoria) + validación tipo/tamaño
│   └── services/
│       ├── imaggaAdapter.ts       # Integración con Imagga (adapter)
│       └── imaggaAdapter.test.ts  # Test UNITARIO, junto a su archivo
├── health/                        # Feature health (mínima, misma convención)
│   ├── healthController.ts
│   ├── healthController.test.ts
│   └── healthRoutes.ts
├── app.ts                         # createApp(): monta módulos bajo /api + middleware común
└── index.ts                       # bootstrap: valida env, crea app, listen
```

### Reglas de arquitectura

- **Módulos por feature:** cada feature (`tagger`, `health`, …) es una carpeta
  autocontenida con su `controller`, `routes`, `types`, y sub-carpetas (`services`,
  `middleware`) según necesite.
- **Lo transversal va en `common/`:** configuración (`settings/`: env, cors) y utilidades
  compartidas (`errors/`). CORS y env **no** viven dentro de un módulo.
- **Integraciones externas como adapters:** los clientes de servicios externos se nombran
  `<servicio>Adapter.ts` (ej. `imaggaAdapter.ts`) y viven en `services/` del módulo.
- **Tests colocados con su código (sin carpeta `tests/` separada):**
  - Tests **unitarios** → junto al archivo que prueban (`imaggaAdapter.ts` +
    `imaggaAdapter.test.ts`).
  - Tests de **endpoint** (integración con Supertest) → junto al `controller` del módulo,
    en el nivel más cercano a la raíz del módulo (`taggerController.test.ts`).
- **Nomenclatura de archivos:** camelCase (`imaggaAdapter.ts`, `taggerController.ts`).
- **`app.ts` ensambla, `index.ts` arranca:** `app.ts` exporta `createApp()` (testeable, sin
  `listen`); `index.ts` valida env y levanta el servidor.

Esta convención aplica a **todas las ejecuciones de agentes y subagentes**: el
`qa-engineer` coloca los tests según estas reglas y el `implementer` respeta la estructura
modular.

## Requisitos funcionales (fuente de verdad para QA)

- **`POST /api/analyze`**: recibe una imagen (`multipart/form-data`), la envía a Imagga
  y devuelve JSON:
  ```json
  { "tags": [ { "label": "Perro", "confidence": 0.98 }, { "label": "Parque", "confidence": 0.91 } ] }
  ```
  `confidence` normalizado a rango **0–1** (Imagga devuelve 0–100).
- **API keys por variables de entorno**, nunca hardcodeadas (`IMAGGA_API_KEY`,
  `IMAGGA_API_SECRET`).
- **Validación en backend**: tipo de archivo (solo imágenes) y tamaño máximo.
- **Manejo de errores**: archivo no-imagen, archivo demasiado grande, fallo de la API
  de IA → respuestas JSON con status HTTP y mensaje claros.
- **Frontend**: formulario de subida, botón "Analizar", indicador de carga, y sección
  de resultados (imagen subida + lista de tags). Comunicación asíncrona con `/api/analyze`.

## Metodología de trabajo

Trabajamos por **milestones** (= ramas feature). Cada milestone se descompone en
**sub-tareas**, y **cada sub-tarea es un commit atómico**. Construcción controlada y
pausada, módulo por módulo.

| Milestone | Rama | Estado |
|-----------|------|--------|
| M0 — Setup & scaffolding | `main` | ✅ Completo |
| M1 — Backend API | `feature/backend-api` | Pendiente |
| M2 — Frontend uploader | `feature/frontend-uploader` | Pendiente |
| M3 — Dockerización | `feature/dockerization` | Pendiente |
| M4 — Docs & entrega | `docs` | Pendiente |

### Checkpoint de planificación por milestone

**Antes de implementar cada milestone**, el orquestador y el equipo tienen una
**conversación de planificación**: se presenta el desglose de sub-tareas y las decisiones
técnicas, y se **afinan los detalles** si se encuentra que el plan puede mejorarse. Una vez
**aceptado el plan**, el milestone se ejecuta de forma **autónoma** (ciclos TDD con
subagentes + commits atómicos por sub-tarea), sin requerir aprobación en cada sub-tarea.

### Modelo de orquestación con subagentes

- **Orquestador (sesión principal):** planifica, delega en subagentes, **revisa** su
  trabajo, verifica (tests + lint) y **hace los commits**. No escribe tests ni código
  de feature directamente.
- **`qa-engineer` (Opus):** traduce requerimientos/historias de usuario en **tests**.
  Deja los tests en **rojo**. Solo escribe archivos de test; nunca código de producción;
  nunca commitea.
- **`implementer` (Sonnet):** escribe el código mínimo para poner los tests en **verde**.
  Nunca modifica los tests; nunca commitea.

### Ciclo TDD por sub-tarea de comportamiento

1. `qa-engineer` escribe el/los test(s) del requerimiento → corre y confirma **rojo**
   (por la razón correcta) → reporta al orquestador.
2. El orquestador revisa los tests.
3. `implementer` escribe la implementación → corre y confirma **verde** + lint →
   reporta al orquestador.
4. El orquestador revisa, corre tests + lint, y hace **1 commit atómico** que incluye
   **test + implementación juntos**.

Las sub-tareas de plomería (instalar dependencias, configurar tooling) **no llevan
test**: van en su propio commit directo, y son prerequisito de los ciclos TDD (ej.
instalar Vitest antes de escribir el primer test).

## Convención de commits

**Conventional Commits**, en **inglés**, atómicos:

```
<tipo>(<scope>): <qué — imperativo y conciso>

<cuerpo: el porqué — razón/contexto del cambio>
```

- Tipos: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`.
- Scopes sugeridos: `api`, `ui`, `repo`, `docker`.
- El cuerpo explica el **porqué**, no solo el qué.
- **Solo el orquestador commitea.**

## Estrategia de ramas

- Una rama `feature/*` por milestone; merge a `main` con `--no-ff` al cerrar el milestone.
- Configuración de Claude en `chore/claude-config`.
- No se commitea directo a `main` (salvo el scaffolding inicial ya existente).

## Control de calidad (pre-push)

**Antes de cualquier `git push`**, el orquestador ejecuta la herramienta **`code-review`**
sobre los cambios a subir. Es un *quality gate* obligatorio:

- Se deben **resolver todos los hallazgos de severidad media o superior**
  (medium, high, critical) antes de hacer push.
- Los hallazgos de severidad baja (low/nit) se resuelven a criterio o se documentan.
- Para el push de cierre de un milestone se sugiere correr `code-review` con nivel de
  esfuerzo alto (mayor cobertura).
- Si un hallazgo medium+ no se resuelve, se documenta explícitamente el porqué antes de subir.

Este gate es responsabilidad del **orquestador** (los subagentes no hacen push).

## Convenciones de código

- Identificadores en **inglés**; comentarios en **español** (consistente con el código
  existente).
- Secretos **solo** por variables de entorno; nunca en el código. Cada paquete tiene su
  `.env.example`.
- Variables de entorno críticas **requeridas sin fallback** (patrón ya usado: lanzar
  error si falta).
- README en **español** (audiencia evaluadora).
- Errores: respuestas JSON consistentes con el status HTTP apropiado.
