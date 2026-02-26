import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/browserRouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, setGlobalToast } from './pkg/api/queryClient';

import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './components/ui/Toast';
import './index.css';

// Bridge to expose toast to the global query client mutation cache
function ToastBridge() {
  const { toast } = useToast();
  useEffect(() => {
    setGlobalToast(toast);
    return () => setGlobalToast(null);
  }, [toast]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastBridge />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
