# syntax=docker/dockerfile:1

# ── Build: gera os arquivos estáticos ────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# O endereço da API é embutido no build: informe o que o navegador do usuário vai acessar.
ARG VITE_API_URL=http://localhost:7000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Runtime: nginx servindo o build ──────────────────────────────────────
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
