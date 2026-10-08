# Angular dev server for `docker compose up`. Build context: repo root.
FROM node:26-bookworm
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web ./
# The app imports specs/runtime-config.schema.json through the @specs alias (../specs from /app/web).
COPY specs /app/specs
EXPOSE 4200
CMD ["npx", "ng", "serve", "shell", "--configuration", "docker", "--host", "0.0.0.0", "--port", "4200"]
