.PHONY: run build test clean tidy

APP_NAME=websocket-server
BIN_DIR=bin

run:
	go run ./cmd/server

build:
	mkdir -p $(BIN_DIR)
	go build -o $(BIN_DIR)/$(APP_NAME) ./cmd/server

test:
	go test -v ./...

tidy:
	go mod tidy

clean:
	rm -rf $(BIN_DIR)
