import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ProtectedRoute from '@/features/auth/guards/ProtectedRoute';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const ProtectedRouteLayout = () => {
    const location = useLocation();

    const currentPath = location.pathname.split('/')[1];
    const activeView = currentPath === 'home' ? 'overview' : currentPath || 'overview';
    const [collapsed, setCollapsed] = useState(false);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-bg-main-dark flex font-sans text-text-main-dark">
                <Sidebar activeView={activeView} collapsed={collapsed} />
                <main className={`flex-1 transition-all duration-300 flex flex-col ${collapsed ? 'ml-16' : 'ml-64'}`}>
                    <Navbar
                        collapsed={collapsed}
                        setCollapsed={setCollapsed}
                    />
                    <div className="p-6 pb-12">
                        <Outlet />
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
};

export default ProtectedRouteLayout;
