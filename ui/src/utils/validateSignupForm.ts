import { SignupFormData, SignupFormErrors } from "@/features/auth/types/auth";

export const validateSignupForm = (formData: SignupFormData, confirmPassword: string): SignupFormErrors => {
    const errors: SignupFormErrors = {};
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format';
    }

    if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$&<>!])/.test(formData.password)) {
        errors.password = `${formData.password} doesn't meet requirements [must contain uppercase, lowercase, number and (@\$&<>!)`;
    }

    if (confirmPassword !== formData.password) {
        errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
};