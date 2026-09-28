// Dashboard layout — extracted from App.tsx
// Follows docs/architecture.md

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { sse } from '../services/sse';
import { api, Incident } from '../services/api';
import { useAuthStore } from '../lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    }
  }
});

function DashboardContent() {
  const [view, setView] = useState<'active' | 'escalated' | 'resolved'>('active');
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data: incidents, isLoading, error } = useQuery({
    queryKey: ['incidents', view],
    queryFn: () => api.getIncidents(view)
  });

  // SSE → cache merge
  useEffect(() => {
    sse.connect();

    const handleIncidentUpdate = (incident: Incident) => {
      const views = ['active', 'escalated', 'resolved'] as const;
      views.forEach(v => {
        qc.setQueryData(['incidents', v], (old: Incident[] | undefined) => {
          if (!old) return old;
          const isActive = incident.status !== 'RESOLVED';
          const isResolved = incident.status === 'RESOLVED';
          const isEscalated = isActive && incident.tier > 0;
          let belongs = false;
          if (v === 'active' && isActive) belongs = true;
          if (v === 'resolved' && isResolved) belongs = true;
          if (v === 'escalated' && isEscalated) belongs = true;
          const exists = old.some(i => i.id === incident.id);
          if (belongs) {
            if (exists) return old.map(i => i.id === incident.id ? incident : i);
            return [incident, ...old];
          } else {
            if (exists) return old.filter(i => i.id !== incident.id);
            return old;
          }
        });
      });
    };

    sse.on('incident.created', handleIncidentUpdate);
    sse.on('incident.updated', handleIncidentUpdate);
    sse.on('incident.escalated', handleIncidentUpdate);
    sse.on('incident.buster_call', handleIncidentUpdate);
    sse.on('incident.resolved', handleIncidentUpdate);

    return () => {
      sse.off('incident.created', handleIncidentUpdate);
      sse.off('incident.updated', handleIncidentUpdate);
      sse.off('incident.escalated', handleIncidentUpdate);
      sse.off('incident.buster_call', handleIncidentUpdate);
      sse.off('incident.resolved', handleIncidentUpdate);
    };
  }, [qc]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-seastone text-gray-200 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-6 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-4xl font-pirata tracking-wider text-red-500 drop-shadow-md">
            Impel Down Command
          </h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-semibold">
            Chief Warden Magellan
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
          <span className="text-sm text-gray-400 uppercase tracking-widest font-bold">System Online</span>
          {user && (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-700">
              <span className="text-sm text-gray-300">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-alert uppercase tracking-wider font-semibold transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-700 pb-4 mb-6">
          {(['active', 'escalated', 'resolved'] as const).map((v) => (
            <button
              key={v}
              className={`px-4 py-2 uppercase tracking-wide font-semibold rounded transition-colors ${
                view === v
                  ? 'bg-marine text-white border border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading && <div className="text-gray-400 animate-pulse">Loading incidents...</div>}
          {error && <div className="text-alert font-bold">Error loading data.</div>}

          {incidents && incidents.length === 0 && (
            <div className="text-gray-500 italic">No incidents in this view.</div>
          )}

          {incidents && incidents.length > 0 && (
            <div className="grid gap-4">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`p-4 rounded border flex items-center justify-between shadow-lg
                    ${inc.urgency === 'red' ? 'border-alert bg-alert/10' :
                      inc.urgency === 'yellow' ? 'border-buster bg-buster/10' : 'border-gray-700 bg-gray-800'}
                    ${inc.tier === 3 ? 'ring-2 ring-buster animate-pulse' : ''}
                  `}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-pirata text-2xl tracking-wide text-magma">Level {inc.level}</span>
                      <h3 className="font-bold text-lg">{inc.title}</h3>
                      {inc.tier === 3 && <span className="bg-buster text-black text-xs px-2 py-1 rounded font-bold">BUSTER CALL</span>}
                    </div>
                    <div className="text-sm text-gray-400">
                      {inc.category} • Tier {inc.tier} • {inc.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-xl ${inc.isOverdue ? 'text-alert font-bold' : 'text-gray-300'}`}>
                      {inc.status === 'RESOLVED' ? 'Resolved' :
                        inc.remainingSeconds < 0
                          ? `Overdue (${Math.abs(inc.remainingSeconds)}s)`
                          : `${inc.remainingSeconds}s remaining`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
