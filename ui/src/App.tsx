import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/User/Login';
import Signup from './components/User/Signup';
import HomePage from './components/LandingPage/HomePage';
import Dashboard from './components/Dashboard';
import './index.css';

import LandingLayout from './components/LandingPage/LandingLayout';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<LandingLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/*<Route
            path="/organizations/:id"
            element={
              <ProtectedRoute>
                <OrganizationDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/policies"
            element={
              <ProtectedRoute>
                <PoliciesPage />
              </ProtectedRoute>
            }
          />*/}
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
