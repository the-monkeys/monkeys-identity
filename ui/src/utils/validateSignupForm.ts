import { SignupFormData, SignupFormErrors } from "../Types/interfaces";

export const validateSignupForm = (formData: SignupFormData, confirmPassword: string): SignupFormErrors => {
    const errors: SignupFormErrors = {};
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format';
    }

    if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$&<>!])/.test(formData.password)) {
        errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$&<>!)';
    }

    if (confirmPassword !== formData.password) {
        errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
};