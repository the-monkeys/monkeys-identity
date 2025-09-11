# Makefile for Monkeys IAM System

.PHONY: help build run test clean docker-build docker-run setup lint fmt vet tidy deps dev

# Variables
BINARY_NAME=monkeys-iam
MAIN_PATH=./cmd/server
DOCKER_IMAGE=monkeys-iam:latest
DOCKER_CONTAINER=monkeys-iam-container

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development
setup: ## Setup development environment
	@echo "Setting up development environment..."
	@cp .env.example .env
	@go mod download
	@echo "Setup complete! Edit .env file with your configuration."

deps: ## Download dependencies
	@echo "Downloading dependencies..."
	@go mod download
	@go mod verify

tidy: ## Tidy go modules
	@echo "Tidying go modules..."
	@go mod tidy

fmt: ## Format Go code
	@echo "Formatting code..."
	@go fmt ./...

vet: ## Run go vet
	@echo "Running go vet..."
	@go vet ./...

lint: ## Run golangci-lint
	@echo "Running linter..."
	@golangci-lint run

test: ## Run tests
	@echo "Running tests..."
	@go test -v ./...

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Build
build: ## Build the application
	@echo "Building application..."
	@go build -o bin/$(BINARY_NAME) $(MAIN_PATH)

build-linux: ## Build for Linux
	@echo "Building for Linux..."
	@GOOS=linux GOARCH=amd64 go build -o bin/$(BINARY_NAME)-linux $(MAIN_PATH)

build-windows: ## Build for Windows
	@echo "Building for Windows..."
	@GOOS=windows GOARCH=amd64 go build -o bin/$(BINARY_NAME).exe $(MAIN_PATH)

build-mac: ## Build for macOS
	@echo "Building for macOS..."
	@GOOS=darwin GOARCH=amd64 go build -o bin/$(BINARY_NAME)-mac $(MAIN_PATH)

# Run
run: ## Run the application
	@echo "Running application..."
	@go run $(MAIN_PATH)

dev: ## Run in development mode with live reload (requires air)
	@echo "Starting development server with live reload..."
	@air

# Docker
docker-build: ## Build Docker image
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE) .

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	@docker run --name $(DOCKER_CONTAINER) -p 8080:8080 --env-file .env $(DOCKER_IMAGE)

docker-stop: ## Stop Docker container
	@echo "Stopping Docker container..."
	@docker stop $(DOCKER_CONTAINER) || true
	@docker rm $(DOCKER_CONTAINER) || true

docker-compose-up: ## Start services with docker-compose
	@echo "Starting services with docker-compose..."
	@docker-compose up -d

docker-compose-down: ## Stop services with docker-compose
	@echo "Stopping services with docker-compose..."
	@docker-compose down

docker-compose-logs: ## View docker-compose logs
	@docker-compose logs -f

# Database
db-setup: ## Setup database with schema
	@echo "Setting up database..."
	@psql $(DATABASE_URL) -f schema.sql

db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	@# Add migration commands here

db-reset: ## Reset database
	@echo "Resetting database..."
	@dropdb --if-exists monkeys_iam
	@createdb monkeys_iam
	@psql $(DATABASE_URL) -f schema.sql

# Clean
clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -f coverage.out coverage.html
	@rm -rf tmp/

clean-docker: ## Clean Docker images and containers
	@echo "Cleaning Docker..."
	@docker rmi $(DOCKER_IMAGE) || true
	@docker system prune -f

# Security
security-scan: ## Run security scan
	@echo "Running security scan..."
	@gosec ./...

# Generate
generate: ## Generate code
	@echo "Generating code..."
	@go generate ./...

# Install tools
install-tools: ## Install development tools
	@echo "Installing development tools..."
	@go install github.com/cosmtrek/air@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest

# Production
deploy: ## Deploy to production
	@echo "Deploying to production..."
	@# Add deployment commands here

# All
all: deps fmt vet lint test build ## Run all checks and build
