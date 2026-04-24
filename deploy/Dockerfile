# syntax=docker/dockerfile:1.7
# Multi-stage build for Secure Note.
# Stage 1: build the Vite frontend.
# Stage 2: build the Go binary with the frontend embedded.
# Stage 3: minimal runtime image (distroless, non-root, read-only).

# ---- Stage 1: frontend ----
FROM node:20-alpine AS web
WORKDIR /src/web-src
COPY web-src/package.json web-src/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web-src/ ./
# vite.config.js writes build output to ../web (i.e. /src/web).
RUN npm run build

# ---- Stage 2: go build ----
FROM golang:1.22-alpine AS build
WORKDIR /src
# Cache module downloads.
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source.
COPY . .

# Copy the freshly built frontend into the embed directory so //go:embed picks it up.
# The Go binary embeds "cmd/burn/web-assets".
COPY --from=web /src/web/. ./cmd/burn/web-assets/

# Static build for scratch/distroless; strip symbols for smaller image.
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/burn \
    ./cmd/burn

# ---- Stage 3: runtime ----
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/burn /burn
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/burn"]
