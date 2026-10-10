# syntax=docker/dockerfile:1
FROM node:24.18.0-alpine AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@12.9.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN --mount=type=cache,id=livingmemories-pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
# Build-only placeholders; runtime credentials are supplied through Compose.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build BETTER_AUTH_SECRET=build-only-placeholder-not-a-runtime-secret pnpm build

FROM node:24.18.0-alpine AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node scripts/docker/entrypoint.mjs ./scripts/docker/entrypoint.mjs
USER node
EXPOSE 3000
ENTRYPOINT ["node", "scripts/docker/entrypoint.mjs"]
CMD ["node", "server.js"]

FROM dependencies AS worker
RUN apk add --no-cache ffmpeg poppler-utils tesseract-ocr tesseract-ocr-data-eng tesseract-ocr-data-spa libheif-tools
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src/lib/infrastructure ./src/lib/infrastructure
COPY --chown=node:node src/worker ./src/worker
COPY --chown=node:node scripts ./scripts
ENV NODE_ENV=production WORKER_HEALTH_PORT=3010
USER node
EXPOSE 3010
ENTRYPOINT ["node", "scripts/docker/entrypoint.mjs"]
CMD ["node", "--conditions=react-server", "--import=tsx", "src/worker/index.ts"]
