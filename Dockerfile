FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS frontend
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN pnpm build

FROM base AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/pnpm-lock.yaml ./backend/
RUN pnpm --dir backend install --frozen-lockfile
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/
COPY docker/config.toml ./backend/config.toml
COPY --from=frontend /app/dist ./dist
RUN mkdir -p backend/data/video backend/data/creator log temp

WORKDIR /app/backend
EXPOSE 5005
CMD ["./node_modules/.bin/tsx", "src/main.ts"]
