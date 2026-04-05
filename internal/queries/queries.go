package queries

import (
	"context"
	"database/sql"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

// Queries holds all query interfaces
type Queries struct {
	Auth           AuthQueries
	User           UserQueries
	Organization   OrganizationQueries
	Group          GroupQueries
	Resource       ResourceQueries
	Policy         PolicyQueries
	Role           RoleQueries
	Session        SessionQueries
	Audit          AuditQueries
	GlobalSettings GlobalSettingsQueries
	OIDC           OIDCQueries
	Content        ContentQueries
	db             *database.DB
	redis          *redis.Client
	logger         *logger.Logger
}

// New creates a new Queries instance with all query implementations
func New(db *database.DB, redis *redis.Client, logger *logger.Logger) *Queries {
	return &Queries{
		Auth:           NewAuthQueries(db, redis, logger),
		User:           NewUserQueries(db, redis, logger),
		Organization:   NewOrganizationQueries(db, redis, logger),
		Group:          NewGroupQueries(db, redis, logger),
		Resource:       NewResourceQueries(db, redis, logger),
		Policy:         NewPolicyQueries(db, redis, logger),
		Role:           NewRoleQueries(db, redis, logger),
		Session:        NewSessionQueries(db, redis, logger),
		Audit:          NewAuditQueries(db, redis, logger),
		GlobalSettings: NewGlobalSettingsQueries(db, redis, logger),
		OIDC:           NewOIDCQueries(db, redis, logger),
		Content:        NewContentQueries(db, redis, logger),
		db:             db,
		redis:          redis,
		logger:         logger,
	}
}

// WithTx returns a new Queries instance that will run all SQL queries within a transaction
func (q *Queries) WithTx(tx *sql.Tx) *Queries {
	return &Queries{
		Auth:           q.Auth.WithTx(tx),
		User:           q.User.WithTx(tx),
		Organization:   q.Organization.WithTx(tx),
		Group:          q.Group.WithTx(tx),
		Resource:       q.Resource.WithTx(tx),
		Policy:         q.Policy.WithTx(tx),
		Role:           q.Role.WithTx(tx),
		Session:        q.Session.WithTx(tx),
		Audit:          q.Audit.WithTx(tx),
		GlobalSettings: q.GlobalSettings.WithTx(tx),
		OIDC:           q.OIDC.WithTx(tx),
		Content:        q.Content.WithTx(tx),
		db:             q.db,
		redis:          q.redis,
		logger:         q.logger,
	}
}

// WithContext returns a new Queries instance with context
func (q *Queries) WithContext(ctx context.Context) *Queries {
	return &Queries{
		Auth:           q.Auth.WithContext(ctx),
		User:           q.User.WithContext(ctx),
		Organization:   q.Organization.WithContext(ctx),
		Group:          q.Group.WithContext(ctx),
		Resource:       q.Resource.WithContext(ctx),
		Policy:         q.Policy.WithContext(ctx),
		Role:           q.Role.WithContext(ctx),
		Session:        q.Session.WithContext(ctx),
		Audit:          q.Audit.WithContext(ctx),
		GlobalSettings: q.GlobalSettings.WithContext(ctx),
		OIDC:           q.OIDC.WithContext(ctx),
		Content:        q.Content.WithContext(ctx),
		db:             q.db,
		redis:          q.redis,
		logger:         q.logger,
	}
}

// Common parameters for list queries
type ListParams struct {
	Limit  int
	Offset int
	SortBy string
	Order  string // ASC, DESC
}

// Common response for list queries
type ListResult[T any] struct {
	Items      []T   `json:"items"`
	Total      int64 `json:"total"`
	Limit      int   `json:"limit"`
	Offset     int   `json:"offset"`
	HasMore    bool  `json:"has_more"`
	TotalPages int   `json:"total_pages"`
}
