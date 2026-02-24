package authz

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// Decision represents the outcome of an authorization check
type Decision string

const (
	DecisionAllow         Decision = "allow"
	DecisionDeny          Decision = "deny"
	DecisionNotApplicable Decision = "not_applicable"
)

// PolicyDocument represents the JSON structure of a policy
type PolicyDocument struct {
	Version   string      `json:"Version"`
	Statement []Statement `json:"Statement"`
}

// Statement represents a single rule within a policy
type Statement struct {
	Sid       string      `json:"Sid,omitempty"`
	Effect    string      `json:"Effect"`
	Action    interface{} `json:"Action"`   // Can be string or []string
	Resource  interface{} `json:"Resource"` // Can be string or []string
	Condition interface{} `json:"Condition,omitempty"`
}

// Evaluator handles policy evaluation logic
type Evaluator struct{}

// NewEvaluator creates a new Evaluator
func NewEvaluator() *Evaluator {
	return &Evaluator{}
}

// Evaluate determines if a request is allowed based on a policy document
func (e *Evaluator) Evaluate(docJSON string, action, resource string, context map[string]interface{}) (Decision, error) {
	var doc PolicyDocument
	if err := json.Unmarshal([]byte(docJSON), &doc); err != nil {
		return DecisionDeny, fmt.Errorf("invalid policy document: %w", err)
	}

	ce := NewConditionEvaluator()

	for _, stmt := range doc.Statement {
		matched, err := e.matches(stmt, action, resource, context, ce)
		if err != nil {
			return DecisionDeny, err
		}

		if matched {
			if strings.EqualFold(stmt.Effect, "Deny") {
				return DecisionDeny, nil
			}
			if strings.EqualFold(stmt.Effect, "Allow") {
				return DecisionAllow, nil
			}
		}
	}

	return DecisionNotApplicable, nil
}

// matches checks if a statement applies to the given request
func (e *Evaluator) matches(stmt Statement, action, resource string, context map[string]interface{}, ce *ConditionEvaluator) (bool, error) {
	// Check Action
	if !e.matchField(stmt.Action, action) {
		return false, nil
	}

	// Check Resource
	if !e.matchField(stmt.Resource, resource) {
		return false, nil
	}

	// Check Condition
	if stmt.Condition != nil {
		satisfied, err := ce.Evaluate(stmt.Condition, context)
		if err != nil {
			return false, err
		}
		return satisfied, nil
	}

	return true, nil
}

// matchField checks if a value matches a field (string or []string) with wildcard support
func (e *Evaluator) matchField(field interface{}, value string) bool {
	switch v := field.(type) {
	case string:
		return e.MatchWildcard(v, value)
	case []interface{}:
		for _, item := range v {
			if s, ok := item.(string); ok {
				if e.MatchWildcard(s, value) {
					return true
				}
			}
		}
	case []string:
		for _, s := range v {
			if e.MatchWildcard(s, value) {
				return true
			}
		}
	}
	return false
}

// MatchWildcard performs simple wildcard matching (* and ?)
func (e *Evaluator) MatchWildcard(pattern, value string) bool {
	if pattern == "*" {
		return true
	}

	// Escape special regex characters except * and ?
	escaped := regexp.QuoteMeta(pattern)
	// Replace * with .*
	escaped = strings.ReplaceAll(escaped, "\\*", ".*")
	// Replace ? with .
	escaped = strings.ReplaceAll(escaped, "\\?", ".")

	re, err := regexp.Compile("^" + escaped + "$")
	if err != nil {
		// Fallback to simple string comparison if regex fails
		return pattern == value
	}

	return re.MatchString(value)
}
