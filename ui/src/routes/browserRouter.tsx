import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Login, Signup } from './index';
import LandingLayout from '../layouts/LandingLayout';
import ProtectedRouteLayout from '../layouts/ProtectedRouteLayout';

// Lazy load components
const Dashboard = lazy(() => import('../features/dashboard/pages/Dashboard'));
const UsersManagement = lazy(() => import('../features/users/pages/UsersManagement'));
const OrganizationsManagement = lazy(() => import('../features/organizations/pages/OrganizationsManagement'));
const HomePage = lazy(() => import('../features/landing/pages/HomePage'));

const Loading = () => (
    <div className="h-screen w-screen bg-bg-main-dark flex items-center justify-center text-primary font-mono">
        Loading monkeys...
    </div>
);

export const router = createBrowserRouter([
    {
        element: (
            <Suspense fallback={<Loading />}>
                <LandingLayout />
            </Suspense>
        ),
        children: [
            {
                path: '/',
                element: <HomePage />,
            },
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/signup',
                element: <Signup />,
            },
        ],
    },
    {
        element: (
            <Suspense fallback={<Loading />}>
                <ProtectedRouteLayout />
            </Suspense>
        ),
        children: [
            {
                path: '/home',
                element: <Dashboard />,
            },
            {
                path: '/users',
                element: <UsersManagement />,
            },
            {
                path: '/organizations',
                element: <OrganizationsManagement />,
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
