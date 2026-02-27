package middleware

import (
	"context"
	"database/sql"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

const (
	// Redis key where all allowed origins are cached as a Set.
	corsOriginsKey = "cors:allowed_origins"
	// How long the Redis cache lives before the next request triggers a refresh.
	corsCacheTTL = 5 * time.Minute
)

// DynamicCORS is a middleware that allows origins stored per-organization in
// the database + a static list from .env. Origins are cached in Redis so the
// DB is only queried every corsCacheTTL.
type DynamicCORS struct {
	db            *sql.DB
	redis         *redis.Client
	logger        *logger.Logger
	staticOrigins map[string]bool // from .env ALLOWED_ORIGINS
	allowAll      bool            // true when static list contains "*"

	// In-memory fallback when Redis is temporarily unreachable.
	mu          sync.RWMutex
	memoryCache map[string]bool
	memoryCacheAt time.Time
}

// NewDynamicCORS creates the middleware.
// staticOrigins is the comma-separated ALLOWED_ORIGINS value from config.
func NewDynamicCORS(db *sql.DB, redis *redis.Client, logger *logger.Logger, staticOrigins string) *DynamicCORS {
	static := make(map[string]bool)
	allowAll := false
	for _, o := range strings.Split(staticOrigins, ",") {
		o = strings.TrimSpace(o)
		if o == "" {
			continue
		}
		if o == "*" {
			allowAll = true
		}
		static[o] = true
	}

	d := &DynamicCORS{
		db:            db,
		redis:         redis,
		logger:        logger,
		staticOrigins: static,
		allowAll:      allowAll,
		memoryCache:   make(map[string]bool),
	}

	// Seed cache on startup so the first request is fast.
	go d.refreshCache()

	return d
}

// Handler returns the Fiber middleware handler.
func (d *DynamicCORS) Handler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		// No Origin header means same-origin or non-browser request — let it through.
		if origin == "" {
			return c.Next()
		}

		// Wildcard — allow everything (dev mode).
		if d.allowAll {
			d.setHeaders(c, "*")
			if c.Method() == fiber.MethodOptions {
				return c.SendStatus(fiber.StatusNoContent)
			}
			return c.Next()
		}

		// Check static list first (instant).
		if d.staticOrigins[origin] {
			d.setHeaders(c, origin)
			if c.Method() == fiber.MethodOptions {
				return c.SendStatus(fiber.StatusNoContent)
			}
			return c.Next()
		}

		// Check dynamic origins (Redis → memory fallback → DB).
		if d.isAllowedDynamic(origin) {
			d.setHeaders(c, origin)
			if c.Method() == fiber.MethodOptions {
				return c.SendStatus(fiber.StatusNoContent)
			}
			return c.Next()
		}

		// Origin not allowed — still process the request but don't set CORS
		// headers. The browser will block the response on the client side.
		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Next()
	}
}

// setHeaders writes the standard CORS response headers.
func (d *DynamicCORS) setHeaders(c *fiber.Ctx, origin string) {
	c.Set("Access-Control-Allow-Origin", origin)
	c.Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH")
	c.Set("Access-Control-Allow-Headers", "Origin,Content-Type,Accept,Authorization,X-Request-ID")
	c.Set("Access-Control-Allow-Credentials", "true")
	c.Set("Vary", "Origin")
}

// isAllowedDynamic checks Redis cache, then memory fallback.
func (d *DynamicCORS) isAllowedDynamic(origin string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	// Try Redis first.
	exists, err := d.redis.SIsMember(ctx, corsOriginsKey, origin).Result()
	if err == nil {
		return exists
	}

	// Redis unreachable — use in-memory fallback.
	d.logger.Warn("CORS Redis check failed, using memory cache: %v", err)
	d.mu.RLock()
	allowed := d.memoryCache[origin]
	d.mu.RUnlock()
	return allowed
}

// refreshCache loads all origins from DB into Redis and updates the in-memory
// fallback. Called on startup and whenever the cache is invalidated.
func (d *DynamicCORS) refreshCache() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	origins, err := d.loadOriginsFromDB(ctx)
	if err != nil {
		d.logger.Error("Failed to load CORS origins from DB: %v", err)
		return
	}

	// Merge static + dynamic.
	allOrigins := make(map[string]bool)
	for o := range d.staticOrigins {
		allOrigins[o] = true
	}
	for _, o := range origins {
		allOrigins[o] = true
	}

	// Write to Redis as a Set with TTL.
	pipe := d.redis.Pipeline()
	pipe.Del(ctx, corsOriginsKey)
	if len(allOrigins) > 0 {
		members := make([]interface{}, 0, len(allOrigins))
		for o := range allOrigins {
			members = append(members, o)
		}
		pipe.SAdd(ctx, corsOriginsKey, members...)
	}
	pipe.Expire(ctx, corsOriginsKey, corsCacheTTL)
	if _, err := pipe.Exec(ctx); err != nil {
		d.logger.Error("Failed to write CORS origins to Redis: %v", err)
	}

	// Update in-memory fallback.
	d.mu.Lock()
	d.memoryCache = allOrigins
	d.memoryCacheAt = time.Now()
	d.mu.Unlock()

	d.logger.Info("CORS origin cache refreshed: %d origins", len(allOrigins))
}

// loadOriginsFromDB aggregates allowed_origins from all active organizations.
func (d *DynamicCORS) loadOriginsFromDB(ctx context.Context) ([]string, error) {
	query := `SELECT DISTINCT unnest(allowed_origins) FROM organizations WHERE status != 'deleted' AND allowed_origins IS NOT NULL AND array_length(allowed_origins, 1) > 0`
	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var origins []string
	for rows.Next() {
		var o string
		if err := rows.Scan(&o); err != nil {
			return nil, err
		}
		origins = append(origins, o)
	}
	return origins, rows.Err()
}

// InvalidateCache forces a reload from DB. Call this after an organization
// updates its allowed_origins.
func (d *DynamicCORS) InvalidateCache() {
	go d.refreshCache()
}

// GetOrganizationOrigins returns the allowed_origins for a single org.
func (d *DynamicCORS) GetOrganizationOrigins(ctx context.Context, orgID string) ([]string, error) {
	query := `SELECT allowed_origins FROM organizations WHERE id = $1 AND status != 'deleted'`
	var origins pq.StringArray
	if err := d.db.QueryRowContext(ctx, query, orgID).Scan(&origins); err != nil {
		if err == sql.ErrNoRows {
			return nil, fiber.NewError(fiber.StatusNotFound, "organization not found")
		}
		return nil, err
	}
	if origins == nil {
		return []string{}, nil
	}
	return origins, nil
}

// UpdateOrganizationOrigins sets the allowed_origins for a single org and
// invalidates the cache.
func (d *DynamicCORS) UpdateOrganizationOrigins(ctx context.Context, orgID string, origins []string) error {
	query := `UPDATE organizations SET allowed_origins = $2, updated_at = NOW() WHERE id = $1 AND status != 'deleted'`
	res, err := d.db.ExecContext(ctx, query, orgID, pq.Array(origins))
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fiber.NewError(fiber.StatusNotFound, "organization not found or deleted")
	}
	d.InvalidateCache()
	return nil
}
