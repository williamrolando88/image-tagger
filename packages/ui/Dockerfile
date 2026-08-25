# Imagen de produccion del frontend (React + Vite).
# Multi-stage: se compilan los estaticos con Vite y se sirven con nginx, que
# ademas proxya /api al backend. El contexto de build es la RAIZ del repo.

# ---------- build ----------
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo

# Manifiestos primero para cachear la instalacion.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/api/package.json packages/api/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

# Codigo del frontend y build de produccion (Vite -> packages/ui/dist).
# No requiere VITE_API_URL: en produccion nginx proxya /api (ver nginx.conf).
COPY packages/ui packages/ui
RUN pnpm --filter picture-tagger-frontend build

# ---------- runtime ----------
FROM nginx:alpine AS runtime
# Config de nginx (SPA + proxy /api hacia el backend).
COPY packages/ui/nginx.conf /etc/nginx/conf.d/default.conf
# Estaticos compilados.
COPY --from=build /repo/packages/ui/dist /usr/share/nginx/html

EXPOSE 80
