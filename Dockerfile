FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit

FROM dependencies AS source
COPY . .
RUN npm run db:generate

FROM source AS development
EXPOSE 3000
ENTRYPOINT ["sh", "/app/scripts/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM source AS builder
RUN npm run build

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
