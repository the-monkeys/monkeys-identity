package database

import (
	"database/sql"
	"strings"
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

// StringArray is a helper type for handling PostgreSQL text arrays
type StringArray []string

// Scan implements the sql.Scanner interface
func (a *StringArray) Scan(src interface{}) error {
	if src == nil {
		*a = nil
		return nil
	}

	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return nil
	}

	// Simple parsing for Postgres array format: {val1,val2}
	if len(s) < 2 || s[0] != '{' || s[len(s)-1] != '}' {
		return nil
	}

	s = s[1 : len(s)-1]
	if s == "" {
		*a = []string{}
		return nil
	}

	// This is a naive implementation, but should work for basic cases
	// For production, consider using a more robust parser or lib/pq.StringArray
	*a = strings.Split(s, ",")
	return nil
}

// Value implements the driver.Valuer interface
func (a StringArray) Value() (interface{}, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}

	return "{" + strings.Join(a, ",") + "}", nil
}
