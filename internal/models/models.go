package models

import (
	"time"
)

// User represents a human identity in the system
type User struct {
	ID                  string     `json:"id" db:"id"`
	Username            string     `json:"username" db:"username"`
	Email               string     `json:"email" db:"email"`
	EmailVerified       bool       `json:"email_verified" db:"email_verified"`
	DisplayName         string     `json:"display_name" db:"display_name"`
	AvatarURL           *string    `json:"avatar_url" db:"avatar_url"`
	OrganizationID      string     `json:"organization_id" db:"organization_id"`
	PasswordHash        string     `json:"-" db:"password_hash"` // Hidden from JSON
	PasswordChangedAt   *time.Time `json:"password_changed_at" db:"password_changed_at"`
	MFAEnabled          bool       `json:"mfa_enabled" db:"mfa_enabled"`
	MFAMethods          []string   `json:"mfa_methods" db:"mfa_methods"`
	TOTPSecret          string     `json:"-" db:"totp_secret"`           // Hidden from JSON
	MFABackupCodes      []string   `json:"-" db:"mfa_backup_codes"`      // Hidden from JSON
	Attributes          string     `json:"attributes" db:"attributes"`   // JSONB as string
	Preferences         string     `json:"preferences" db:"preferences"` // JSONB as string
	Role                string     `json:"role,omitempty" db:"role"`     // Added for UI display
	LastLogin           *time.Time `json:"last_login" db:"last_login"`
	FailedLoginAttempts int        `json:"failed_login_attempts" db:"failed_login_attempts"`
	LockedUntil         *time.Time `json:"locked_until" db:"locked_until"`
	Status              string     `json:"status" db:"status"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt           *time.Time `json:"deleted_at" db:"deleted_at"`
}

// Organization represents a tenant entity
type Organization struct {
	ID             string     `json:"id" db:"id"`
	Name           string     `json:"name" db:"name"`
	Slug           string     `json:"slug" db:"slug"`
	ParentID       *string    `json:"parent_id" db:"parent_id"`
	Description    *string    `json:"description" db:"description"`
	Metadata       string     `json:"metadata" db:"metadata"` // JSONB as string
	Settings       string     `json:"settings" db:"settings"` // JSONB as string
	AllowedOrigins []string   `json:"allowed_origins" db:"allowed_origins"`
	BillingTier    string     `json:"billing_tier" db:"billing_tier"`
	MaxUsers       int        `json:"max_users" db:"max_users"`
	MaxResources   int        `json:"max_resources" db:"max_resources"`
	Status         string     `json:"status" db:"status"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at" db:"deleted_at"`
}

// ServiceAccount represents a machine identity
type ServiceAccount struct {
	ID                string     `json:"id" db:"id"`
	Name              string     `json:"name" db:"name"`
	Description       string     `json:"description" db:"description"`
	OrganizationID    string     `json:"organization_id" db:"organization_id"`
	KeyRotationPolicy string     `json:"key_rotation_policy" db:"key_rotation_policy"` // JSONB as string
	AllowedIPRanges   []string   `json:"allowed_ip_ranges" db:"allowed_ip_ranges"`
	MaxTokenLifetime  string     `json:"max_token_lifetime" db:"max_token_lifetime"`
	LastKeyRotation   time.Time  `json:"last_key_rotation" db:"last_key_rotation"`
	Attributes        string     `json:"attributes" db:"attributes"` // JSONB as string
	Status            string     `json:"status" db:"status"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt         *time.Time `json:"deleted_at" db:"deleted_at"`
}

// Group represents a collection of users and service accounts
type Group struct {
	ID             string     `json:"id" db:"id"`
	Name           string     `json:"name" db:"name"`
	Description    string     `json:"description" db:"description"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	ParentGroupID  *string    `json:"parent_group_id" db:"parent_group_id"`
	GroupType      string     `json:"group_type" db:"group_type"`
	Attributes     string     `json:"attributes" db:"attributes"` // JSONB as string
	MaxMembers     int        `json:"max_members" db:"max_members"`
	Status         string     `json:"status" db:"status"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at" db:"deleted_at"`
}

// GroupMembership represents membership of a principal in a group
type GroupMembership struct {
	ID            string    `json:"id" db:"id"`
	GroupID       string    `json:"group_id" db:"group_id"`
	PrincipalID   string    `json:"principal_id" db:"principal_id"`
	PrincipalType string    `json:"type" db:"principal_type"` // Updated to match frontend 'type'
	RoleInGroup   string    `json:"role_in_group" db:"role_in_group"`
	JoinedAt      time.Time `json:"joined_at" db:"joined_at"`
	ExpiresAt     time.Time `json:"expires_at" db:"expires_at"`
	AddedBy       string    `json:"added_by" db:"added_by"`

	// Joined fields
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
}

// Resource represents any accessible object or service
type Resource struct {
	ID               string     `json:"id" db:"id"`
	ARN              string     `json:"arn" db:"arn"`
	Name             string     `json:"name" db:"name"`
	Description      *string    `json:"description" db:"description"`
	Type             string     `json:"type" db:"type"`
	OrganizationID   string     `json:"organization_id" db:"organization_id"`
	ParentResourceID *string    `json:"parent_resource_id" db:"parent_resource_id"`
	OwnerID          *string    `json:"owner_id" db:"owner_id"`
	OwnerType        *string    `json:"owner_type" db:"owner_type"`
	Attributes       string     `json:"attributes" db:"attributes"` // JSONB as string
	Tags             string     `json:"tags" db:"tags"`             // JSONB as string
	EncryptionKeyID  *string    `json:"encryption_key_id" db:"encryption_key_id"`
	LifecyclePolicy  string     `json:"lifecycle_policy" db:"lifecycle_policy"` // JSONB as string
	AccessLevel      string     `json:"access_level" db:"access_level"`
	ContentType      *string    `json:"content_type" db:"content_type"`
	SizeBytes        *int64     `json:"size_bytes" db:"size_bytes"`
	Checksum         *string    `json:"checksum" db:"checksum"`
	Version          *string    `json:"version" db:"version"`
	Status           string     `json:"status" db:"status"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
	AccessedAt       *time.Time `json:"accessed_at" db:"accessed_at"`
	DeletedAt        *time.Time `json:"deleted_at" db:"deleted_at"`
}

// Policy represents access control policies
type Policy struct {
	ID             string     `json:"id" db:"id"`
	Name           string     `json:"name" db:"name"`
	Description    string     `json:"description" db:"description"`
	Version        string     `json:"version" db:"version"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	Document       string     `json:"document" db:"document"` // JSONB as string
	PolicyType     string     `json:"policy_type" db:"policy_type"`
	Effect         string     `json:"effect" db:"effect"`
	IsSystemPolicy bool       `json:"is_system_policy" db:"is_system_policy"`
	CreatedBy      *string    `json:"created_by" db:"created_by"`
	ApprovedBy     *string    `json:"approved_by" db:"approved_by"`
	ApprovedAt     *time.Time `json:"approved_at" db:"approved_at"`
	Status         string     `json:"status" db:"status"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at" db:"deleted_at"`
}

// Role represents named collections of policies
type Role struct {
	ID                  string     `json:"id" db:"id"`
	Name                string     `json:"name" db:"name"`
	Description         *string    `json:"description" db:"description"`
	OrganizationID      string     `json:"organization_id" db:"organization_id"`
	RoleType            string     `json:"role_type" db:"role_type"`
	MaxSessionDuration  *string    `json:"max_session_duration" db:"max_session_duration"`
	TrustPolicy         string     `json:"trust_policy" db:"trust_policy"`             // JSONB as string
	AssumeRolePolicy    string     `json:"assume_role_policy" db:"assume_role_policy"` // JSONB as string
	Tags                string     `json:"tags" db:"tags"`                             // JSONB as string
	IsSystemRole        bool       `json:"is_system_role" db:"is_system_role"`
	Path                *string    `json:"path" db:"path"`
	PermissionsBoundary *string    `json:"permissions_boundary" db:"permissions_boundary"`
	Status              string     `json:"status" db:"status"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt           *time.Time `json:"updated_at" db:"updated_at"`
	DeletedAt           *time.Time `json:"deleted_at" db:"deleted_at"`
}

// RolePolicy represents the many-to-many relationship between roles and policies
type RolePolicy struct {
	ID         string    `json:"id" db:"id"`
	RoleID     string    `json:"role_id" db:"role_id"`
	PolicyID   string    `json:"policy_id" db:"policy_id"`
	AttachedAt time.Time `json:"attached_at" db:"attached_at"`
	AttachedBy string    `json:"attached_by" db:"attached_by"`
}

// RoleAssignment represents assignment of roles to principals
type RoleAssignment struct {
	ID            string     `json:"id" db:"id"`
	RoleID        string     `json:"role_id" db:"role_id"`
	PrincipalID   string     `json:"principal_id" db:"principal_id"`
	PrincipalType string     `json:"principal_type" db:"principal_type"`
	AssignedBy    string     `json:"assigned_by" db:"assigned_by"`
	AssignedAt    time.Time  `json:"assigned_at" db:"assigned_at"`
	ExpiresAt     *time.Time `json:"expires_at" db:"expires_at"`
	Conditions    *string    `json:"conditions" db:"conditions"` // JSONB as string
}

// Session represents active authentication sessions
type Session struct {
	ID                string    `json:"id" db:"id"`
	SessionToken      string    `json:"session_token" db:"session_token"`
	PrincipalID       string    `json:"principal_id" db:"principal_id"`
	PrincipalType     string    `json:"principal_type" db:"principal_type"`
	OrganizationID    string    `json:"organization_id" db:"organization_id"`
	AssumedRoleID     *string   `json:"assumed_role_id" db:"assumed_role_id"`
	Permissions       string    `json:"permissions" db:"permissions"` // JSONB as string
	Context           string    `json:"context" db:"context"`         // JSONB as string
	MFAVerified       bool      `json:"mfa_verified" db:"mfa_verified"`
	MFAMethodsUsed    []string  `json:"mfa_methods_used" db:"mfa_methods_used"`
	IPAddress         *string   `json:"ip_address" db:"ip_address"`
	UserAgent         *string   `json:"user_agent" db:"user_agent"`
	DeviceFingerprint *string   `json:"device_fingerprint" db:"device_fingerprint"`
	Location          string    `json:"location" db:"location"` // JSONB as string
	IssuedAt          time.Time `json:"issued_at" db:"issued_at"`
	ExpiresAt         time.Time `json:"expires_at" db:"expires_at"`
	LastUsedAt        time.Time `json:"last_used_at" db:"last_used_at"`
	Status            string    `json:"status" db:"status"`
}

// APIKey represents long-lived credentials for service accounts
type APIKey struct {
	ID               string    `json:"id" db:"id"`
	Name             string    `json:"name" db:"name"`
	KeyID            string    `json:"key_id" db:"key_id"`
	KeyHash          string    `json:"-" db:"key_hash"` // Hidden from JSON
	ServiceAccountID string    `json:"service_account_id" db:"service_account_id"`
	OrganizationID   string    `json:"organization_id" db:"organization_id"`
	Scopes           []string  `json:"scopes" db:"scopes"`
	AllowedIPRanges  []string  `json:"allowed_ip_ranges" db:"allowed_ip_ranges"`
	RateLimitPerHour int       `json:"rate_limit_per_hour" db:"rate_limit_per_hour"`
	LastUsedAt       time.Time `json:"last_used_at" db:"last_used_at"`
	UsageCount       int64     `json:"usage_count" db:"usage_count"`
	ExpiresAt        time.Time `json:"expires_at" db:"expires_at"`
	Status           string    `json:"status" db:"status"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	CreatedBy        string    `json:"created_by" db:"created_by"`
}

// OAuthClient represents a registered OIDC client/application
type OAuthClient struct {
	ID               string     `json:"id" db:"id"`
	OrganizationID   string     `json:"organization_id" db:"organization_id"`
	ClientName       string     `json:"client_name" db:"client_name"`
	ClientSecretHash string     `json:"-" db:"client_secret_hash"`
	RedirectURIs     []string   `json:"redirect_uris" db:"redirect_uris"`
	GrantTypes       []string   `json:"grant_types" db:"grant_types"`
	ResponseTypes    []string   `json:"response_types" db:"response_types"`
	Scope            string     `json:"scope" db:"scope"`
	IsPublic         bool       `json:"is_public" db:"is_public"`
	IsTrusted        bool       `json:"is_trusted" db:"is_trusted"`
	LogoURL          *string    `json:"logo_url" db:"logo_url"`
	PolicyURI        *string    `json:"policy_uri" db:"policy_uri"`
	TosURI           *string    `json:"tos_uri" db:"tos_uri"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at" db:"deleted_at"`
}

// OIDCAuthCode represents a temporary authorization code
type OIDCAuthCode struct {
	Code           string    `json:"code" db:"code"`
	UserID         string    `json:"user_id" db:"user_id"`
	ClientID       string    `json:"client_id" db:"client_id"`
	Scope          string    `json:"scope" db:"scope"`
	Nonce          *string   `json:"nonce" db:"nonce"`
	RedirectURI    string    `json:"redirect_uri" db:"redirect_uri"`
	ExpiresAt      time.Time `json:"expires_at" db:"expires_at"`
	Used           bool      `json:"used" db:"used"`
	OrganizationID string    `json:"organization_id" db:"organization_id"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// AuditEvent represents audit trail entries
type AuditEvent struct {
	ID                string    `json:"id" db:"id"`
	EventID           string    `json:"event_id" db:"event_id"`
	Timestamp         time.Time `json:"timestamp" db:"timestamp"`
	OrganizationID    string    `json:"organization_id" db:"organization_id"`
	PrincipalID       *string   `json:"principal_id" db:"principal_id"`
	PrincipalType     *string   `json:"principal_type" db:"principal_type"`
	SessionID         *string   `json:"session_id" db:"session_id"`
	Action            string    `json:"action" db:"action"`
	ResourceType      *string   `json:"resource_type" db:"resource_type"`
	ResourceID        *string   `json:"resource_id" db:"resource_id"`
	ResourceARN       *string   `json:"resource_arn" db:"resource_arn"`
	Result            string    `json:"result" db:"result"`
	ErrorMessage      *string   `json:"error_message" db:"error_message"`
	IPAddress         *string   `json:"ip_address" db:"ip_address"`
	UserAgent         *string   `json:"user_agent" db:"user_agent"`
	RequestID         *string   `json:"request_id" db:"request_id"`
	AdditionalContext string    `json:"additional_context" db:"additional_context"` // JSONB as string
	Severity          string    `json:"severity" db:"severity"`
}

// AccessReview represents periodic access certification records
type AccessReview struct {
	ID              string    `json:"id" db:"id"`
	Name            string    `json:"name" db:"name"`
	Description     string    `json:"description" db:"description"`
	OrganizationID  string    `json:"organization_id" db:"organization_id"`
	ReviewerID      string    `json:"reviewer_id" db:"reviewer_id"`
	Scope           string    `json:"scope" db:"scope"` // JSONB as string
	Status          string    `json:"status" db:"status"`
	DueDate         time.Time `json:"due_date" db:"due_date"`
	CompletedAt     time.Time `json:"completed_at" db:"completed_at"`
	Findings        string    `json:"findings" db:"findings"`               // JSONB as string
	Recommendations string    `json:"recommendations" db:"recommendations"` // JSONB as string
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// GlobalSettings represents system-wide configuration settings
type GlobalSettings struct {
	ID                      string    `json:"id" db:"id"`
	MaintenanceMode         bool      `json:"maintenance_mode" db:"maintenance_mode"`
	MaintenanceMessage      string    `json:"maintenance_message" db:"maintenance_message"`
	MaxUsersPerOrganization int       `json:"max_users_per_organization" db:"max_users_per_organization"`
	MaxSessionDuration      int       `json:"max_session_duration" db:"max_session_duration"` // in minutes
	PasswordMinLength       int       `json:"password_min_length" db:"password_min_length"`
	RequireMFA              bool      `json:"require_mfa" db:"require_mfa"`
	AllowRegistration       bool      `json:"allow_registration" db:"allow_registration"`
	EmailVerificationReq    bool      `json:"email_verification_required" db:"email_verification_required"`
	TokenExpirationMinutes  int       `json:"token_expiration_minutes" db:"token_expiration_minutes"`
	AuditLogRetentionDays   int       `json:"audit_log_retention_days" db:"audit_log_retention_days"`
	Settings                string    `json:"settings" db:"settings"` // JSONB for additional flexible settings
	CreatedAt               time.Time `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time `json:"updated_at" db:"updated_at"`
}

// MFA Request/Response Models

// SetupMFARequest represents the request to setup MFA
type SetupMFARequest struct {
	Method string `json:"method" validate:"required,oneof=totp sms email"`
	Phone  string `json:"phone,omitempty" validate:"omitempty,e164"`
}

// SetupMFAResponse represents the response after setting up MFA
type SetupMFAResponse struct {
	Secret      string   `json:"secret,omitempty"`
	QRCode      string   `json:"qr_code,omitempty"`
	BackupCodes []string `json:"backup_codes"`
	Message     string   `json:"message"`
}

// VerifyMFARequest represents the request to verify MFA code
type VerifyMFARequest struct {
	UserID     string `json:"user_id" validate:"required"`
	Code       string `json:"code" validate:"required,min=6,max=8"`
	Method     string `json:"method" validate:"required,oneof=totp sms email backup"`
	RememberMe bool   `json:"remember_me"`
}

// DisableMFARequest represents the request to disable MFA
type DisableMFARequest struct {
	Password string `json:"password" validate:"required"`
	Code     string `json:"code" validate:"required,min=6,max=8"`
}

// BackupCodesResponse represents the response with backup codes
type BackupCodesResponse struct {
	BackupCodes []string `json:"backup_codes"`
	Message     string   `json:"message"`
}

// MessageResponse represents a simple message response
type MessageResponse struct {
	Message string `json:"message"`
}
