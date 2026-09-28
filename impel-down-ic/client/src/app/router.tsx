// App router
// Follows docs/architecture.md

import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../features/auth/LoginPage';
import ApplyResponseTeam from '../features/auth/ApplyResponseTeam';
import Dashboard from './Dashboard';
import ReporterDashboard from '../features/reporter/ReporterDashboard';
import ResponseTeamDashboard from '../features/response/ResponseTeamDashboard';
import { useAuthStore } from '../lib/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/login/reporter" replace />} />
      <Route path="/login/:rolePath" element={<LoginPage />} />
      <Route path="/apply/response-team" element={<ApplyResponseTeam />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <RoleBasedDashboard />
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

function RoleBasedDashboard() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'guard') {
    return (
      <QueryClientProvider client={queryClient}>
        <ReporterDashboard />
      </QueryClientProvider>
    );
  }
  if (role === 'responder') {
    return (
      <QueryClientProvider client={queryClient}>
        <ResponseTeamDashboard />
      </QueryClientProvider>
    );
  }
  return <Dashboard />;
}

