import { lazy } from 'react';

// Lazy load features
export const Login = lazy(() => import('@/features/auth/pages/Login'));
export const Consent = lazy(() => import('@/features/auth/pages/Consent'));
export const Signup = lazy(() => import('@/features/auth/pages/Signup'));
export const Dashboard = lazy(() => import('@/features/dashboard/pages/Dashboard'));
export const UsersManagement = lazy(() => import('@/features/users/pages/UsersManagement'));
export const HomePage = lazy(() => import('@/features/landing/pages/HomePage'));
