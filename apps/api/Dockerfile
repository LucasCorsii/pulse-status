FROM node:20-alpine AS build
WORKDIR /workspace
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY apps/api ./apps/api
COPY packages/database/prisma ./packages/database/prisma
RUN npm run build --workspace @pulse-status/api

FROM node:20-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/prisma ./packages/database/prisma
RUN npm ci --omit=dev --workspace=@pulse-status/api --include-workspace-root=false

COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist
USER node
WORKDIR /workspace/apps/api
EXPOSE 10000
CMD ["node", "dist/main.js"]
