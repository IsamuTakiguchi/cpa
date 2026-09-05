# ---- build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY web/package.json web/
COPY server/package.json server/
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
# pg_dump for daily snapshots (PostgreSQL 16 client, matches Railway's default Postgres major)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gnupg curl \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client-16 \
  && apt-get purge -y gnupg curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY web/package.json web/
COPY server/package.json server/
RUN npm ci --omit=dev
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/server/dist ./server/dist
COPY server/drizzle ./server/drizzle
RUN mkdir -p /data/backups
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
