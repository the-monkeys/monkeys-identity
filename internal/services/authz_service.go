package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/the-monkeys/monkeys-identity/internal/authz"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
)

// AuthzService defines the interface for the unified authorization service
type AuthzService interface {
	Authorize(ctx context.Context, principalID, principalType, orgID, action, resource string, context map[string]interface{}) (authz.Decision, error)
}

type authzService struct {
	queries *queries.Queries
	eval    *authz.Evaluator
}

// NewAuthzService creates a new AuthzService instance
func NewAuthzService(q *queries.Queries) AuthzService {
	return &authzService{
		queries: q,
		eval:    authz.NewEvaluator(),
	}
}

// Authorize performs a comprehensive authorization check
func (s *authzService) Authorize(ctx context.Context, principalID, principalType, orgID, action, resource string, context map[string]interface{}) (authz.Decision, error) {
	// 1. Get all applicable PBAC policies (Direct + Group inherited)
	policies, err := s.queries.Policy.WithContext(ctx).GetPrincipalPolicies(principalID, principalType, orgID)
	if err != nil {
		return authz.DecisionDeny, fmt.Errorf("failed to fetch policies: %w", err)
	}

	// 2. Evaluate PBAC policies
	var finalDecision authz.Decision = authz.DecisionNotApplicable
	for _, p := range policies {
		decision, err := s.eval.Evaluate(p.Document, action, resource, context)
		if err != nil {
			continue // Skip malformed policies
		}

		if decision == authz.DecisionDeny {
			return authz.DecisionDeny, nil // Explicit Deny overrides everything
		}
		if decision == authz.DecisionAllow {
			finalDecision = authz.DecisionAllow
		}
	}

	// 3. Evaluate Resource-based permissions (Simplified PBAC)
	// These are stored in the resource_permissions table
	resPerms, err := s.queries.Resource.WithContext(ctx).GetPrincipalPermissions(principalID, principalType, orgID)
	if err == nil {
		for _, rp := range resPerms {
			if rp.ResourceID == resource && s.eval.MatchWildcard(rp.Permission, action) {
				if strings.EqualFold(rp.Effect, "deny") {
					return authz.DecisionDeny, nil
				}
				if strings.EqualFold(rp.Effect, "allow") {
					finalDecision = authz.DecisionAllow
				}
			}
		}
	}

	// 4. Evaluate ReBAC (Resource Shares)
	// These are stored in the resource_shares table
	shares, err := s.queries.Resource.WithContext(ctx).GetPrincipalShares(principalID, principalType, orgID)
	if err == nil {
		for _, share := range shares {
			if share.ResourceID == resource {
				// Map access levels to actions
				if s.authorizeShare(share.AccessLevel, action) {
					finalDecision = authz.DecisionAllow
				}
			}
		}
	}

	// Default Deny if no explicit allow was found
	if finalDecision == authz.DecisionNotApplicable {
		return authz.DecisionDeny, nil
	}

	return finalDecision, nil
}

// authorizeShare maps high-level access tiers to specific actions
func (s *authzService) authorizeShare(accessLevel, action string) bool {
	switch strings.ToLower(accessLevel) {
	case "owner":
		return true // Owner can do everything on the resource
	case "editor":
		// Editors can read and write but maybe not delete or share
		return !strings.Contains(strings.ToLower(action), "delete") && !strings.Contains(strings.ToLower(action), "share")
	case "viewer":
		// Viewers can only read/list
		return strings.EqualFold(action, "read") || strings.EqualFold(action, "list") || strings.EqualFold(action, "view")
	default:
		return false
	}
}
