// Package main provides the entry point for the Monkeys IAM API server.
//
//	@title			Monkeys Identity & Access Management API
//	@version		1.0
//	@description	A comprehensive IAM system providing authentication, authorization, and access control for multi-tenant organizations with policy-based security, session management, and comprehensive audit trails.
//	@termsOfService	https://themonkeys.com/terms
//
//	@contact.name	The Monkeys Team
//	@contact.url	https://github.com/the-monkeys
//	@contact.email	support@themonkeys.com
//
//	@license.name	MIT
//	@license.url	https://opensource.org/licenses/MIT
//
//	@host		localhost:3000
//	@BasePath	/api/v1
//
//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				Type "Bearer" followed by a space and JWT token.
//
//	@schemes	http https
package main

import (
	"log"
	"os/exec"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/gofiber/swagger"
	"github.com/joho/godotenv"
	_ "github.com/the-monkeys/monkeys-identity/docs" // Import swagger docs
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
		AllowOrigins:     "http://localhost:3000,http://localhost:8080,https://localhost:3000,https://localhost:8080",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-ID",
		AllowCredentials: true,
	}))

	// Health check
	//
	//	@Summary		Health check
	//	@Description	Check API health status
	//	@Tags			System
	//	@Produce		json
	//	@Success		200	{object}	map[string]string	"API is healthy"
	//	@Router			/health [get]
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "monkeys-iam",
			"version": "1.0.0",
		})
	})

	// Swagger documentation routes
	app.Get("/swagger/*", swagger.HandlerDefault)
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Redirect("/swagger/index.html")
	})
	app.Get("/docs", func(c *fiber.Ctx) error {
		return c.Redirect("/swagger/index.html")
	})

	// API routes
	api := app.Group("/api")
	v1 := api.Group("/v1")

	// Initialize routes
	routes.SetupRoutes(v1, db, redis, appLogger, cfg)

	// Function to open browser
	openBrowser := func(url string) {
		var err error
		switch runtime.GOOS {
		case "linux":
			err = exec.Command("xdg-open", url).Start()
		case "windows":
			err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		case "darwin":
			err = exec.Command("open", url).Start()
		default:
			appLogger.Info("Please open your browser and navigate to: %s", url)
			return
		}
		if err != nil {
			appLogger.Warn("Failed to open browser automatically: %v", err)
			appLogger.Info("Please open your browser and navigate to: %s", url)
		}
	}

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	serverURL := "http://localhost:" + port
	swaggerURL := serverURL + "/swagger/index.html"

	appLogger.Info("🚀 Starting Monkeys IAM Server...")
	appLogger.Info("📊 Server URL: %s", serverURL)
	appLogger.Info("📖 API Documentation: %s", swaggerURL)
	appLogger.Info("🔍 Opening Swagger UI in your browser...")

	// Open browser after a short delay to allow server to start
	go func() {
		time.Sleep(2 * time.Second)
		openBrowser(swaggerURL)
	}()

	if err := app.Listen(":" + port); err != nil {
		appLogger.Fatal("Failed to start server: %v", err)
	}
}
