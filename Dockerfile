# ---------- BUILD ----------
FROM node:22-alpine AS build

WORKDIR /app
ARG VITE_API_BASE_URL=https://api-exploracion.marte.encuentrass.lat
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- RUN ----------
FROM nginx:alpine

ARG GITHUB_SHA=local
LABEL org.opencontainers.image.revision=$GITHUB_SHA

# Copiar sitio publico Astro en la raiz
COPY --from=build /app/dist-public /usr/share/nginx/html

# Copiar aplicacion privada React debajo de /app
COPY --from=build /app/dist-react /usr/share/nginx/html/app

# Configuración SPA correcta
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck CORRECTO (sin localhost)
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=10s \
  CMD wget --spider -q http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
