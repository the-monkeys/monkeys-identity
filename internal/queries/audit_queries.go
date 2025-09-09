package queries

import (
	"context"
	"database/sql"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
)

// AuditQueries defines all audit and compliance database operations
type AuditQueries interface {
	WithTx(tx *sql.Tx) AuditQueries
	WithContext(ctx context.Context) AuditQueries
	// TODO: Add audit-specific methods
}

type auditQueries struct {
	db    *database.DB
	redis *redis.Client
	tx    *sql.Tx
	ctx   context.Context
}

func NewAuditQueries(db *database.DB, redis *redis.Client) AuditQueries {
	return &auditQueries{db: db, redis: redis, ctx: context.Background()}
}

func (q *auditQueries) WithTx(tx *sql.Tx) AuditQueries {
	return &auditQueries{db: q.db, redis: q.redis, tx: tx, ctx: q.ctx}
}

func (q *auditQueries) WithContext(ctx context.Context) AuditQueries {
	return &auditQueries{db: q.db, redis: q.redis, tx: q.tx, ctx: ctx}
}
