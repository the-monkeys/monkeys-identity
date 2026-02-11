package services

import (
	"bytes"
	"fmt"
	"net/smtp"
	"strings"
	"text/template"

	"github.com/the-monkeys/monkeys-identity/internal/config"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

type EmailService interface {
	SendVerificationEmail(toEmail, username, token string) error
	SendPasswordResetEmail(toEmail, username, token string) error
}

type emailService struct {
	config *config.Config
	logger *logger.Logger
}

func NewEmailService(cfg *config.Config, logger *logger.Logger) EmailService {
	return &emailService{
		config: cfg,
		logger: logger,
	}
}

func (s *emailService) sendMail(to []string, subject string, body string) error {
	addr := fmt.Sprintf("%s:%d", s.config.SMTPHost, s.config.SMTPPort)

	// Format message
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		s.config.SMTPFrom,
		to[0],
		subject,
		body)

	// If credentials are provided, use the standard smtp.SendMail with PLAIN auth.
	// For unauthenticated relays like Mailpit, dial manually and skip AUTH entirely.
	username := strings.TrimSpace(s.config.SMTPUsername)
	password := strings.TrimSpace(s.config.SMTPPassword)

	if username != "" && password != "" {
		auth := smtp.PlainAuth("", username, password, s.config.SMTPHost)
		if err := smtp.SendMail(addr, auth, s.config.SMTPFrom, to, []byte(msg)); err != nil {
			s.logger.Error("Failed to send email to %v: %v", to, err)
			return err
		}
		s.logger.Info("Email sent successfully to %v", to)
		return nil
	}

	// No-auth path: dial, EHLO, DATA — no AUTH command.
	conn, err := smtp.Dial(addr)
	if err != nil {
		s.logger.Error("Failed to connect to SMTP server %s: %v", addr, err)
		return err
	}
	defer conn.Close()

	if err = conn.Hello("localhost"); err != nil {
		return err
	}
	if err = conn.Mail(s.config.SMTPFrom); err != nil {
		return err
	}
	for _, recipient := range to {
		if err = conn.Rcpt(recipient); err != nil {
			return err
		}
	}
	w, err := conn.Data()
	if err != nil {
		return err
	}
	_, err = fmt.Fprint(w, msg)
	if err != nil {
		return err
	}
	if err = w.Close(); err != nil {
		return err
	}
	if err = conn.Quit(); err != nil {
		return err
	}

	s.logger.Info("Email sent successfully to %v", to)
	return nil
}

func (s *emailService) SendVerificationEmail(toEmail, username, token string) error {
	verificationLink := fmt.Sprintf("%s/verify-email?token=%s", s.config.FrontendURL, token)

	tmpl := `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.btn { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff !important; text-decoration: none; border-radius: 5px; }
			</style>
		</head>
		<body>
			<div class="container">
				<h2>Welcome to Monkeys Identity, {{.Username}}!</h2>
				<p>Thank you for registering. Please click the button below to verify your email address:</p>
				<p><a href="{{.VerificationLink}}" class="btn">Verify Email</a></p>
				<p>If the button doesn't work, you can copy and paste this link into your browser:</p>
				<p>{{.VerificationLink}}</p>
				<p>This link will expire in 24 hours.</p>
			</div>
		</body>
		</html>
	`

	t, err := template.New("verification").Parse(tmpl)
	if err != nil {
		return err
	}

	var body bytes.Buffer
	err = t.Execute(&body, struct {
		Username         string
		VerificationLink string
	}{
		Username:         username,
		VerificationLink: verificationLink,
	})
	if err != nil {
		return err
	}

	return s.sendMail([]string{toEmail}, "Verify your email address - Monkeys Identity", body.String())
}

func (s *emailService) SendPasswordResetEmail(toEmail, username, token string) error {
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.config.FrontendURL, token)

	tmpl := `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.btn { display: inline-block; padding: 10px 20px; background-color: #28a745; color: #fff !important; text-decoration: none; border-radius: 5px; }
			</style>
		</head>
		<body>
			<div class="container">
				<h2>Password Reset Request</h2>
				<p>Hello {{.Username}},</p>
				<p>We received a request to reset your password for your Monkeys Identity account. Click the button below to set a new password:</p>
				<p><a href="{{.ResetLink}}" class="btn">Reset Password</a></p>
				<p>If the button doesn't work, you can copy and paste this link into your browser:</p>
				<p>{{.ResetLink}}</p>
				<p>This link will expire in 1 hour.</p>
				<p>If you didn't request a password reset, you can safely ignore this email.</p>
			</div>
		</body>
		</html>
	`

	t, err := template.New("reset").Parse(tmpl)
	if err != nil {
		return err
	}

	var body bytes.Buffer
	err = t.Execute(&body, struct {
		Username  string
		ResetLink string
	}{
		Username:  username,
		ResetLink: resetLink,
	})
	if err != nil {
		return err
	}

	return s.sendMail([]string{toEmail}, "Password Reset - Monkeys Identity", body.String())
}
