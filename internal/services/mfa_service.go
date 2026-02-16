package services

import (
	"bytes"
	"crypto/rand"
	"encoding/base32"
	"encoding/base64"
	"fmt"
	"image/png"
	"time"

	"github.com/pquerna/otp/totp"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

// MFAService defines the interface for multi-factor authentication operations
type MFAService interface {
	GenerateTOTPSecret(userID, email string) (string, string, string, error) // secret, qrCodeURL, qrCodeBase64, error
	VerifyTOTP(passcode, secret string) bool
	GenerateBackupCodes(count int) []string
}

type mfaService struct {
	logger *logger.Logger
}

// NewMFAService creates a new instance of MFAService
func NewMFAService(logger *logger.Logger) MFAService {
	return &mfaService{
		logger: logger,
	}
}

// GenerateTOTPSecret generates a new TOTP secret and returns the secret, the provision URL, and a base64 encoded QR code image
func (s *mfaService) GenerateTOTPSecret(userID, email string) (string, string, string, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Monkeys Identity",
		AccountName: email,
	})
	if err != nil {
		return "", "", "", err
	}

	// Convert QR code image to base64
	var buf bytes.Buffer
	img, err := key.Image(200, 200)
	if err != nil {
		return "", "", "", err
	}
	if err := png.Encode(&buf, img); err != nil {
		return "", "", "", err
	}
	qrCodeBase64 := base64.StdEncoding.EncodeToString(buf.Bytes())

	return key.Secret(), key.URL(), qrCodeBase64, nil
}

// VerifyTOTP verifies a TOTP passcode against a secret
func (s *mfaService) VerifyTOTP(passcode, secret string) bool {
	return totp.Validate(passcode, secret)
}

// GenerateBackupCodes generates a set of random backup codes
func (s *mfaService) GenerateBackupCodes(count int) []string {
	codes := make([]string, count)
	for i := 0; i < count; i++ {
		codes[i] = s.generateRandomCode(12)
	}
	return codes
}

func (s *mfaService) generateRandomCode(length int) string {
	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano()) // Fallback
	}
	// Use base32 for backup codes to keep them readable (no O/0, I/1 confusion usually, but base32 is better)
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)[:length]
}
