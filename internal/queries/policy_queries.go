package queries

import (
	"context"
	"database/sql"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
)

// PolicyQueries defines all policy management database operations
type PolicyQueries interface {
	WithTx(tx *sql.Tx) PolicyQueries
	WithContext(ctx context.Context) PolicyQueries
	// TODO: Add policy-specific methods
}

type policyQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewPolicyQueries(db *database.DB, redis *redis.Client) PolicyQueries {
	return &policyQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *policyQueries) WithTx(tx *sql.Tx) PolicyQueries {
	return &policyQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *policyQueries) WithContext(ctx context.Context) PolicyQueries {
	return &policyQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}
