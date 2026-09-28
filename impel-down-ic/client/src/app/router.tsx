// App router
// Follows docs/architecture.md

import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../features/auth/LoginPage';
import Dashboard from './Dashboard';
import ReporterDashboard from '../features/reporter/ReporterDashboard';
import ResponseTeamDashboard from '../features/response/ResponseTeamDashboard';
import { useAuthStore } from '../lib/auth';
import ApplyResponseTeamPage from '../features/auth/ApplyResponseTeamPage';

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/login/reporter" replace />} />
      <Route path="/login/:rolePath" element={<LoginPage />} />
      <Route path="/apply/response-team" element={<ApplyResponseTeamPage />} />
      <Route
        path="/reporter/*"
        element={
          <ProtectedRoute allowedRole="guard">
            <QueryClientProvider client={queryClient}>
              <ReporterDashboard />
            </QueryClientProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/response-team/*"
        element={
          <ProtectedRoute allowedRole="responder">
            <QueryClientProvider client={queryClient}>
              <ResponseTeamDashboard />
            </QueryClientProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    }
  }
});

function RoleBasedRedirect() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'guard') {
    return <Navigate to="/reporter" replace />;
  }
  if (role === 'responder') {
    return <Navigate to="/response-team" replace />;
  }
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/login" replace />;
}

