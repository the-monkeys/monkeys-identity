package authz

import (
	"testing"
)

func TestEvaluator_Evaluate(t *testing.T) {
	e := NewEvaluator()

	tests := []struct {
		name     string
		doc      string
		action   string
		resource string
		context  map[string]interface{}
		expected Decision
	}{
		{
			name: "Simple allow",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": "iam:GetUser",
					"Resource": "arn:monkeys:iam::user/123"
				}]
			}`,
			action:   "iam:GetUser",
			resource: "arn:monkeys:iam::user/123",
			expected: DecisionAllow,
		},
		{
			name: "Wildcard action",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": "iam:*",
					"Resource": "*"
				}]
			}`,
			action:   "iam:CreateUser",
			resource: "arn:monkeys:iam::user/456",
			expected: DecisionAllow,
		},
		{
			name: "Wildcard resource",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": "iam:GetUser",
					"Resource": "arn:monkeys:iam::user/*"
				}]
			}`,
			action:   "iam:GetUser",
			resource: "arn:monkeys:iam::user/789",
			expected: DecisionAllow,
		},
		{
			name: "Explicit deny overrides allow",
			doc: `{
				"Version": "1.0",
				"Statement": [
					{
						"Effect": "Deny",
						"Action": "iam:DeleteUser",
						"Resource": "*"
					},
					{
						"Effect": "Allow",
						"Action": "*",
						"Resource": "*"
					}
				]
			}`,
			action:   "iam:DeleteUser",
			resource: "arn:monkeys:iam::user/123",
			expected: DecisionDeny,
		},
		{
			name: "Not applicable",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": "iam:GetUser",
					"Resource": "arn:monkeys:iam::user/123"
				}]
			}`,
			action:   "iam:DeleteUser",
			resource: "arn:monkeys:iam::user/123",
			expected: DecisionNotApplicable,
		},
		{
			name: "Multiple actions in array",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": ["iam:GetUser", "iam:ListUsers"],
					"Resource": "*"
				}]
			}`,
			action:   "iam:ListUsers",
			resource: "arn:monkeys:iam::user/123",
			expected: DecisionAllow,
		},
		{
			name: "Condition StringEquals success",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": "iam:GetUser",
					"Resource": "*",
					"Condition": {
						"StringEquals": {
							"iam:username": "johndoe"
						}
					}
				}]
			}`,
			action:   "iam:GetUser",
			resource: "arn:monkeys:iam::user/123",
			context: map[string]interface{}{
				"iam:username": "johndoe",
			},
			expected: DecisionAllow,
		},
		{
			name: "Condition StringEquals failure",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": "iam:GetUser",
					"Resource": "*",
					"Condition": {
						"StringEquals": {
							"iam:username": "johndoe"
						}
					}
				}]
			}`,
			action:   "iam:GetUser",
			resource: "arn:monkeys:iam::user/123",
			context: map[string]interface{}{
				"iam:username": "janedoe",
			},
			expected: DecisionNotApplicable,
		},
		{
			name: "Condition IpAddress success",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": "*",
					"Resource": "*",
					"Condition": {
						"IpAddress": {
							"iam:SourceIP": "192.168.1.0/24"
						}
					}
				}]
			}`,
			action:   "iam:GetUser",
			resource: "*",
			context: map[string]interface{}{
				"iam:SourceIP": "192.168.1.50",
			},
			expected: DecisionAllow,
		},
		{
			name: "Condition IpAddress failure",
			doc: `{
				"Version": "1.0",
				"Statement": [{
					"Effect": "Allow",
					"Action": "*",
					"Resource": "*",
					"Condition": {
						"IpAddress": {
							"iam:SourceIP": "192.168.1.0/24"
						}
					}
				}]
			}`,
			action:   "iam:GetUser",
			resource: "*",
			context: map[string]interface{}{
				"iam:SourceIP": "10.0.0.1",
			},
			expected: DecisionNotApplicable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := e.Evaluate(tt.doc, tt.action, tt.resource, tt.context)
			if err != nil {
				t.Fatalf("Evaluate() error = %v", err)
			}
			if got != tt.expected {
				t.Errorf("Evaluate() got = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestEvaluator_MatchWildcard(t *testing.T) {
	e := NewEvaluator()

	tests := []struct {
		pattern string
		value   string
		want    bool
	}{
		{"*", "anything", true},
		{"iam:*", "iam:GetUser", true},
		{"iam:*", "auth:Login", false},
		{"arn:monkeys:iam::user/*", "arn:monkeys:iam::user/123", true},
		{"arn:monkeys:iam::user/???", "arn:monkeys:iam::user/123", true},
		{"arn:monkeys:iam::user/??", "arn:monkeys:iam::user/123", false},
		{"*.txt", "file.txt", true},
		{"*.txt", "file.png", false},
	}

	for _, tt := range tests {
		if got := e.MatchWildcard(tt.pattern, tt.value); got != tt.want {
			t.Errorf("MatchWildcard(%q, %q) = %v, want %v", tt.pattern, tt.value, got, tt.want)
		}
	}
}
