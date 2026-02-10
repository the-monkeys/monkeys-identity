package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

// AuditService handles security event logging and compliance reporting
type AuditService interface {
	LogEvent(ctx context.Context, event models.AuditEvent)
	LogAccessDenied(ctx context.Context, orgID, principalID, principalType, resourceType, resourceID, message string)
	LogAccessCheck(ctx context.Context, orgID, principalID, principalType, resourceType, resourceID, action string, allowed bool, reason string)
	LogLogin(ctx context.Context, orgID, userID, ip, userAgent string, success bool, err string)
	Start(ctx context.Context)
	Stop()
}

type auditService struct {
	queries queries.AuditQueries
	logger  *logger.Logger
	events  chan models.AuditEvent
	done    chan struct{}
}

// NewAuditService creates a new instance of AuditService
func NewAuditService(q queries.AuditQueries, l *logger.Logger) AuditService {
	return &auditService{
		queries: q,
		logger:  l,
		events:  make(chan models.AuditEvent, 1000), // Buffered channel for async logging
		done:    make(chan struct{}),
	}
}

// Start starts the background worker for processing audit events
func (s *auditService) Start(ctx context.Context) {
	go func() {
		s.logger.Info("Audit worker started")
		for {
			select {
			case event := <-s.events:
				if err := s.queries.LogAuditEvent(event); err != nil {
					s.logger.Error("Failed to log audit event [%s]: %v", event.Action, err)
				}
			case <-ctx.Done():
				s.logger.Info("Audit worker stopping...")
				s.drainEvents()
				close(s.done)
				return
			}
		}
	}()
}

// Stop stops the audit worker
func (s *auditService) Stop() {
	// Draining handled in Start via context cancellation
	<-s.done
}

func (s *auditService) drainEvents() {
	// Process remaining events in channel
	for {
		select {
		case event := <-s.events:
			if err := s.queries.LogAuditEvent(event); err != nil {
				s.logger.Error("Failed to log final audit event [%s]: %v", event.Action, err)
			}
		default:
			return
		}
	}
}

// LogEvent sends an event to be processed asynchronously
func (s *auditService) LogEvent(ctx context.Context, event models.AuditEvent) {
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.EventID == "" {
		event.EventID = fmt.Sprintf("EVT-%d", time.Now().UnixNano())
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	if event.OrganizationID == "" {
		// Default to system organization if not specified
		event.OrganizationID = "00000000-0000-0000-0000-000000000000"
	}

	select {
	case s.events <- event:
		// Event queued successfully
	default:
		s.logger.Warn("Audit event channel full, dropping event: %s", event.Action)
	}
}

// LogAccessDenied is a helper for logging unauthorized access attempts
func (s *auditService) LogAccessDenied(ctx context.Context, orgID, principalID, principalType, resourceType, resourceID, message string) {
	s.LogEvent(ctx, models.AuditEvent{
		OrganizationID: orgID,
		PrincipalID:    principalID,
		PrincipalType:  principalType,
		Action:         "access_denied",
		ResourceType:   resourceType,
		ResourceID:     resourceID,
		Result:         "failure",
		ErrorMessage:   message,
		Severity:       "critical",
	})
}

func (s *auditService) LogAccessCheck(ctx context.Context, orgID, principalID, principalType, resourceType, resourceID, action string, allowed bool, reason string) {
	result := "allowed"
	severity := "info"
	if !allowed {
		result = "denied"
		severity = "error"
	}

	s.LogEvent(ctx, models.AuditEvent{
		OrganizationID: orgID,
		PrincipalID:    principalID,
		PrincipalType:  principalType,
		Action:         action,
		ResourceType:   resourceType,
		ResourceID:     resourceID,
		Result:         result,
		ErrorMessage:   reason,
		Severity:       severity,
	})
}

// LogLogin is a helper for logging authentication attempts
func (s *auditService) LogLogin(ctx context.Context, orgID, userID, ip, userAgent string, success bool, err string) {
	result := "success"
	severity := "info"
	if !success {
		result = "failure"
		severity = "warn"
	}

	s.LogEvent(ctx, models.AuditEvent{
		OrganizationID: orgID,
		PrincipalID:    userID,
		PrincipalType:  "user",
		Action:         "login",
		Result:         result,
		ErrorMessage:   err,
		IPAddress:      ip,
		UserAgent:      userAgent,
		Severity:       severity,
	})
}
