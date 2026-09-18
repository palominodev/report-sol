# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prerendering reads the local libsql database (288K, copied from context).
# Real secrets are injected at runtime, never baked in.
ENV NEXT_TELEMETRY_DISABLED=1
ENV TURSO_URL=file:data/local.db
RUN pnpm build

# ---------- Runtime ----------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Official node images already ship a `node` user with uid/gid 1000,
# matching the host owner of the mounted ./data volume.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# outputFileTracingIncludes copies the libsql native binding but does not
# recreate pnpm's consumer-side symlink, so require('@libsql/linux-x64-musl')
# fails at runtime. Re-link it (version-agnostic).
RUN set -eux; \
    for d in node_modules/.pnpm/libsql@*/node_modules; do \
      mkdir -p "$d/@libsql"; \
      for b in node_modules/.pnpm/@libsql+linux-x64-musl@*/node_modules/@libsql/linux-x64-musl; do \
        ln -sfn "/app/$b" "$d/@libsql/$(basename "$b")"; \
      done; \
    done

USER node
EXPOSE 3000
CMD ["node", "server.js"]
