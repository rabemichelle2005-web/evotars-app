# Railway build for the Evotars website (Next.js) service.
#
# Mirrors the `website` target in the repo-root Dockerfile; split out into
# its own file because Railway's Dockerfile builder cannot target a single
# stage of a multi-stage Dockerfile.

FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

RUN npm install -g pnpm@10.10.0

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

COPY . /app

# Only build what this service needs.
RUN pnpm exec turbo build --filter=website


FROM node:20-alpine AS website

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/website/public ./apps/website/public

COPY --from=builder /app/apps/website/.next/standalone ./
COPY --from=builder /app/apps/website/.next/static ./apps/website/.next/static

CMD ["node", "apps/website/server.js"]
