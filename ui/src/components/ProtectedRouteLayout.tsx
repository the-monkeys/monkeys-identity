import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar/Sidebar";

const ProtectedRouteLayout = () => {
    const location = useLocation();

    const currentPath = location.pathname.split('/')[1];
    const activeView = currentPath === 'home' ? 'dashboard' : currentPath || 'dashboard';
    const [collapsed, setCollapsed] = useState(false);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-bg-main-dark flex font-sans text-text-main-dark">
                <Sidebar activeView={activeView} collapsed={collapsed} setCollapsed={setCollapsed} />
                <main className={`flex-1 transition-all duration-300 pt-8 pb-12 px-6 ${collapsed ? 'ml-16' : 'ml-64'}`}>
                    <Outlet />
                </main>
            </div>
        </ProtectedRoute>
    );
};

export default ProtectedRouteLayout;
