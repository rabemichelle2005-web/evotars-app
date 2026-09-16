# Railway build for the Evotars API service.
#
# Builds this fork's api app (which also serves the built admin + client
# static bundles), plus a standalone bundle of the Prisma seed script and
# the raw Prisma schema/migrations so `prisma migrate deploy` and the seed
# can run as the Railway "Pre-Deploy Command".
#
# This mirrors the `app` target in the repo-root Dockerfile; it is split
# out into its own file because Railway's Dockerfile builder cannot target
# a single stage of a multi-stage Dockerfile.

FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

RUN npm install -g pnpm@10.10.0
RUN npm install -g @vercel/ncc

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY apps/website/package.json ./apps/website/package.json

COPY packages/database/package.json ./packages/database/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

# Railway injects any Service Variable matching an ARG name declared here
# as a Docker build argument automatically - see railway/.env.example.
ARG VITE_CLIENT_SOCKET_HOST
ARG VITE_CJS_IGNORE_WARNING
ARG VITE_API_URL

ENV VITE_CLIENT_SOCKET_HOST=$VITE_CLIENT_SOCKET_HOST
ENV VITE_CJS_IGNORE_WARNING=$VITE_CJS_IGNORE_WARNING
ENV VITE_API_URL=$VITE_API_URL

COPY . /app

# Only build what this service needs (api + the admin/client bundles it
# serves) - skip compiling the website here, it has its own service.
RUN pnpm exec turbo build --filter=api --filter=admin --filter=client

RUN ncc build apps/api/dist/main.js -o apps/api/build
RUN ncc build apps/api/dist/database/seed/seed.js -o apps/api/build-seed


FROM node:20-alpine AS app

# Prisma's query/schema engines dynamically link against system OpenSSL.
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/static /app/static

COPY --from=builder /app/packages/database/generated /app/packages/database/generated

# Schema + migrations only (no node_modules) so the Railway Pre-Deploy
# Command can run `npx prisma migrate deploy` against Railway Postgres.
COPY --from=builder /app/packages/database/prisma /app/packages/database/prisma

COPY --from=builder /app/apps/api/build /app/apps/api/build
COPY --from=builder /app/apps/api/build-seed /app/apps/api/build-seed

COPY --from=builder /app/apps/admin/dist /app/apps/admin/dist
COPY --from=builder /app/apps/client/dist /app/apps/client/dist

WORKDIR /app/apps/api

CMD ["node", "build/index.js"]
