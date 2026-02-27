package queries

import (
	"context"
	"database/sql"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
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
}

// New creates a new Queries instance with all query implementations
func New(db *database.DB, redis *redis.Client) *Queries {
	return &Queries{
		Auth:           NewAuthQueries(db, redis),
		User:           NewUserQueries(db, redis),
		Organization:   NewOrganizationQueries(db, redis),
		Group:          NewGroupQueries(db, redis),
		Resource:       NewResourceQueries(db, redis),
		Policy:         NewPolicyQueries(db, redis),
		Role:           NewRoleQueries(db, redis),
		Session:        NewSessionQueries(db, redis),
		Audit:          NewAuditQueries(db, redis),
		GlobalSettings: NewGlobalSettingsQueries(db, redis),
		OIDC:           NewOIDCQueries(db, redis),
		Content:        NewContentQueries(db, redis),
		db:             db,
		redis:          redis,
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
