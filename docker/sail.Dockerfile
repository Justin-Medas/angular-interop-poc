# FINOS FDC3 Sail at the commit pinned in scripts/setup-sail.mjs (one pin, two consumers).
FROM node:26-bookworm
WORKDIR /app
COPY scripts/setup-sail.mjs scripts/setup-sail.mjs
RUN node scripts/setup-sail.mjs
WORKDIR /app/.sail/fdc3-sail
EXPOSE 8090
CMD ["npm", "start"]
