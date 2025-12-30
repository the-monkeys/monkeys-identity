import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/User/Login';
import Signup from './components/User/Signup';
import HomePage from './components/LandingPage/HomePage';
import Dashboard from './components/dashboard/Dashboard';
import './index.css';

import LandingLayout from './components/LandingPage/LandingLayout';
import ProtectedRouteLayout from './components/ProtectedRouteLayout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
