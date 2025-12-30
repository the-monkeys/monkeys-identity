import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar/Sidebar";
import AuthenticatedNavbar from "@/components/AuthenticatedNavbar";

const ProtectedRouteLayout = () => {
    const location = useLocation();

    const currentPath = location.pathname.split('/')[1];
    const activeView = currentPath === 'home' ? 'dashboard' : currentPath || 'dashboard';
    const [collapsed, setCollapsed] = useState(false);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-bg-main-dark flex font-sans text-text-main-dark">
                <Sidebar activeView={activeView} collapsed={collapsed} />
                <main className={`flex-1 transition-all duration-300 flex flex-col ${collapsed ? 'ml-16' : 'ml-64'}`}>
                    <AuthenticatedNavbar
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
