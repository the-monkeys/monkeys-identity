import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login, Signup, HomePage, Dashboard, UsersManagement } from './routes';
import './index.css';

import LandingLayout from './layouts/LandingLayout';
import ProtectedRouteLayout from './layouts/ProtectedRouteLayout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="h-screen w-screen bg-bg-main-dark flex items-center justify-center text-primary font-mono">Loading monkeys...</div>}>
          <Routes>
            {/* Public Routes - Accessible only when NOT logged in */}
            <Route element={<LandingLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            {/* Protected Routes - Accessible only when logged in */}
            <Route element={<ProtectedRouteLayout />}>
              <Route path="/home" element={<Dashboard />} />
              <Route path="/users" element={<UsersManagement />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
