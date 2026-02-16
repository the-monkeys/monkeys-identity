package queries

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

// AuditQueries defines all audit and compliance database operations
type AuditQueries interface {
	WithTx(tx *sql.Tx) AuditQueries
	WithContext(ctx context.Context) AuditQueries

	// Audit Event Operations
	LogAuditEvent(event models.AuditEvent) error
	GetAuditEvent(eventID, organizationID string) (*models.AuditEvent, error)
	ListAuditEvents(params ListAuditEventsParams) ([]models.AuditEvent, int, error)
	GetAuditEventsByUser(userID, organizationID string, limit int) ([]models.AuditEvent, error)
	DeleteOldAuditEvents(olderThan time.Duration, organizationID string) (int64, error)

	// Report Generation
	GenerateAccessReport(params AccessReportParams) (*AccessReportData, error)
	GenerateComplianceReport(params ComplianceReportParams) (*ComplianceReportData, error)
	GeneratePolicyUsageReport(params PolicyUsageReportParams) (*PolicyUsageReportData, error)

	// Access Review Operations
	ListAccessReviews(params ListAccessReviewsParams) ([]models.AccessReview, int, error)
	CreateAccessReview(review models.AccessReview) (*models.AccessReview, error)
	GetAccessReview(reviewID, organizationID string) (*models.AccessReview, error)
	UpdateAccessReview(reviewID, organizationID string, review models.AccessReview) (*models.AccessReview, error)
	CompleteAccessReview(reviewID, organizationID string, findings string, recommendations string) error
	DeleteAccessReview(reviewID, organizationID string) error
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

// getDB returns the appropriate database connection (transaction or regular)
func (q *auditQueries) getDB() interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	Query(query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(query string, args ...interface{}) *sql.Row
} {
	if q.tx != nil {
		return q.tx
	}
	return q.db
}

// LogAuditEvent creates a new audit event
func (q *auditQueries) LogAuditEvent(event models.AuditEvent) error {
	query := `
		INSERT INTO audit_events (
			id, event_id, timestamp, organization_id, principal_id, principal_type,
			session_id, action, resource_type, resource_id, resource_arn,
			result, error_message, ip_address, user_agent, request_id,
			additional_context, severity
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)`

	timestamp := event.Timestamp
	if timestamp.IsZero() {
		timestamp = time.Now()
	}

	db := q.getDB()
	_, err := db.Exec(query,
		event.ID,
		event.EventID,
		timestamp,
		event.OrganizationID,
		event.PrincipalID,
		event.PrincipalType,
		event.SessionID,
		event.Action,
		event.ResourceType,
		event.ResourceID,
		event.ResourceARN,
		event.Result,
		event.ErrorMessage,
		event.IPAddress,
		event.UserAgent,
		event.RequestID,
		event.AdditionalContext,
		event.Severity,
	)

	return err
}

// GetAuditEvent retrieves a specific audit event by ID
func (q *auditQueries) GetAuditEvent(eventID, organizationID string) (*models.AuditEvent, error) {
	query := `
		SELECT id, event_id, timestamp, organization_id, principal_id, principal_type,
			   session_id, action, resource_type, resource_id, resource_arn,
			   result, error_message, ip_address, user_agent, request_id,
			   additional_context, severity
		FROM audit_events
		WHERE id = $1 AND organization_id = $2`

	var event models.AuditEvent
	db := q.getDB()
	err := db.QueryRow(query, eventID, organizationID).Scan(
		&event.ID,
		&event.EventID,
		&event.Timestamp,
		&event.OrganizationID,
		&event.PrincipalID,
		&event.PrincipalType,
		&event.SessionID,
		&event.Action,
		&event.ResourceType,
		&event.ResourceID,
		&event.ResourceARN,
		&event.Result,
		&event.ErrorMessage,
		&event.IPAddress,
		&event.UserAgent,
		&event.RequestID,
		&event.AdditionalContext,
		&event.Severity,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("audit event not found")
		}
		return nil, err
	}

	return &event, nil
}

// ListAuditEventsParams defines parameters for listing audit events
type ListAuditEventsParams struct {
	OrganizationID string
	PrincipalID    string
	Action         string
	ResourceType   string
	Result         string
	Severity       string
	StartTime      *time.Time
	EndTime        *time.Time
	Limit          int
	Offset         int
}

// ListAccessReviewsParams defines parameters for listing access reviews
type ListAccessReviewsParams struct {
	OrganizationID string
	ReviewerID     string
	Status         string
	StartTime      *time.Time
	EndTime        *time.Time
	Limit          int
	Offset         int
}

// ListAuditEvents retrieves audit events with filtering and pagination
func (q *auditQueries) ListAuditEvents(params ListAuditEventsParams) ([]models.AuditEvent, int, error) {
	whereConditions := []string{"1=1"}
	args := []interface{}{}
	argIndex := 1

	if params.OrganizationID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("organization_id = $%d", argIndex))
		args = append(args, params.OrganizationID)
		argIndex++
	}

	if params.PrincipalID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("principal_id = $%d", argIndex))
		args = append(args, params.PrincipalID)
		argIndex++
	}

	if params.Action != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("action = $%d", argIndex))
		args = append(args, params.Action)
		argIndex++
	}

	if params.ResourceType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("resource_type = $%d", argIndex))
		args = append(args, params.ResourceType)
		argIndex++
	}

	if params.Result != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("result = $%d", argIndex))
		args = append(args, params.Result)
		argIndex++
	}

	if params.Severity != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("severity = $%d", argIndex))
		args = append(args, params.Severity)
		argIndex++
	}

	if params.StartTime != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("timestamp >= $%d", argIndex))
		args = append(args, *params.StartTime)
		argIndex++
	}

	if params.EndTime != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("timestamp <= $%d", argIndex))
		args = append(args, *params.EndTime)
		argIndex++
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Count total records
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_events WHERE %s", whereClause)
	var totalCount int
	db := q.getDB()
	err := db.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	// Set defaults for pagination
	if params.Limit <= 0 {
		params.Limit = 50
	}
	if params.Offset < 0 {
		params.Offset = 0
	}

	// Main query with pagination
	query := fmt.Sprintf(`
		SELECT id, event_id, timestamp, organization_id, principal_id, principal_type,
			   session_id, action, resource_type, resource_id, resource_arn,
			   result, error_message, ip_address, user_agent, request_id,
			   additional_context, severity
		FROM audit_events
		WHERE %s
		ORDER BY timestamp DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, argIndex, argIndex+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []models.AuditEvent
	for rows.Next() {
		var event models.AuditEvent
		err := rows.Scan(
			&event.ID,
			&event.EventID,
			&event.Timestamp,
			&event.OrganizationID,
			&event.PrincipalID,
			&event.PrincipalType,
			&event.SessionID,
			&event.Action,
			&event.ResourceType,
			&event.ResourceID,
			&event.ResourceARN,
			&event.Result,
			&event.ErrorMessage,
			&event.IPAddress,
			&event.UserAgent,
			&event.RequestID,
			&event.AdditionalContext,
			&event.Severity,
		)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, event)
	}

	return events, totalCount, rows.Err()
}

// AccessReportParams defines parameters for access reports
type AccessReportParams struct {
	OrganizationID string
	StartTime      *time.Time
	EndTime        *time.Time
	UserID         string
	IncludeDetails bool
}

// AccessReportData represents the structure of an access report
type AccessReportData struct {
	Summary struct {
		TotalUsers       int                   `json:"total_users"`
		ActiveUsers      int                   `json:"active_users"`
		TotalSessions    int                   `json:"total_sessions"`
		SuccessfulLogins int                   `json:"successful_logins"`
		FailedLogins     int                   `json:"failed_logins"`
		TotalActions     int                   `json:"total_actions"`
		TopActions       []ActionCount         `json:"top_actions"`
		TopResources     []ResourceAccessCount `json:"top_resources"`
	} `json:"summary"`
	UserActivity []UserActivitySummary `json:"user_activity,omitempty"`
	GeneratedAt  time.Time             `json:"generated_at"`
	Period       struct {
		StartTime time.Time `json:"start_time"`
		EndTime   time.Time `json:"end_time"`
	} `json:"period"`
}

type ActionCount struct {
	Action string `json:"action"`
	Count  int    `json:"count"`
}

type ResourceAccessCount struct {
	ResourceType string `json:"resource_type"`
	Count        int    `json:"count"`
}

type UserActivitySummary struct {
	UserID       string    `json:"user_id"`
	UserEmail    string    `json:"user_email"`
	LastActivity time.Time `json:"last_activity"`
	ActionCount  int       `json:"action_count"`
	SessionCount int       `json:"session_count"`
	TopActions   []string  `json:"top_actions"`
}

// GenerateAccessReport creates a comprehensive access report
func (q *auditQueries) GenerateAccessReport(params AccessReportParams) (*AccessReportData, error) {
	endTime := time.Now()
	if params.EndTime != nil {
		endTime = *params.EndTime
	}

	startTime := endTime.AddDate(0, 0, -30) // Default to last 30 days
	if params.StartTime != nil {
		startTime = *params.StartTime
	}

	report := &AccessReportData{
		GeneratedAt: time.Now(),
		Period: struct {
			StartTime time.Time `json:"start_time"`
			EndTime   time.Time `json:"end_time"`
		}{
			StartTime: startTime,
			EndTime:   endTime,
		},
	}

	// Base where conditions
	whereConditions := []string{"ae.timestamp BETWEEN $1 AND $2"}
	args := []interface{}{startTime, endTime}
	argIndex := 3

	if params.OrganizationID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("ae.organization_id = $%d", argIndex))
		args = append(args, params.OrganizationID)
		argIndex++
	}

	whereClause := strings.Join(whereConditions, " AND ")

	db := q.getDB()

	// Get summary statistics
	summaryQuery := fmt.Sprintf(`
		SELECT 
			COUNT(DISTINCT ae.principal_id) as total_users,
			COUNT(DISTINCT CASE WHEN ae.timestamp >= $1 THEN ae.principal_id END) as active_users,
			COUNT(DISTINCT ae.session_id) as total_sessions,
			COUNT(CASE WHEN ae.action = 'login' AND ae.result = 'success' THEN 1 END) as successful_logins,
			COUNT(CASE WHEN ae.action = 'login' AND ae.result = 'failure' THEN 1 END) as failed_logins,
			COUNT(*) as total_actions
		FROM audit_events ae
		WHERE %s`, whereClause)

	err := db.QueryRow(summaryQuery, args...).Scan(
		&report.Summary.TotalUsers,
		&report.Summary.ActiveUsers,
		&report.Summary.TotalSessions,
		&report.Summary.SuccessfulLogins,
		&report.Summary.FailedLogins,
		&report.Summary.TotalActions,
	)
	if err != nil {
		return nil, err
	}

	// Get top actions
	topActionsQuery := fmt.Sprintf(`
		SELECT ae.action, COUNT(*) as count
		FROM audit_events ae
		WHERE %s
		GROUP BY ae.action
		ORDER BY count DESC
		LIMIT 10`, whereClause)

	rows, err := db.Query(topActionsQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var action ActionCount
		err := rows.Scan(&action.Action, &action.Count)
		if err != nil {
			return nil, err
		}
		report.Summary.TopActions = append(report.Summary.TopActions, action)
	}

	// Get top resource types
	topResourcesQuery := fmt.Sprintf(`
		SELECT ae.resource_type, COUNT(*) as count
		FROM audit_events ae
		WHERE %s AND ae.resource_type != ''
		GROUP BY ae.resource_type
		ORDER BY count DESC
		LIMIT 10`, whereClause)

	rows, err = db.Query(topResourcesQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var resource ResourceAccessCount
		err := rows.Scan(&resource.ResourceType, &resource.Count)
		if err != nil {
			return nil, err
		}
		report.Summary.TopResources = append(report.Summary.TopResources, resource)
	}

	// Get user activity if details requested
	if params.IncludeDetails {
		userActivityQuery := fmt.Sprintf(`
			SELECT 
				ae.principal_id,
				COALESCE(u.email, '') as email,
				MAX(ae.timestamp) as last_activity,
				COUNT(*) as action_count,
				COUNT(DISTINCT ae.session_id) as session_count,
				ARRAY_AGG(DISTINCT ae.action ORDER BY ae.action) as actions
			FROM audit_events ae
			LEFT JOIN users u ON ae.principal_id = u.id
			WHERE %s
			GROUP BY ae.principal_id, u.email
			ORDER BY last_activity DESC
			LIMIT 100`, whereClause)

		rows, err = db.Query(userActivityQuery, args...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			var user UserActivitySummary
			var actionsArray sql.NullString
			err := rows.Scan(
				&user.UserID,
				&user.UserEmail,
				&user.LastActivity,
				&user.ActionCount,
				&user.SessionCount,
				&actionsArray,
			)
			if err != nil {
				return nil, err
			}

			if actionsArray.Valid {
				// Parse PostgreSQL array format
				actionsStr := strings.Trim(actionsArray.String, "{}")
				if actionsStr != "" {
					user.TopActions = strings.Split(actionsStr, ",")
				}
			}

			report.UserActivity = append(report.UserActivity, user)
		}
	}

	return report, nil
}

// ComplianceReportParams defines parameters for compliance reports
type ComplianceReportParams struct {
	OrganizationID string
	StartTime      *time.Time
	EndTime        *time.Time
	Standards      []string // e.g., "SOX", "PCI-DSS", "GDPR"
}

// ComplianceReportData represents the structure of a compliance report
type ComplianceReportData struct {
	Summary struct {
		ComplianceScore      float64        `json:"compliance_score"`
		TotalChecks          int            `json:"total_checks"`
		PassedChecks         int            `json:"passed_checks"`
		FailedChecks         int            `json:"failed_checks"`
		CriticalViolations   int            `json:"critical_violations"`
		HighRiskEvents       int            `json:"high_risk_events"`
		PolicyViolations     int            `json:"policy_violations"`
		AccessViolations     int            `json:"access_violations"`
		ViolationsByCategory map[string]int `json:"violations_by_category"`
	} `json:"summary"`
	SecurityEvents  []SecurityEventSummary `json:"security_events"`
	PolicyChecks    []PolicyCheckResult    `json:"policy_checks"`
	Recommendations []string               `json:"recommendations"`
	GeneratedAt     time.Time              `json:"generated_at"`
	Period          struct {
		StartTime time.Time `json:"start_time"`
		EndTime   time.Time `json:"end_time"`
	} `json:"period"`
}

type SecurityEventSummary struct {
	Type        string    `json:"type"`
	Count       int       `json:"count"`
	Severity    string    `json:"severity"`
	LastOccured time.Time `json:"last_occurred"`
}

type PolicyCheckResult struct {
	PolicyName string `json:"policy_name"`
	Status     string `json:"status"`
	Details    string `json:"details"`
}

// GenerateComplianceReport creates a compliance report
func (q *auditQueries) GenerateComplianceReport(params ComplianceReportParams) (*ComplianceReportData, error) {
	endTime := time.Now()
	if params.EndTime != nil {
		endTime = *params.EndTime
	}

	startTime := endTime.AddDate(0, 0, -30) // Default to last 30 days
	if params.StartTime != nil {
		startTime = *params.StartTime
	}

	report := &ComplianceReportData{
		GeneratedAt: time.Now(),
		Period: struct {
			StartTime time.Time `json:"start_time"`
			EndTime   time.Time `json:"end_time"`
		}{
			StartTime: startTime,
			EndTime:   endTime,
		},
	}

	// Base where conditions
	whereConditions := []string{"timestamp BETWEEN $1 AND $2"}
	args := []interface{}{startTime, endTime}
	argIndex := 3

	if params.OrganizationID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("organization_id = $%d", argIndex))
		args = append(args, params.OrganizationID)
		argIndex++
	}

	whereClause := strings.Join(whereConditions, " AND ")

	db := q.getDB()

	// Get security events summary
	securityEventsQuery := fmt.Sprintf(`
		SELECT 
			result,
			COUNT(*) as count,
			severity,
			MAX(timestamp) as last_occurred
		FROM audit_events
		WHERE %s AND (
			result = 'failure' OR 
			severity IN ('HIGH', 'CRITICAL') OR
			action IN ('failed_login', 'unauthorized_access', 'privilege_escalation')
		)
		GROUP BY result, severity
		ORDER BY count DESC`, whereClause)

	rows, err := db.Query(securityEventsQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	report.Summary.ViolationsByCategory = make(map[string]int)
	totalViolations := 0

	for rows.Next() {
		var event SecurityEventSummary
		err := rows.Scan(&event.Type, &event.Count, &event.Severity, &event.LastOccured)
		if err != nil {
			return nil, err
		}
		report.SecurityEvents = append(report.SecurityEvents, event)

		// Categorize violations
		category := "general"
		if event.Severity == "CRITICAL" {
			report.Summary.CriticalViolations += event.Count
			category = "critical"
		} else if event.Severity == "HIGH" {
			report.Summary.HighRiskEvents += event.Count
			category = "high_risk"
		}

		if event.Type == "failure" {
			report.Summary.PolicyViolations += event.Count
			category = "policy"
		}

		report.Summary.ViolationsByCategory[category] += event.Count
		totalViolations += event.Count
	}

	// Calculate compliance metrics
	totalEventsQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM audit_events WHERE %s`, whereClause)

	var totalEvents int
	err = db.QueryRow(totalEventsQuery, args...).Scan(&totalEvents)
	if err != nil {
		return nil, err
	}

	report.Summary.TotalChecks = totalEvents
	report.Summary.FailedChecks = totalViolations
	report.Summary.PassedChecks = totalEvents - totalViolations

	if totalEvents > 0 {
		report.Summary.ComplianceScore = float64(report.Summary.PassedChecks) / float64(totalEvents) * 100
	}

	// Generate recommendations based on findings
	if report.Summary.CriticalViolations > 0 {
		report.Recommendations = append(report.Recommendations, "Immediate attention required: Critical security violations detected")
	}
	if report.Summary.PolicyViolations > totalEvents/10 {
		report.Recommendations = append(report.Recommendations, "Review and strengthen access control policies")
	}
	if report.Summary.ComplianceScore < 95 {
		report.Recommendations = append(report.Recommendations, "Implement additional security monitoring and controls")
	}

	return report, nil
}

// PolicyUsageReportParams defines parameters for policy usage reports
type PolicyUsageReportParams struct {
	OrganizationID string
	StartTime      *time.Time
	EndTime        *time.Time
	PolicyID       string
}

// PolicyUsageReportData represents the structure of a policy usage report
type PolicyUsageReportData struct {
	Summary struct {
		TotalPolicies     int               `json:"total_policies"`
		ActivePolicies    int               `json:"active_policies"`
		PolicyEvaluations int               `json:"policy_evaluations"`
		AllowDecisions    int               `json:"allow_decisions"`
		DenyDecisions     int               `json:"deny_decisions"`
		TopPolicies       []PolicyUsageItem `json:"top_policies"`
	} `json:"summary"`
	PolicyDetails []PolicyDetailedUsage `json:"policy_details"`
	GeneratedAt   time.Time             `json:"generated_at"`
	Period        struct {
		StartTime time.Time `json:"start_time"`
		EndTime   time.Time `json:"end_time"`
	} `json:"period"`
}

type PolicyUsageItem struct {
	PolicyID     string  `json:"policy_id"`
	PolicyName   string  `json:"policy_name"`
	UsageCount   int     `json:"usage_count"`
	AllowCount   int     `json:"allow_count"`
	DenyCount    int     `json:"deny_count"`
	EffectivRate float64 `json:"effectiveness_rate"`
}

type PolicyDetailedUsage struct {
	PolicyID      string    `json:"policy_id"`
	PolicyName    string    `json:"policy_name"`
	Version       string    `json:"version"`
	Status        string    `json:"status"`
	Evaluations   int       `json:"evaluations"`
	Allows        int       `json:"allows"`
	Denies        int       `json:"denies"`
	LastUsed      time.Time `json:"last_used"`
	AvgResponseMs float64   `json:"avg_response_ms"`
}

// GeneratePolicyUsageReport creates a policy usage report
func (q *auditQueries) GeneratePolicyUsageReport(params PolicyUsageReportParams) (*PolicyUsageReportData, error) {
	endTime := time.Now()
	if params.EndTime != nil {
		endTime = *params.EndTime
	}

	startTime := endTime.AddDate(0, 0, -30) // Default to last 30 days
	if params.StartTime != nil {
		startTime = *params.StartTime
	}

	report := &PolicyUsageReportData{
		GeneratedAt: time.Now(),
		Period: struct {
			StartTime time.Time `json:"start_time"`
			EndTime   time.Time `json:"end_time"`
		}{
			StartTime: startTime,
			EndTime:   endTime,
		},
	}

	// Base where conditions for audit events related to policy evaluation
	whereConditions := []string{
		"ae.timestamp BETWEEN $1 AND $2",
		"ae.action IN ('policy_evaluation', 'access_decision', 'authorization')",
	}
	args := []interface{}{startTime, endTime}
	argIndex := 3

	if params.OrganizationID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("ae.organization_id = $%d", argIndex))
		args = append(args, params.OrganizationID)
		argIndex++
	}

	if params.PolicyID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("ae.resource_id = $%d", argIndex))
		args = append(args, params.PolicyID)
		argIndex++
	}

	whereClause := strings.Join(whereConditions, " AND ")

	db := q.getDB()

	// Get policy usage summary
	summaryQuery := fmt.Sprintf(`
		SELECT 
			COUNT(DISTINCT ae.resource_id) as policy_count,
			COUNT(*) as total_evaluations,
			COUNT(CASE WHEN ae.result = 'allow' THEN 1 END) as allow_decisions,
			COUNT(CASE WHEN ae.result = 'deny' THEN 1 END) as deny_decisions
		FROM audit_events ae
		WHERE %s`, whereClause)

	err := db.QueryRow(summaryQuery, args...).Scan(
		&report.Summary.ActivePolicies,
		&report.Summary.PolicyEvaluations,
		&report.Summary.AllowDecisions,
		&report.Summary.DenyDecisions,
	)
	if err != nil {
		return nil, err
	}

	// Get total policies count from policies table
	totalPoliciesQuery := "SELECT COUNT(*) FROM policies"
	totalPoliciesArgs := []interface{}{}
	if params.OrganizationID != "" {
		totalPoliciesQuery += " WHERE organization_id = $1"
		totalPoliciesArgs = append(totalPoliciesArgs, params.OrganizationID)
	}

	err = db.QueryRow(totalPoliciesQuery, totalPoliciesArgs...).Scan(&report.Summary.TotalPolicies)
	if err != nil {
		report.Summary.TotalPolicies = report.Summary.ActivePolicies // Fallback
	}

	// Get top policies by usage
	topPoliciesQuery := fmt.Sprintf(`
		SELECT 
			ae.resource_id as policy_id,
			COALESCE(p.name, 'Unknown Policy') as policy_name,
			COUNT(*) as usage_count,
			COUNT(CASE WHEN ae.result = 'allow' THEN 1 END) as allow_count,
			COUNT(CASE WHEN ae.result = 'deny' THEN 1 END) as deny_count
		FROM audit_events ae
		LEFT JOIN policies p ON ae.resource_id = p.id
		WHERE %s
		GROUP BY ae.resource_id, p.name
		ORDER BY usage_count DESC
		LIMIT 10`, whereClause)

	rows, err := db.Query(topPoliciesQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var policy PolicyUsageItem
		err := rows.Scan(
			&policy.PolicyID,
			&policy.PolicyName,
			&policy.UsageCount,
			&policy.AllowCount,
			&policy.DenyCount,
		)
		if err != nil {
			return nil, err
		}

		// Calculate effectiveness rate (allow rate)
		if policy.UsageCount > 0 {
			policy.EffectivRate = float64(policy.AllowCount) / float64(policy.UsageCount) * 100
		}

		report.Summary.TopPolicies = append(report.Summary.TopPolicies, policy)
	}

	// Get detailed policy usage
	detailQuery := fmt.Sprintf(`
		SELECT 
			ae.resource_id as policy_id,
			COALESCE(p.name, 'Unknown Policy') as policy_name,
			COALESCE(p.version, 'Unknown') as version,
			COALESCE(p.status, 'Unknown') as status,
			COUNT(*) as evaluations,
			COUNT(CASE WHEN ae.result = 'allow' THEN 1 END) as allows,
			COUNT(CASE WHEN ae.result = 'deny' THEN 1 END) as denies,
			MAX(ae.timestamp) as last_used
		FROM audit_events ae
		LEFT JOIN policies p ON ae.resource_id = p.id
		WHERE %s
		GROUP BY ae.resource_id, p.name, p.version, p.status
		ORDER BY evaluations DESC`, whereClause)

	rows, err = db.Query(detailQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var detail PolicyDetailedUsage
		err := rows.Scan(
			&detail.PolicyID,
			&detail.PolicyName,
			&detail.Version,
			&detail.Status,
			&detail.Evaluations,
			&detail.Allows,
			&detail.Denies,
			&detail.LastUsed,
		)
		if err != nil {
			return nil, err
		}

		// For avg response time, we'd need additional timing data in audit events
		// For now, set a placeholder value
		detail.AvgResponseMs = 50.0 // Placeholder

		report.PolicyDetails = append(report.PolicyDetails, detail)
	}

	return report, nil
}

// GetAuditEventsByUser retrieves audit events for a specific user within an organization
func (q *auditQueries) GetAuditEventsByUser(userID, organizationID string, limit int) ([]models.AuditEvent, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, event_id, timestamp, organization_id, principal_id, principal_type,
			   session_id, action, resource_type, resource_id, resource_arn,
			   result, error_message, ip_address, user_agent, request_id,
			   additional_context, severity
		FROM audit_events
		WHERE principal_id = $1 AND organization_id = $2
		ORDER BY timestamp DESC
		LIMIT $3`

	db := q.getDB()
	rows, err := db.Query(query, userID, organizationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.AuditEvent
	for rows.Next() {
		var event models.AuditEvent
		err := rows.Scan(
			&event.ID,
			&event.EventID,
			&event.Timestamp,
			&event.OrganizationID,
			&event.PrincipalID,
			&event.PrincipalType,
			&event.SessionID,
			&event.Action,
			&event.ResourceType,
			&event.ResourceID,
			&event.ResourceARN,
			&event.Result,
			&event.ErrorMessage,
			&event.IPAddress,
			&event.UserAgent,
			&event.RequestID,
			&event.AdditionalContext,
			&event.Severity,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, rows.Err()
}

// DeleteOldAuditEvents removes audit events older than the specified duration for an organization
func (q *auditQueries) DeleteOldAuditEvents(olderThan time.Duration, organizationID string) (int64, error) {
	cutoffTime := time.Now().Add(-olderThan)

	query := "DELETE FROM audit_events WHERE timestamp < $1 AND organization_id = $2"
	db := q.getDB()
	result, err := db.Exec(query, cutoffTime, organizationID)
	if err != nil {
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}

	return rowsAffected, nil
}

// ============================================================================
// ACCESS REVIEW OPERATIONS
// ============================================================================

// ListAccessReviews retrieves access reviews with filtering and pagination
func (q *auditQueries) ListAccessReviews(params ListAccessReviewsParams) ([]models.AccessReview, int, error) {
	whereConditions := []string{"1=1"}
	args := []interface{}{}
	argIndex := 1

	if params.OrganizationID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("organization_id = $%d", argIndex))
		args = append(args, params.OrganizationID)
		argIndex++
	}

	if params.ReviewerID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("reviewer_id = $%d", argIndex))
		args = append(args, params.ReviewerID)
		argIndex++
	}

	if params.Status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, params.Status)
		argIndex++
	}

	if params.StartTime != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *params.StartTime)
		argIndex++
	}

	if params.EndTime != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *params.EndTime)
		argIndex++
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Count total records
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM access_reviews WHERE %s", whereClause)
	var totalCount int
	db := q.getDB()
	err := db.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	// Set defaults for pagination
	if params.Limit <= 0 {
		params.Limit = 50
	}
	if params.Offset < 0 {
		params.Offset = 0
	}

	// Main query with pagination
	query := fmt.Sprintf(`
		SELECT id, name, description, organization_id, reviewer_id, scope,
			   status, due_date, completed_at, findings, recommendations,
			   created_at, updated_at
		FROM access_reviews
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, argIndex, argIndex+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reviews []models.AccessReview
	for rows.Next() {
		var review models.AccessReview
		err := rows.Scan(
			&review.ID,
			&review.Name,
			&review.Description,
			&review.OrganizationID,
			&review.ReviewerID,
			&review.Scope,
			&review.Status,
			&review.DueDate,
			&review.CompletedAt,
			&review.Findings,
			&review.Recommendations,
			&review.CreatedAt,
			&review.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		reviews = append(reviews, review)
	}

	return reviews, totalCount, rows.Err()
}

// CreateAccessReview creates a new access review
func (q *auditQueries) CreateAccessReview(review models.AccessReview) (*models.AccessReview, error) {
	query := `
		INSERT INTO access_reviews (
			id, name, description, organization_id, reviewer_id, scope,
			status, due_date, findings, recommendations, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		) RETURNING id, name, description, organization_id, reviewer_id, scope,
		  status, due_date, completed_at, findings, recommendations, created_at, updated_at`

	now := time.Now()
	if review.CreatedAt.IsZero() {
		review.CreatedAt = now
	}
	if review.UpdatedAt.IsZero() {
		review.UpdatedAt = now
	}
	if review.Status == "" {
		review.Status = "pending"
	}

	db := q.getDB()
	var createdReview models.AccessReview
	err := db.QueryRow(query,
		review.ID,
		review.Name,
		review.Description,
		review.OrganizationID,
		review.ReviewerID,
		review.Scope,
		review.Status,
		review.DueDate,
		review.Findings,
		review.Recommendations,
		review.CreatedAt,
		review.UpdatedAt,
	).Scan(
		&createdReview.ID,
		&createdReview.Name,
		&createdReview.Description,
		&createdReview.OrganizationID,
		&createdReview.ReviewerID,
		&createdReview.Scope,
		&createdReview.Status,
		&createdReview.DueDate,
		&createdReview.CompletedAt,
		&createdReview.Findings,
		&createdReview.Recommendations,
		&createdReview.CreatedAt,
		&createdReview.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &createdReview, nil
}

// GetAccessReview retrieves a specific access review by ID within an organization
func (q *auditQueries) GetAccessReview(reviewID, organizationID string) (*models.AccessReview, error) {
	query := `
		SELECT id, name, description, organization_id, reviewer_id, scope,
			   status, due_date, completed_at, findings, recommendations,
			   created_at, updated_at
		FROM access_reviews
		WHERE id = $1 AND organization_id = $2`

	var review models.AccessReview
	db := q.getDB()
	err := db.QueryRow(query, reviewID, organizationID).Scan(
		&review.ID,
		&review.Name,
		&review.Description,
		&review.OrganizationID,
		&review.ReviewerID,
		&review.Scope,
		&review.Status,
		&review.DueDate,
		&review.CompletedAt,
		&review.Findings,
		&review.Recommendations,
		&review.CreatedAt,
		&review.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("access review not found")
		}
		return nil, err
	}

	return &review, nil
}

// UpdateAccessReview updates an existing access review within an organization
func (q *auditQueries) UpdateAccessReview(reviewID, organizationID string, review models.AccessReview) (*models.AccessReview, error) {
	query := `
		UPDATE access_reviews SET
			name = $2,
			description = $3,
			reviewer_id = $4,
			scope = $5,
			status = $6,
			due_date = $7,
			findings = $8,
			recommendations = $9,
			updated_at = $10
		WHERE id = $1 AND organization_id = $11
		RETURNING id, name, description, organization_id, reviewer_id, scope,
		  status, due_date, completed_at, findings, recommendations, created_at, updated_at`

	review.UpdatedAt = time.Now()

	db := q.getDB()
	var updatedReview models.AccessReview
	err := db.QueryRow(query,
		reviewID,
		review.Name,
		review.Description,
		review.ReviewerID,
		review.Scope,
		review.Status,
		review.DueDate,
		review.Findings,
		review.Recommendations,
		review.UpdatedAt,
		organizationID,
	).Scan(
		&updatedReview.ID,
		&updatedReview.Name,
		&updatedReview.Description,
		&updatedReview.OrganizationID,
		&updatedReview.ReviewerID,
		&updatedReview.Scope,
		&updatedReview.Status,
		&updatedReview.DueDate,
		&updatedReview.CompletedAt,
		&updatedReview.Findings,
		&updatedReview.Recommendations,
		&updatedReview.CreatedAt,
		&updatedReview.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("access review not found")
		}
		return nil, err
	}

	return &updatedReview, nil
}

// CompleteAccessReview marks an access review as completed within an organization
func (q *auditQueries) CompleteAccessReview(reviewID, organizationID string, findings string, recommendations string) error {
	query := `
		UPDATE access_reviews SET
			status = 'completed',
			completed_at = $2,
			findings = $3,
			recommendations = $4,
			updated_at = $5
		WHERE id = $1 AND organization_id = $6 AND status != 'completed'`

	now := time.Now()
	db := q.getDB()
	result, err := db.Exec(query, reviewID, now, findings, recommendations, now, organizationID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("access review not found or already completed")
	}

	return nil
}

// DeleteAccessReview removes an access review within an organization
func (q *auditQueries) DeleteAccessReview(reviewID, organizationID string) error {
	query := "DELETE FROM access_reviews WHERE id = $1 AND organization_id = $2"
	db := q.getDB()
	result, err := db.Exec(query, reviewID, organizationID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("access review not found")
	}

	return nil
}
