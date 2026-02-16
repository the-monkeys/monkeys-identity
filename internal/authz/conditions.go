package authz

import (
	"fmt"
	"net"
	"reflect"
	"strings"
)

// ConditionEvaluator handles complex condition logic for ABAC
type ConditionEvaluator struct{}

// NewConditionEvaluator creates a new ConditionEvaluator
func NewConditionEvaluator() *ConditionEvaluator {
	return &ConditionEvaluator{}
}

// Evaluate checks if a condition set is satisfied by the context
func (ce *ConditionEvaluator) Evaluate(condition interface{}, context map[string]interface{}) (bool, error) {
	if condition == nil {
		return true, nil
	}

	condMap, ok := condition.(map[string]interface{})
	if !ok {
		return false, fmt.Errorf("condition must be a map")
	}

	// All operators must be true (logical AND at the top level)
	for operator, requirements := range condMap {
		satisfied, err := ce.evaluateOperator(operator, requirements, context)
		if err != nil {
			return false, err
		}
		if !satisfied {
			return false, nil
		}
	}

	return true, nil
}

func (ce *ConditionEvaluator) evaluateOperator(operator string, requirements interface{}, context map[string]interface{}) (bool, error) {
	reqMap, ok := requirements.(map[string]interface{})
	if !ok {
		return false, fmt.Errorf("operator requirements must be a map of key-values")
	}

	for key, expectedValue := range reqMap {
		actualValue, exists := context[key]
		if !exists {
			// If key is missing from context, condition is not satisfied
			return false, nil
		}

		satisfied, err := ce.applyOperator(operator, expectedValue, actualValue)
		if err != nil {
			return false, err
		}
		if !satisfied {
			return false, nil
		}
	}

	return true, nil
}

func (ce *ConditionEvaluator) applyOperator(operator string, expected, actual interface{}) (bool, error) {
	switch operator {
	case "StringEquals":
		return ce.stringEquals(expected, actual), nil
	case "StringNotEquals":
		return !ce.stringEquals(expected, actual), nil
	case "StringEqualsIgnoreCase":
		return ce.stringEqualsIgnoreCase(expected, actual), nil
	case "StringLike":
		return ce.stringLike(expected, actual), nil
	case "Bool":
		return ce.boolEquals(expected, actual), nil
	case "NumericEquals":
		return ce.numericEquals(expected, actual), nil
	case "IpAddress":
		return ce.ipAddressMatch(expected, actual), nil
	default:
		return false, fmt.Errorf("unsupported condition operator: %s", operator)
	}
}

func (ce *ConditionEvaluator) stringEquals(expected, actual interface{}) bool {
	return fmt.Sprintf("%v", expected) == fmt.Sprintf("%v", actual)
}

func (ce *ConditionEvaluator) stringEqualsIgnoreCase(expected, actual interface{}) bool {
	return strings.EqualFold(fmt.Sprintf("%v", expected), fmt.Sprintf("%v", actual))
}

func (ce *ConditionEvaluator) stringLike(expected, actual interface{}) bool {
	// Reusing wildcard matching logic
	e := &Evaluator{}
	return e.MatchWildcard(fmt.Sprintf("%v", expected), fmt.Sprintf("%v", actual))
}

func (ce *ConditionEvaluator) boolEquals(expected, actual interface{}) bool {
	e, ok1 := expected.(bool)
	a, ok2 := actual.(bool)
	if !ok1 || !ok2 {
		return fmt.Sprintf("%v", expected) == fmt.Sprintf("%v", actual)
	}
	return e == a
}

func (ce *ConditionEvaluator) numericEquals(expected, actual interface{}) bool {
	// Try decimal comparison via strings to handle different types (int, float64 from JSON)
	return fmt.Sprintf("%v", expected) == fmt.Sprintf("%v", actual)
}

func (ce *ConditionEvaluator) ipAddressMatch(expected, actual interface{}) bool {
	expectedStr := fmt.Sprintf("%v", expected)
	actualStr := fmt.Sprintf("%v", actual)

	// Check if expected is a CIDR range
	if strings.Contains(expectedStr, "/") {
		_, ipNet, err := net.ParseCIDR(expectedStr)
		if err != nil {
			return false
		}
		actualIP := net.ParseIP(actualStr)
		if actualIP == nil {
			return false
		}
		return ipNet.Contains(actualIP)
	}

	// Simple IP comparison
	expectedIP := net.ParseIP(expectedStr)
	actualIP := net.ParseIP(actualStr)
	if expectedIP == nil || actualIP == nil {
		return false
	}
	return expectedIP.Equal(actualIP)
}

// matchAny is a helper to handle cases where expected might be a slice (OR logic within a key)
func (ce *ConditionEvaluator) matchAny(expected interface{}, actual interface{}, matchFn func(e, a interface{}) bool) bool {
	v := reflect.ValueOf(expected)
	if v.Kind() == reflect.Slice {
		for i := 0; i < v.Len(); i++ {
			if matchFn(v.Index(i).Interface(), actual) {
				return true
			}
		}
		return false
	}
	return matchFn(expected, actual)
}
