# Multi-stage build for Go WebSocket server
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Minimal runtime image
FROM alpine:3.20

WORKDIR /app
COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]
