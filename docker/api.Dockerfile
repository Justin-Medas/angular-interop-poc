# Go API for `docker compose up`. Build context: repo root. Go fetches the pinned toolchain itself (go.mod).
# The runtime stage reuses the Go image because it already has curl (healthcheck) and CA certificates (Anthropic API).
FROM golang:1.27.2-bookworm AS build
WORKDIR /src/api
COPY api/go.mod api/go.sum ./
RUN go mod download
COPY api ./
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

FROM golang:1.27.2-bookworm
COPY --from=build /out/server /usr/local/bin/server
EXPOSE 8080
CMD ["server"]
