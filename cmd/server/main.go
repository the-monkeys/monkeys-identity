package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/joho/godotenv"
	"github.com/the-monkeys/monkeys-identity/internal/config"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/middleware"
	"github.com/the-monkeys/monkeys-identity/internal/routes"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize configuration
	cfg := config.Load()

	// Initialize logger
	appLogger := logger.New(cfg.LogLevel)

	// Initialize database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		appLogger.Fatal("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Redis
	redis := database.ConnectRedis(cfg.RedisURL)
	defer redis.Close()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler:          middleware.ErrorHandler,
		DisableStartupMessage: false,
		AppName:               "Monkeys IAM v1.0",
		ServerHeader:          "Monkeys-IAM",
		BodyLimit:             4 * 1024 * 1024, // 4MB
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(fiberLogger.New(fiberLogger.Config{
		Format: "[${time}] ${status} - ${method} ${path} - ${ip} - ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-ID",
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "monkeys-iam",
			"version": "1.0.0",
		})
	})

	// API routes
	api := app.Group("/api")
	v1 := api.Group("/v1")

	// Initialize routes
	routes.SetupRoutes(v1, db, redis, appLogger, cfg)

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	appLogger.Info("Starting server on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		appLogger.Fatal("Failed to start server: %v", err)
	}
}
