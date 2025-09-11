package database

import (
	"database/sql"
	"time"

	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

type DB struct {
	*sql.DB
}

func Connect(databaseURL string) (*DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &DB{DB: db}, nil
}

func ConnectRedis(redisURL string) *redis.Client {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		// Fallback to default configuration
		opt = &redis.Options{
			Addr:     "localhost:6379",
			Password: "",
			DB:       0,
		}
	}

	rdb := redis.NewClient(opt)
	return rdb
}
