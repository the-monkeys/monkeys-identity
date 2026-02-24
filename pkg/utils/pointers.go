package utils

// StringPtr returns a pointer to the string value
func StringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// StringValue returns the value of the string pointer, or empty string if nil
func StringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
