import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Incident, Team } from '../../services/api';
import { sse } from '../../services/sse';

/* ── Helpers ─────────────────────────────────────────────────── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatCountdown(seconds: number) {
  if (seconds <= 0) return 'OVERDUE';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const STATUS_DEFAULT = { label: 'Unknown', color: 'text-gray-300', bg: 'bg-gray-500/15', border: 'border-gray-500/40' };
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  REPORTED:    { label: 'Reported',    color: 'text-sky-300',    bg: 'bg-sky-500/15',    border: 'border-sky-500/40' },
  ASSIGNED:    { label: 'Assigned',    color: 'text-amber-300',  bg: 'bg-amber-500/15',  border: 'border-amber-500/40' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/40' },
  RESOLVED:    { label: 'Resolved',    color: 'text-emerald-300',bg: 'bg-emerald-500/15',border: 'border-emerald-500/40' },
};
const getStatus = (s: string) => STATUS_CONFIG[s] ?? STATUS_DEFAULT;

const URGENCY_DEFAULT = { ring: '', glow: '' };
const URGENCY_CONFIG: Record<string, { ring: string; glow: string }> = {
  red:    { ring: 'ring-2 ring-rose-500/60', glow: 'shadow-[0_0_15px_rgba(225,29,72,0.3)]' },
  yellow: { ring: 'ring-2 ring-amber-500/50', glow: 'shadow-[0_0_12px_rgba(245,197,66,0.2)]' },
  green:  { ring: '', glow: '' },
};
const getUrgency = (u: string) => URGENCY_CONFIG[u] ?? URGENCY_DEFAULT;

/* ── Marine Compass SVG ──────────────────────────────────────── */
function MarineCompass({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polygon points="12,4 14,11 12,10 10,11" fill="currentColor" opacity="0.8" />
      <polygon points="12,20 14,13 12,14 10,13" fill="currentColor" opacity="0.4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* ── Incident Detail Modal ───────────────────────────────────── */
function IncidentDetailModal({
  incident, teams, onClose, onAssign, onStatusChange, onResolve, isActioning,
}: {
  incident: Incident;
  teams: Team[];
  onClose: () => void;
  onAssign: (teamId: number) => void;
  onStatusChange: (status: string) => void;
  onResolve: () => void;
  isActioning: boolean;
}) {
  const sc = getStatus(incident.status);
  const assignedTeam = teams.find(t => t.id === incident.team_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a2332] border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a2332]/95 backdrop-blur-md border-b border-gray-700/50 p-6 flex justify-between items-start z-10">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${sc.bg} ${sc.color} ${sc.border}`}>
                {sc.label}
              </span>
              {incident.tier > 0 && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  incident.tier === 3 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse' : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                }`}>
                  {incident.tier === 3 ? '⚡ BUSTER CALL' : `Tier ${incident.tier}`}
                </span>
              )}
            </div>
            <h2 className="font-pirata text-2xl text-white tracking-wide">{incident.title}</h2>
            <p className="text-gray-400 text-sm mt-1">#{incident.id} • Reported by {incident.reporter}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Category</p>
              <p className="text-sm text-gray-200 font-medium">{incident.category}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</p>
              <p className="text-sm text-gray-200 font-medium">{incident.location}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Severity Level</p>
              <p className="text-sm text-gray-200 font-medium font-pirata text-lg">Level {incident.level}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assigned Team</p>
              <p className="text-sm text-gray-200 font-medium">{assignedTeam ? `${assignedTeam.emoji} ${assignedTeam.name}` : 'Unassigned'}</p>
            </div>
          </div>

          {/* SLA / Timer */}
          {incident.status !== 'RESOLVED' && (
            <div className={`rounded-xl p-4 border ${incident.isOverdue ? 'bg-rose-500/10 border-rose-500/40' : 'bg-sky-500/10 border-sky-500/30'}`}>
              <div className="flex items-center justify-between">
                <p className={`text-xs uppercase tracking-wider font-semibold ${incident.isOverdue ? 'text-rose-400' : 'text-sky-400'}`}>
                  SLA Countdown
                </p>
                <span className={`font-mono text-xl font-bold ${incident.isOverdue ? 'text-rose-400 animate-pulse' : 'text-sky-300'}`}>
                  {incident.isOverdue ? `OVERDUE by ${Math.abs(incident.remainingSeconds)}s` : formatCountdown(incident.remainingSeconds)}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          {incident.description && (
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/20">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{incident.description}</p>
            </div>
          )}

          {/* Timeline */}
          {incident.events && incident.events.length > 0 && (
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/20">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Activity Timeline</p>
              <div className="space-y-3">
                {incident.events.map((ev, i) => (
                  <div key={ev.id || i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300">{ev.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(ev.at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {incident.attachments && incident.attachments.length > 0 && (
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/20">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Attachments</p>
              <div className="grid grid-cols-3 gap-3">
                {incident.attachments.map((att) => (
                  <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg overflow-hidden border border-gray-700/30 hover:border-sky-500/50 transition-colors">
                    <img src={att.url} alt={att.filename} className="w-full h-24 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {incident.status !== 'RESOLVED' && (
            <div className="border-t border-gray-700/30 pt-5 space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Quick Actions</p>
              <div className="flex flex-wrap gap-3">
                {/* Assign */}
                {!incident.team_id && (
                  <div className="flex items-center gap-2">
                    <select
                      id="assign-team-select"
                      className="bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      defaultValue=""
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (v) onAssign(v);
                      }}
                      disabled={isActioning}
                    >
                      <option value="" disabled>Assign Team...</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Status transitions */}
                {incident.status === 'ASSIGNED' && (
                  <button
                    onClick={() => onStatusChange('IN_PROGRESS')}
                    disabled={isActioning}
                    className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    ▶ Start Working
                  </button>
                )}

                {(incident.status === 'ASSIGNED' || incident.status === 'IN_PROGRESS') && (
                  <button
                    onClick={onResolve}
                    disabled={isActioning}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    ✓ Resolve
                  </button>
                )}

                {incident.status === 'REPORTED' && incident.team_id && (
                  <button
                    onClick={() => onStatusChange('IN_PROGRESS')}
                    disabled={isActioning}
                    className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    ▶ Start Working
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSE TEAM DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
export default function ResponseTeamDashboard() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [view, setView] = useState<'active' | 'escalated' | 'resolved'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  /* ── SSE real-time ───────────────────────────────────────── */
  useEffect(() => {
    sse.connect();
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['rt-incidents'] });
      qc.invalidateQueries({ queryKey: ['rt-stats'] });
    };
    sse.on('incident.created', refresh);
    sse.on('incident.updated', refresh);
    sse.on('incident.resolved', refresh);
    sse.on('incident.escalated', refresh);
    sse.on('incident.buster_call', refresh);
    return () => {
      sse.off('incident.created', refresh);
      sse.off('incident.updated', refresh);
      sse.off('incident.resolved', refresh);
      sse.off('incident.escalated', refresh);
      sse.off('incident.buster_call', refresh);
    };
  }, [qc]);

  /* ── Data fetching ───────────────────────────────────────── */
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['rt-incidents', view, searchQuery],
    queryFn: () => api.getIncidents(view, searchQuery ? { q: searchQuery } : undefined),
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery({
    queryKey: ['rt-stats'],
    queryFn: api.getStats,
    refetchInterval: 15000,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });

  /* ── Mutations ───────────────────────────────────────────── */
  const assignMutation = useMutation({
    mutationFn: ({ id, teamId }: { id: number; teamId: number }) => api.assignIncident(id, teamId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rt-incidents'] });
      qc.invalidateQueries({ queryKey: ['rt-stats'] });
      setSelectedIncident(data);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.updateIncidentStatus(id, status),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rt-incidents'] });
      qc.invalidateQueries({ queryKey: ['rt-stats'] });
      if (data.status === 'RESOLVED') setSelectedIncident(null);
      else setSelectedIncident(data);
    },
    onError: (err: any) => alert(err.message),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => api.resolveIncident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rt-incidents'] });
      qc.invalidateQueries({ queryKey: ['rt-stats'] });
      setSelectedIncident(null);
    },
    onError: (err: any) => alert(err.message),
  });

  /* ── Open detail (fetch full) ────────────────────────────── */
  const openDetail = async (inc: Incident) => {
    try {
      const full = await api.getIncident(inc.id);
      setSelectedIncident(full);
    } catch {
      setSelectedIncident(inc);
    }
  };

  /* ── Computed stats ──────────────────────────────────────── */
  const totalActive = (stats?.counts?.REPORTED || 0) + (stats?.counts?.ASSIGNED || 0) + (stats?.counts?.IN_PROGRESS || 0);
  const totalResolved = stats?.counts?.RESOLVED || 0;
  const totalEscalated = stats?.escalatedCount || 0;
  const totalOverdue = stats?.overdueCount || 0;

  const isActioning = assignMutation.isPending || statusMutation.isPending || resolveMutation.isPending;

  const viewTabs = [
    { key: 'active' as const, label: 'Active', count: totalActive, icon: '⚔️' },
    { key: 'escalated' as const, label: 'Escalated', count: totalEscalated, icon: '🔥' },
    { key: 'resolved' as const, label: 'Resolved', count: totalResolved, icon: '✅' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1923] text-gray-200 font-sans flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-[#152238]/90 backdrop-blur-md border-b border-sky-900/30 px-6 py-4 flex justify-between items-center shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <img src="/images/logo.png" alt="Logo" className="h-11 w-11 object-contain" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#152238] shadow-[0_0_6px_#22c55e]" />
          </div>
          <div>
            <h1 className="font-pirata text-2xl text-sky-100 tracking-wider leading-none">IMPEL DOWN</h1>
            <span className="text-[10px] font-bold text-sky-400/80 uppercase tracking-[0.3em]">Response Command</span>
          </div>
        </div>
        <div className="relative flex items-center gap-5">
          {/* Search */}
          <div className="relative hidden md:block">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-gray-800/60 border border-gray-700/40 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50 w-64 transition-colors"
            />
          </div>
          {/* User */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-700/40">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-sm font-bold text-white shadow-md">
              {user?.name?.charAt(0) || 'R'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm text-gray-200 font-medium leading-none">{user?.name || 'Responder'}</p>
              <p className="text-[10px] text-sky-400/70 uppercase tracking-wider mt-0.5">Response Team</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 text-gray-500 hover:text-rose-400 transition-colors p-1"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col p-6 max-w-[1400px] mx-auto w-full gap-6">
        {/* ── Stat Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Incidents', value: totalActive, color: 'from-sky-600/20 to-sky-700/10', border: 'border-sky-500/30', text: 'text-sky-300', icon: '⚡' },
            { label: 'In Progress', value: stats?.counts?.IN_PROGRESS || 0, color: 'from-orange-600/20 to-orange-700/10', border: 'border-orange-500/30', text: 'text-orange-300', icon: '🔧' },
            { label: 'Escalated', value: totalEscalated, color: 'from-rose-600/20 to-rose-700/10', border: 'border-rose-500/30', text: 'text-rose-300', icon: '🔥' },
            { label: 'Overdue', value: totalOverdue, color: 'from-red-600/20 to-red-700/10', border: 'border-red-500/30', text: 'text-red-300', icon: '⏰' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-xl p-4 relative overflow-hidden`}>
              <div className="absolute top-2 right-3 text-2xl opacity-40">{stat.icon}</div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
              <p className={`font-pirata text-4xl ${stat.text}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-[#152238]/60 rounded-xl p-1.5 border border-gray-700/30 w-fit">
          {viewTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                view === tab.key
                  ? 'bg-sky-600/20 text-sky-200 border border-sky-500/40 shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border border-transparent'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                view === tab.key ? 'bg-sky-500/30 text-sky-200' : 'bg-gray-700/50 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Incident List ──────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 animate-pulse">
                <MarineCompass className="w-10 h-10 text-sky-500 animate-spin" />
                <p className="text-gray-500 text-sm font-medium">Loading incidents...</p>
              </div>
            </div>
          )}

          {!isLoading && incidents?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <svg className="w-16 h-16 opacity-30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <p className="font-pirata text-2xl text-gray-400 mb-1">All Clear, Commander</p>
              <p className="text-sm">No incidents found in this view.</p>
            </div>
          )}

          {incidents && incidents.length > 0 && (
            <div className="grid gap-3">
              {incidents.map(inc => {
                const sc = getStatus(inc.status);
                const uc = getUrgency(inc.urgency);
                const team = teams?.find(t => t.id === inc.team_id);

                return (
                  <div
                    key={inc.id}
                    onClick={() => openDetail(inc)}
                    className={`bg-[#1a2332]/80 border border-gray-700/30 rounded-xl p-5 cursor-pointer
                      hover:bg-[#1e2a3d]/90 hover:border-gray-600/40 transition-all group
                      ${uc.ring} ${uc.glow}
                      ${inc.tier === 3 ? 'animate-pulse border-amber-500/50' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-pirata text-lg text-amber-400/80">Lv.{inc.level}</span>
                          <h3 className="font-bold text-base text-gray-100 truncate group-hover:text-white transition-colors">
                            {inc.title}
                          </h3>
                          {inc.tier === 3 && (
                            <span className="flex-shrink-0 bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-500/40 animate-pulse">
                              BUSTER CALL
                            </span>
                          )}
                          {inc.tier > 0 && inc.tier < 3 && (
                            <span className="flex-shrink-0 bg-rose-500/15 text-rose-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-rose-500/30">
                              ESC T{inc.tier}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            {inc.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                            </svg>
                            {inc.category}
                          </span>
                          {team && (
                            <span className="flex items-center gap-1">
                              {team.emoji} {team.name}
                            </span>
                          )}
                          <span>{timeAgo(inc.created_at)}</span>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${sc.bg} ${sc.color} ${sc.border}`}>
                          {sc.label}
                        </span>
                        {inc.status !== 'RESOLVED' && (
                          <span className={`font-mono text-sm font-bold ${inc.isOverdue ? 'text-rose-400' : 'text-sky-400'}`}>
                            {inc.isOverdue ? 'OVERDUE' : formatCountdown(inc.remainingSeconds)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inline quick actions (non-modal) */}
                    {inc.status !== 'RESOLVED' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/20">
                        {!inc.team_id && (
                          <select
                            className="bg-gray-800/60 border border-gray-700/40 text-gray-300 rounded-lg px-2 py-1.5 text-xs focus:border-sky-500/50 focus:outline-none"
                            defaultValue=""
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              e.stopPropagation();
                              const v = parseInt(e.target.value, 10);
                              if (v) assignMutation.mutate({ id: inc.id, teamId: v });
                            }}
                          >
                            <option value="" disabled>Assign...</option>
                            {teams?.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                          </select>
                        )}
                        {inc.status === 'ASSIGNED' && (
                          <button
                            onClick={e => { e.stopPropagation(); statusMutation.mutate({ id: inc.id, status: 'IN_PROGRESS' }); }}
                            className="bg-orange-600/15 hover:bg-orange-600/25 text-orange-300 border border-orange-500/30 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                          >
                            ▶ Start
                          </button>
                        )}
                        {(inc.status === 'IN_PROGRESS' || inc.status === 'ASSIGNED') && (
                          <button
                            onClick={e => { e.stopPropagation(); resolveMutation.mutate(inc.id); }}
                            className="bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                          >
                            ✓ Resolve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Detail Modal ───────────────────────────────────── */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          teams={teams || []}
          onClose={() => setSelectedIncident(null)}
          onAssign={(teamId) => assignMutation.mutate({ id: selectedIncident.id, teamId })}
          onStatusChange={(status) => statusMutation.mutate({ id: selectedIncident.id, status })}
          onResolve={() => resolveMutation.mutate(selectedIncident.id)}
          isActioning={isActioning}
        />
      )}
    </div>
  );
}
