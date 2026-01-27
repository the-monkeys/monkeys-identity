import { RouterProvider } from 'react-router-dom';
import { router } from './routes/browserRouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './pkg/api/queryClient';

import { AuthProvider } from './context/AuthContext';
import './index.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
