# Imagen de produccion del backend (Express + TypeScript).
# Multi-stage: se compila con todas las dependencias y luego se genera un bundle
# de produccion autocontenido (solo deps de runtime) para una imagen final chica.
# El contexto de build es la RAIZ del repo (necesario para el workspace pnpm).

# ---------- build ----------
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo

# Manifiestos primero: maximiza la cache de capas de Docker (el install solo se
# rehace si cambian los package.json o el lockfile).
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/api/package.json packages/api/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

# Codigo del backend y compilacion (tsc -> dist).
COPY packages/api packages/api
RUN pnpm --filter picture-tagger-api build

# Bundle de produccion autocontenido (copia el paquete + solo deps de prod).
# --legacy: requerido en pnpm v10 para deploy sin "inject-workspace-packages"
# (este paquete no tiene dependencias de workspace inyectadas).
RUN pnpm --filter=picture-tagger-api deploy --prod --legacy /app

# ---------- runtime ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copia el bundle ya podado (incluye dist/ y node_modules de produccion).
COPY --from=build /app ./

# Ejecuta como usuario sin privilegios (incluido en la imagen node).
USER node

EXPOSE 3000
CMD ["node", "dist/index.js"]
