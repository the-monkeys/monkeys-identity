package queries

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/database"
	"github.com/the-monkeys/monkeys-identity/internal/models"
)

// PolicyQueries defines all policy management database operations
type PolicyQueries interface {
	WithTx(tx *sql.Tx) PolicyQueries
	WithContext(ctx context.Context) PolicyQueries

	// Policy CRUD operations
	ListPolicies(params ListParams, organizationID string) (*ListResult[*models.Policy], error)
	CreatePolicy(policy *models.Policy) error
	GetPolicy(id, organizationID string) (*models.Policy, error)
	UpdatePolicy(policy *models.Policy, organizationID string) error
	DeletePolicy(id, organizationID string) error

	// Policy versioning and approval
	GetPolicyVersions(policyID, organizationID string) ([]*PolicyVersion, error)
	ApprovePolicy(policyID, organizationID, approvedBy string) error
	RollbackPolicy(policyID, organizationID, toVersion string) error

	// Policy simulation and evaluation
	SimulatePolicy(request *PolicySimulationRequest) (*PolicySimulationResult, error)
	EvaluatePolicy(policyDocument string, context *PolicyEvaluationContext) (*PolicyEvaluationResult, error)
	BulkCheckPermissions(organizationID string, requests []*PermissionCheckRequest) ([]*PermissionCheckResult, error)
	GetEffectivePermissions(principalID, principalType, organizationID string) (*EffectivePermissions, error)
	GetPrincipalPolicies(principalID, principalType, organizationID string) ([]*models.Policy, error)
}

// Policy versioning and simulation types
type PolicyVersion struct {
	ID        string    `json:"id" db:"id"`
	PolicyID  string    `json:"policy_id" db:"policy_id"`
	Version   string    `json:"version" db:"version"`
	Document  string    `json:"document" db:"document"`
	CreatedBy string    `json:"created_by" db:"created_by"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	Status    string    `json:"status" db:"status"` // draft, active, deprecated
}

type PolicySimulationRequest struct {
	PolicyDocument string                      `json:"policy_document"`
	Context        *PolicyEvaluationContext    `json:"context"`
	TestCases      []*PolicySimulationTestCase `json:"test_cases"`
}

type PolicySimulationTestCase struct {
	Name      string                   `json:"name"`
	Principal string                   `json:"principal"`
	Resource  string                   `json:"resource"`
	Action    string                   `json:"action"`
	Context   *PolicyEvaluationContext `json:"context"`
	Expected  string                   `json:"expected"` // allow, deny, not_applicable
}

type PolicySimulationResult struct {
	PolicyID    string                  `json:"policy_id,omitempty"`
	Valid       bool                    `json:"valid"`
	Errors      []string                `json:"errors,omitempty"`
	TestResults []*PolicyTestResult     `json:"test_results"`
	Evaluation  *PolicyEvaluationResult `json:"evaluation"`
}

type PolicyTestResult struct {
	TestCase *PolicySimulationTestCase `json:"test_case"`
	Result   *PolicyEvaluationResult   `json:"result"`
	Passed   bool                      `json:"passed"`
	Message  string                    `json:"message"`
}

type PolicyEvaluationContext struct {
	Principal   string            `json:"principal"`
	Resource    string            `json:"resource"`
	Action      string            `json:"action"`
	Environment map[string]string `json:"environment"`
	RequestTime time.Time         `json:"request_time"`
	SourceIP    string            `json:"source_ip"`
	UserAgent   string            `json:"user_agent"`
	SessionID   string            `json:"session_id"`
}

type PolicyEvaluationResult struct {
	Effect        string            `json:"effect"`   // allow, deny, not_applicable
	Decision      string            `json:"decision"` // final decision after combining policies
	MatchedPolicy string            `json:"matched_policy,omitempty"`
	Conditions    map[string]bool   `json:"conditions,omitempty"`
	Reasons       []string          `json:"reasons"`
	Metadata      map[string]string `json:"metadata,omitempty"`
}

type PermissionCheckRequest struct {
	PrincipalID    string                   `json:"principal_id"`
	PrincipalType  string                   `json:"principal_type"`
	OrganizationID string                   `json:"organization_id"`
	Resource       string                   `json:"resource"`
	Action         string                   `json:"action"`
	Context        *PolicyEvaluationContext `json:"context"`
}

type PermissionCheckResult struct {
	Allowed    bool                    `json:"allowed"`
	Decision   string                  `json:"decision"`
	Policies   []string                `json:"policies"`
	Evaluation *PolicyEvaluationResult `json:"evaluation"`
	Request    *PermissionCheckRequest `json:"request"`
}

type EffectivePermissions struct {
	PrincipalID   string                `json:"principal_id"`
	PrincipalType string                `json:"principal_type"`
	Permissions   []EffectivePermission `json:"permissions"`
	GeneratedAt   time.Time             `json:"generated_at"`
}

type EffectivePermission struct {
	Resource   string   `json:"resource"`
	Actions    []string `json:"actions"`
	Effect     string   `json:"effect"`
	Source     string   `json:"source"` // policy name or role
	Conditions []string `json:"conditions,omitempty"`
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

func (q *policyQueries) ListPolicies(params ListParams, organizationID string) (*ListResult[*models.Policy], error) {
	query := `
		SELECT id, name, description, version, organization_id, document, policy_type,
		       effect, is_system_policy, created_by, approved_by, approved_at, status,
		       created_at, updated_at, deleted_at
		FROM policies 
		WHERE deleted_at IS NULL`
	args := []interface{}{}
	argCount := 0

	if organizationID != "" {
		argCount++
		query += fmt.Sprintf(" AND organization_id = $%d", argCount)
		args = append(args, organizationID)
	}

	if params.SortBy != "" {
		query += fmt.Sprintf(" ORDER BY %s %s", params.SortBy, params.Order)
	} else {
		query += " ORDER BY created_at DESC"
	}

	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argCount+1, argCount+2)
	args = append(args, params.Limit, params.Offset)

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list policies: %w", err)
	}
	defer rows.Close()

	var policies []models.Policy
	for rows.Next() {
		var (
			p          models.Policy
			createdBy  sql.NullString
			approvedBy sql.NullString
			approvedAt sql.NullTime
			deletedAt  sql.NullTime
		)

		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Version, &p.OrganizationID,
			&p.Document, &p.PolicyType, &p.Effect, &p.IsSystemPolicy, &createdBy,
			&approvedBy, &approvedAt, &p.Status, &p.CreatedAt, &p.UpdatedAt, &deletedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan policy: %w", err)
		}

		if createdBy.Valid {
			p.CreatedBy = createdBy.String
		}
		if approvedBy.Valid {
			p.ApprovedBy = approvedBy.String
		}
		if approvedAt.Valid {
			p.ApprovedAt = approvedAt.Time
		}
		if deletedAt.Valid {
			p.DeletedAt = deletedAt.Time
		}

		policies = append(policies, p)
	}

	// Convert to pointers for generic return type
	var policyPtrs []*models.Policy
	for i := range policies {
		policyPtrs = append(policyPtrs, &policies[i])
	}

	// Get total count
	countQuery := `SELECT COUNT(*) FROM policies WHERE deleted_at IS NULL`
	countArgs := []interface{}{}
	if organizationID != "" {
		countQuery += " AND organization_id = $1"
		countArgs = append(countArgs, organizationID)
	}

	var total int
	err = db.QueryRowContext(q.ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count policies: %w", err)
	}

	return &ListResult[*models.Policy]{
		Items:      policyPtrs,
		Total:      int64(total),
		Limit:      params.Limit,
		Offset:     params.Offset,
		HasMore:    (params.Offset + params.Limit) < total,
		TotalPages: (total + params.Limit - 1) / params.Limit,
	}, nil
}

func (q *policyQueries) CreatePolicy(policy *models.Policy) error {
	// Validate policy document
	if err := q.validatePolicyDocument(policy.Document); err != nil {
		return fmt.Errorf("invalid policy document: %w", err)
	}

	// Create main policy record
	query := `
		INSERT INTO policies (
			id, name, description, version, organization_id, document, policy_type,
			effect, is_system_policy, created_by, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	policy.CreatedAt = time.Now()
	policy.UpdatedAt = time.Now()
	if policy.Status == "" {
		policy.Status = "active"
	}
	if policy.Version == "" {
		policy.Version = "1.0.0"
	}

	_, err := db.ExecContext(q.ctx, query,
		policy.ID, policy.Name, policy.Description, policy.Version, policy.OrganizationID,
		policy.Document, policy.PolicyType, policy.Effect, policy.IsSystemPolicy,
		policy.CreatedBy, policy.Status, policy.CreatedAt, policy.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create policy: %w", err)
	}

	// Create initial version record
	versionQuery := `
		INSERT INTO policy_versions (id, policy_id, version, document, created_by, created_at, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	versionID := uuid.New().String()
	_, err = db.ExecContext(q.ctx, versionQuery,
		versionID, policy.ID, policy.Version, policy.Document,
		policy.CreatedBy, policy.CreatedAt, "draft")

	if err != nil {
		return fmt.Errorf("failed to create policy version: %w", err)
	}

	return nil
}

func (q *policyQueries) GetPolicy(id, organizationID string) (*models.Policy, error) {
	query := `
		SELECT id, name, description, version, organization_id, document, policy_type,
		       effect, is_system_policy, created_by, approved_by, approved_at, status,
		       created_at, updated_at, deleted_at
		FROM policies 
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	var p models.Policy
	var (
		createdBy  sql.NullString
		approvedBy sql.NullString
		approvedAt sql.NullTime
		deletedAt  sql.NullTime
	)

	err := db.QueryRowContext(q.ctx, query, id, organizationID).Scan(
		&p.ID, &p.Name, &p.Description, &p.Version, &p.OrganizationID,
		&p.Document, &p.PolicyType, &p.Effect, &p.IsSystemPolicy, &createdBy,
		&approvedBy, &approvedAt, &p.Status, &p.CreatedAt, &p.UpdatedAt, &deletedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("policy not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get policy: %w", err)
	}

	if createdBy.Valid {
		p.CreatedBy = createdBy.String
	}
	if approvedBy.Valid {
		p.ApprovedBy = approvedBy.String
	}
	if approvedAt.Valid {
		p.ApprovedAt = approvedAt.Time
	}
	if deletedAt.Valid {
		p.DeletedAt = deletedAt.Time
	}

	return &p, nil
}

func (q *policyQueries) UpdatePolicy(policy *models.Policy, organizationID string) error {
	// Validate policy document
	if err := q.validatePolicyDocument(policy.Document); err != nil {
		return fmt.Errorf("invalid policy document: %w", err)
	}

	// Get current policy to compare versions
	currentPolicy, err := q.GetPolicy(policy.ID, organizationID)
	if err != nil {
		return err
	}

	if policy.Status == "" {
		policy.Status = currentPolicy.Status
	}

	// Create new version if document changed
	if currentPolicy.Document != policy.Document {
		newVersion := q.incrementVersion(currentPolicy.Version)
		policy.Version = newVersion

		// Create version record
		versionQuery := `
			INSERT INTO policy_versions (id, policy_id, version, document, created_by, created_at, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`

		var db DBTX = q.db
		if q.tx != nil {
			db = q.tx
		}

		versionID := uuid.New().String()
		_, err = db.ExecContext(q.ctx, versionQuery,
			versionID, policy.ID, policy.Version, policy.Document,
			policy.CreatedBy, time.Now(), "draft")

		if err != nil {
			return fmt.Errorf("failed to create policy version: %w", err)
		}
	}

	// Update main policy record
	query := `
		UPDATE policies SET
			name = $2, description = $3, version = $4, document = $5, policy_type = $6,
			effect = $7, status = $8, updated_at = $9
		WHERE id = $1 AND organization_id = $10 AND deleted_at IS NULL`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	policy.UpdatedAt = time.Now()
	result, err := db.ExecContext(q.ctx, query,
		policy.ID, policy.Name, policy.Description, policy.Version, policy.Document,
		policy.PolicyType, policy.Effect, policy.Status, policy.UpdatedAt, organizationID)

	if err != nil {
		return fmt.Errorf("failed to update policy: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("policy not found or already deleted")
	}

	return nil
}

func (q *policyQueries) DeletePolicy(id, organizationID string) error {
	query := `UPDATE policies SET deleted_at = $3, status = 'deleted' WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	result, err := db.ExecContext(q.ctx, query, id, organizationID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to delete policy: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("policy not found or already deleted")
	}

	return nil
}

func (q *policyQueries) GetPolicyVersions(policyID, organizationID string) ([]*PolicyVersion, error) {
	query := `
		SELECT pv.id, pv.policy_id, pv.version, pv.document, pv.created_by, pv.created_at, pv.status
		FROM policy_versions pv
		JOIN policies p ON pv.policy_id = p.id
		WHERE pv.policy_id = $1 AND p.organization_id = $2
		ORDER BY pv.created_at DESC`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, policyID, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get policy versions: %w", err)
	}
	defer rows.Close()

	var versions []*PolicyVersion
	for rows.Next() {
		var v PolicyVersion
		err := rows.Scan(&v.ID, &v.PolicyID, &v.Version, &v.Document,
			&v.CreatedBy, &v.CreatedAt, &v.Status)
		if err != nil {
			return nil, fmt.Errorf("failed to scan policy version: %w", err)
		}
		versions = append(versions, &v)
	}

	return versions, nil
}

func (q *policyQueries) ApprovePolicy(policyID, organizationID, approvedBy string) error {
	query := `
		UPDATE policies SET 
			status = 'active', approved_by = $2, approved_at = $3, updated_at = $3
		WHERE id = $1 AND organization_id = $4 AND deleted_at IS NULL`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	now := time.Now()
	result, err := db.ExecContext(q.ctx, query, policyID, approvedBy, now, organizationID)
	if err != nil {
		return fmt.Errorf("failed to approve policy: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check approval result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("policy not found or already deleted")
	}

	// Update corresponding version record
	versionQuery := `
		UPDATE policy_versions SET status = 'active' 
		WHERE policy_id = $1 AND version = (SELECT version FROM policies WHERE id = $1)`

	_, err = db.ExecContext(q.ctx, versionQuery, policyID)
	if err != nil {
		return fmt.Errorf("failed to update policy version status: %w", err)
	}

	return nil
}

func (q *policyQueries) RollbackPolicy(policyID, organizationID, toVersion string) error {
	// Get the target version document
	versionQuery := `
		SELECT pv.document 
		FROM policy_versions pv
		JOIN policies p ON pv.policy_id = p.id
		WHERE pv.policy_id = $1 AND pv.version = $2 AND p.organization_id = $3`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	var document string
	err := db.QueryRowContext(q.ctx, versionQuery, policyID, toVersion, organizationID).Scan(&document)
	if err == sql.ErrNoRows {
		return fmt.Errorf("policy version not found")
	}
	if err != nil {
		return fmt.Errorf("failed to get policy version: %w", err)
	}

	// Update policy to use the target version
	updateQuery := `
		UPDATE policies SET 
			document = $2, version = $3, status = 'active', updated_at = $4
		WHERE id = $1 AND organization_id = $5 AND deleted_at IS NULL`

	now := time.Now()
	result, err := db.ExecContext(q.ctx, updateQuery, policyID, document, toVersion, now, organizationID)
	if err != nil {
		return fmt.Errorf("failed to rollback policy: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rollback result: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("policy not found")
	}

	return nil
}

// Continuing with simulation and evaluation methods...
func (q *policyQueries) SimulatePolicy(request *PolicySimulationRequest) (*PolicySimulationResult, error) {
	result := &PolicySimulationResult{
		Valid:       true,
		Errors:      []string{},
		TestResults: []*PolicyTestResult{},
	}

	// Validate policy document syntax
	if err := q.validatePolicyDocument(request.PolicyDocument); err != nil {
		result.Valid = false
		result.Errors = append(result.Errors, err.Error())
		return result, nil
	}

	// Evaluate policy with provided context
	if request.Context != nil {
		evaluation, err := q.EvaluatePolicy(request.PolicyDocument, request.Context)
		if err != nil {
			result.Valid = false
			result.Errors = append(result.Errors, err.Error())
		} else {
			result.Evaluation = evaluation
		}
	}

	// Run test cases if provided
	for _, testCase := range request.TestCases {
		testResult := &PolicyTestResult{
			TestCase: testCase,
		}

		// Build context from test case if not provided
		context := testCase.Context
		if context == nil {
			context = &PolicyEvaluationContext{
				Principal: testCase.Principal,
				Resource:  testCase.Resource,
				Action:    testCase.Action,
			}
		}

		evaluation, err := q.EvaluatePolicy(request.PolicyDocument, context)
		if err != nil {
			testResult.Result = &PolicyEvaluationResult{
				Effect:   "error",
				Decision: "error",
				Reasons:  []string{err.Error()},
			}
			testResult.Passed = false
			testResult.Message = err.Error()
		} else {
			testResult.Result = evaluation
			testResult.Passed = (evaluation.Effect == testCase.Expected)
			if testResult.Passed {
				testResult.Message = "Test passed"
			} else {
				testResult.Message = fmt.Sprintf("Expected %s, got %s", testCase.Expected, evaluation.Effect)
			}
		}

		result.TestResults = append(result.TestResults, testResult)
	}

	return result, nil
}

func (q *policyQueries) EvaluatePolicy(policyDocument string, context *PolicyEvaluationContext) (*PolicyEvaluationResult, error) {
	// Parse policy document
	var policy map[string]interface{}
	if err := json.Unmarshal([]byte(policyDocument), &policy); err != nil {
		return nil, fmt.Errorf("invalid policy JSON: %w", err)
	}

	result := &PolicyEvaluationResult{
		Effect:     "not_applicable",
		Decision:   "not_applicable",
		Conditions: make(map[string]bool),
		Reasons:    []string{},
		Metadata:   make(map[string]string),
	}

	// Extract statements
	statements, ok := policy["Statement"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("policy must have Statement array")
	}

	for _, stmt := range statements {
		statement := stmt.(map[string]interface{})

		// Check if statement applies to this context
		if q.statementMatches(statement, context) {
			effect := statement["Effect"].(string)
			result.Effect = strings.ToLower(effect)
			result.Decision = result.Effect
			result.Reasons = append(result.Reasons, fmt.Sprintf("Statement matched for action %s on resource %s", context.Action, context.Resource))

			// If we find a deny, that takes precedence
			if result.Effect == "deny" {
				break
			}
		}
	}

	return result, nil
}

func (q *policyQueries) CheckPermission(organizationID string, request *PermissionCheckRequest) (*PermissionCheckResult, error) {
	// Use organizationID from parameter if provided, otherwise from request
	orgID := organizationID
	if orgID == "" {
		orgID = request.OrganizationID
	}

	// Get all policies that apply to this principal
	policies, err := q.getPrincipalPolicies(request.PrincipalID, request.PrincipalType, orgID)
	if err != nil {
		return nil, err
	}

	result := &PermissionCheckResult{
		Allowed:  false,
		Decision: "deny",
		Policies: []string{},
		Request:  request,
	}

	// Evaluate each policy
	var finalEvaluation *PolicyEvaluationResult
	hasExplicitDeny := false

	for _, policy := range policies {
		evaluation, err := q.EvaluatePolicy(policy.Document, request.Context)
		if err != nil {
			continue // Skip invalid policies
		}

		result.Policies = append(result.Policies, policy.ID)

		if evaluation.Effect == "deny" {
			hasExplicitDeny = true
			finalEvaluation = evaluation
			break // Explicit deny overrides everything
		} else if evaluation.Effect == "allow" && !hasExplicitDeny {
			result.Allowed = true
			result.Decision = "allow"
			finalEvaluation = evaluation
		}
	}

	if hasExplicitDeny {
		result.Allowed = false
		result.Decision = "deny"
	}

	result.Evaluation = finalEvaluation
	return result, nil
}

func (q *policyQueries) BulkCheckPermissions(organizationID string, requests []*PermissionCheckRequest) ([]*PermissionCheckResult, error) {
	results := make([]*PermissionCheckResult, len(requests))

	for i, request := range requests {
		result, err := q.CheckPermission(organizationID, request)
		if err != nil {
			results[i] = &PermissionCheckResult{
				Allowed:  false,
				Decision: "error",
				Request:  request,
				Evaluation: &PolicyEvaluationResult{
					Effect:   "deny",
					Decision: "error",
					Reasons:  []string{err.Error()},
				},
			}
		} else {
			results[i] = result
		}
	}

	return results, nil
}

func (q *policyQueries) GetEffectivePermissions(principalID, principalType, organizationID string) (*EffectivePermissions, error) {
	// Get all policies for the principal
	policies, err := q.getPrincipalPolicies(principalID, principalType, organizationID)
	if err != nil {
		return nil, err
	}

	effective := &EffectivePermissions{
		PrincipalID:   principalID,
		PrincipalType: principalType,
		Permissions:   []EffectivePermission{},
		GeneratedAt:   time.Now(),
	}

	resourcePermissions := make(map[string]*EffectivePermission)

	// Process each policy
	for _, policy := range policies {
		var policyDoc map[string]interface{}
		if err := json.Unmarshal([]byte(policy.Document), &policyDoc); err != nil {
			continue // Skip invalid policies
		}

		statements, ok := policyDoc["Statement"].([]interface{})
		if !ok {
			continue
		}

		for _, stmt := range statements {
			statement := stmt.(map[string]interface{})
			effect := strings.ToLower(statement["Effect"].(string))

			// Extract resources and actions
			resources := q.extractStringArray(statement["Resource"])
			actions := q.extractStringArray(statement["Action"])

			for _, resource := range resources {
				if perm, exists := resourcePermissions[resource]; exists {
					// Merge actions
					for _, action := range actions {
						if !q.contains(perm.Actions, action) {
							perm.Actions = append(perm.Actions, action)
						}
					}
					// Deny overrides allow
					if effect == "deny" {
						perm.Effect = "deny"
					}
				} else {
					resourcePermissions[resource] = &EffectivePermission{
						Resource: resource,
						Actions:  actions,
						Effect:   effect,
						Source:   policy.Name,
					}
				}
			}
		}
	}

	// Convert map to slice
	for _, perm := range resourcePermissions {
		effective.Permissions = append(effective.Permissions, *perm)
	}

	return effective, nil
}

// Helper methods
func (q *policyQueries) validatePolicyDocument(document string) error {
	var policy map[string]interface{}
	if err := json.Unmarshal([]byte(document), &policy); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Check required fields
	if _, ok := policy["Statement"]; !ok {
		return fmt.Errorf("policy must have Statement field")
	}

	statements, ok := policy["Statement"].([]interface{})
	if !ok {
		return fmt.Errorf("Statement must be an array")
	}

	for i, stmt := range statements {
		statement := stmt.(map[string]interface{})

		if _, ok := statement["Effect"]; !ok {
			return fmt.Errorf("statement %d must have Effect field", i)
		}

		effect := statement["Effect"].(string)
		if effect != "Allow" && effect != "Deny" {
			return fmt.Errorf("statement %d Effect must be Allow or Deny", i)
		}

		if _, ok := statement["Action"]; !ok {
			return fmt.Errorf("statement %d must have Action field", i)
		}

		if _, ok := statement["Resource"]; !ok {
			return fmt.Errorf("statement %d must have Resource field", i)
		}
	}

	return nil
}

func (q *policyQueries) incrementVersion(currentVersion string) string {
	parts := strings.Split(currentVersion, ".")
	if len(parts) != 3 {
		return "1.0.1"
	}

	major, err := strconv.Atoi(parts[0])
	if err != nil {
		major = 1
	}
	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		minor = 0
	}
	patch, err := strconv.Atoi(parts[2])
	if err != nil {
		patch = 0
	}

	patch++

	return fmt.Sprintf("%d.%d.%d", major, minor, patch)
}

func (q *policyQueries) statementMatches(statement map[string]interface{}, context *PolicyEvaluationContext) bool {
	// Check action match
	actions := q.extractStringArray(statement["Action"])
	if !q.matchesPattern(actions, context.Action) {
		return false
	}

	// Check resource match
	resources := q.extractStringArray(statement["Resource"])
	if !q.matchesPattern(resources, context.Resource) {
		return false
	}

	// TODO: Add condition evaluation
	return true
}

func (q *policyQueries) extractStringArray(field interface{}) []string {
	switch v := field.(type) {
	case string:
		return []string{v}
	case []interface{}:
		result := make([]string, len(v))
		for i, item := range v {
			result[i] = item.(string)
		}
		return result
	default:
		return []string{}
	}
}

func (q *policyQueries) matchesPattern(patterns []string, value string) bool {
	for _, pattern := range patterns {
		if pattern == "*" || pattern == value {
			return true
		}
		// TODO: Add wildcard matching
	}
	return false
}

func (q *policyQueries) GetPrincipalPolicies(principalID, principalType, organizationID string) ([]*models.Policy, error) {
	return q.getPrincipalPolicies(principalID, principalType, organizationID)
}

func (q *policyQueries) getPrincipalPolicies(principalID, principalType, organizationID string) ([]*models.Policy, error) {
	// 1. Get direct policy attachments
	// 2. Get policies through role assignments (Direct + via Groups)

	query := `
		WITH principal_roles AS (
			-- Roles assigned directly to the principal
			SELECT ra.role_id 
			FROM role_assignments ra
			WHERE ra.principal_id = $1 AND ra.principal_type = $2
			  AND (ra.expires_at IS NULL OR ra.expires_at > NOW())
			
			UNION
			
			-- Roles assigned to groups the principal belongs to
			SELECT ra.role_id
			FROM role_assignments ra
			JOIN group_memberships gm ON ra.principal_id = gm.group_id
			WHERE gm.principal_id = $1 AND gm.principal_type = $2
			  AND ra.principal_type = 'group'
			  AND (ra.expires_at IS NULL OR ra.expires_at > NOW())
			  AND (gm.expires_at IS NULL OR gm.expires_at > NOW())
		)
		SELECT DISTINCT p.id, p.name, p.description, p.version, p.organization_id, 
		       p.document, p.policy_type, p.effect, p.is_system_policy, 
		       COALESCE(p.created_by::text, ''), COALESCE(p.approved_by::text, ''), 
		       COALESCE(p.approved_at, '0001-01-01'::timestamp), 
		       p.status, p.created_at, p.updated_at, 
		       COALESCE(p.deleted_at, '0001-01-01'::timestamp)
		FROM policies p
		JOIN role_policies rp ON p.id = rp.policy_id
		JOIN principal_roles pr ON rp.role_id = pr.role_id
		WHERE p.status = 'active' AND p.organization_id = $3`

	var db DBTX = q.db
	if q.tx != nil {
		db = q.tx
	}

	rows, err := db.QueryContext(q.ctx, query, principalID, principalType, organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get principal policies: %w", err)
	}
	defer rows.Close()

	var policies []*models.Policy
	for rows.Next() {
		var p models.Policy
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Version, &p.OrganizationID,
			&p.Document, &p.PolicyType, &p.Effect, &p.IsSystemPolicy, &p.CreatedBy,
			&p.ApprovedBy, &p.ApprovedAt, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan policy: %w", err)
		}
		policies = append(policies, &p)
	}

	return policies, nil
}

func (q *policyQueries) contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
