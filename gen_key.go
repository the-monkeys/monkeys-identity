//go:build ignore
// +build ignore

package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
)

func main() {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error generating key: %v\n", err)
		os.Exit(1)
	}

	privBytes := x509.MarshalPKCS1PrivateKey(key)
	privPem := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privBytes,
	})

	// Write to file
	err = os.WriteFile("jwt_private_key.pem", privPem, 0600)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error writing key file: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Generated jwt_private_key.pem successfully")

	// Also print the single-line version for .env usage
	fmt.Println("\nTo use in .env, copy the contents of jwt_private_key.pem")
}
