import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Login, Signup, Consent } from './index';
import LandingLayout from '../layouts/LandingLayout';
import ProtectedRouteLayout from '../layouts/ProtectedRouteLayout';

// Lazy load components
const Dashboard = lazy(() => import('../features/dashboard/pages/Dashboard'));
const UsersManagement = lazy(() => import('../features/users/pages/UsersManagement'));
const UserDetailPage = lazy(() => import('../features/users/pages/UserDetailPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('../features/auth/pages/ResetPassword'));
const GroupsManagement = lazy(() => import('../features/groups/pages/GroupsManagement'));
const OrganizationsManagement = lazy(() => import('../features/organizations/pages/OrganizationsManagement'));
const AuditLogsPage = lazy(() => import('../features/audit/pages/AuditLogsPage'));
const AccountSettingsPage = lazy(() => import('../features/settings/pages/AccountSettingsPage'));
const RolesManagement = lazy(() => import('../features/roles/pages/RolesManagement'));
const RoleDetailPage = lazy(() => import('../features/roles/pages/RoleDetailPage'));
const PoliciesManagement = lazy(() => import('../features/policies/pages/PoliciesManagement'));
const PolicyDetailPage = lazy(() => import('../features/policies/pages/PolicyDetailPage'));
const SessionsMonitoring = lazy(() => import('../features/sessions/pages/SessionsMonitoring'));
const ResourcesManagement = lazy(() => import('../features/resources/pages/ResourcesManagement'));
const ResourceDetailPage = lazy(() => import('../features/resources/pages/ResourceDetailPage'));
const ServiceAccountsManagement = lazy(() => import('../features/service-accounts/pages/ServiceAccountsManagement'));
const ServiceAccountDetailPage = lazy(() => import('../features/service-accounts/pages/ServiceAccountDetailPage'));
const OIDCClientManagement = lazy(() => import('../features/oidc/pages/OIDCClientManagement'));
const ContentManagement = lazy(() => import('../features/content/pages/ContentManagement'));
const ContentDetailPage = lazy(() => import('../features/content/pages/ContentDetailPage'));
const HomePage = lazy(() => import('../features/landing/pages/HomePage'));
const DocumentationPage = lazy(() => import('../features/landing/pages/DocumentationPage'));


const Loading = () => (
    <div className="h-screen w-screen bg-bg-main-dark flex items-center justify-center text-primary font-mono">
        Loading...
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
                path: '/docs',
                element: <DocumentationPage />,
            },
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/consent',
                element: <Consent />,
            },
            {
                path: '/signup',
                element: <Signup />,
            },
            {
                path: '/forgot-password',
                element: <ForgotPasswordPage />,
            },
            {
                path: '/reset-password',
                element: <ResetPasswordPage />,
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
                path: '/users/:id',
                element: <UserDetailPage />,
            },
            {
                path: '/groups',
                element: <GroupsManagement />,
            },
            {
                path: '/organizations',
                element: <OrganizationsManagement />,
            },
            {
                path: '/policies',
                element: <PoliciesManagement />,
            },
            {
                path: '/roles',
                element: <RolesManagement />,
            },
            {
                path: '/roles/:id',
                element: <RoleDetailPage />,
            },
            {
                path: '/policies/:id',
                element: <PolicyDetailPage />,
            },
            {
                path: '/audit-logs',
                element: <AuditLogsPage />,
            },
            {
                path: '/account-settings',
                element: <AccountSettingsPage />,
            },
            {
                path: '/sessions',
                element: <SessionsMonitoring />,
            },

            {
                path: '/resources',
                element: <ResourcesManagement />,
            },
            {
                path: '/resources/:id',
                element: <ResourceDetailPage />,
            },
            {
                path: '/service-accounts',
                element: <ServiceAccountsManagement />,
            },
            {
                path: '/service-accounts/:id',
                element: <ServiceAccountDetailPage />,
            },
            {
                path: '/ecosystem',
                element: <OIDCClientManagement />,
            },
            {
                path: '/content',
                element: <ContentManagement />,
            },
            {
                path: '/content/:id',
                element: <ContentDetailPage />,
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
