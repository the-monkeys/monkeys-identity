package queries

import (
	"context"
	"database/sql"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
)

// SessionQueries defines all session management database operations
type SessionQueries interface {
	WithTx(tx *sql.Tx) SessionQueries
	WithContext(ctx context.Context) SessionQueries
	// TODO: Add session-specific methods
}

type sessionQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewSessionQueries(db *database.DB, redis *redis.Client) SessionQueries {
	return &sessionQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *sessionQueries) WithTx(tx *sql.Tx) SessionQueries {
	return &sessionQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *sessionQueries) WithContext(ctx context.Context) SessionQueries {
	return &sessionQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}
