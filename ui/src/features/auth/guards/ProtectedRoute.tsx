import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();
    const [timedOut, setTimedOut] = useState(false);

    // Failsafe: If loading takes too long (e.g. auth state stuck), show error or try to proceed
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setTimedOut(true);
            }, 5000); // 5 seconds
            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (loading && !timedOut) {
        return (
            <div className="h-screen w-screen bg-bg-main-dark flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-gray-400 font-mono text-sm animate-pulse">Establishing secure session...</p>
            </div>
        );
    }

    if (!user && !loading) {
        return <Navigate to="/login" replace />;
    }

    // Attempt to proceed if timed out but no user (might be a false positive loading)
    if (!user && timedOut) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
