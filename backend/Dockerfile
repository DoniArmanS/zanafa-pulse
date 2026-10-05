# Tahap 1: compile
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

# Tahap 2: image kecil tanpa shell, berjalan sebagai user non-root
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/ /app/
ENV APP_ENV=production APP_PORT=8081
EXPOSE 8081
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
