import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Incident, Team } from '../../services/api';
import { sse } from '../../services/sse';

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS & CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const COLORS = {
  navy: '#101A63',
  purple: '#4B1FA8',
  gold: '#B8863B',
  parchment: '#F4E2C1',
  cream: '#FFF8E8',
  cardBg: '#FFFDF5',
  critical: '#D71920',
  high: '#F39C12',
  medium: '#E8A317',
  low: '#159A70',
  success: '#159A70',
  text: '#2C1810',
  textMuted: '#6B5B4F',
  border: '#D4B896',
  borderLight: '#E8D5B8',
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; icon: string }> = {
  6: { label: 'Critical', color: '#fff', bg: '#D71920', border: '#B8151C', icon: '🚨' },
  5: { label: 'Critical', color: '#fff', bg: '#D71920', border: '#B8151C', icon: '🚨' },
  4: { label: 'High', color: '#fff', bg: '#F39C12', border: '#D68910', icon: '⚠️' },
  3: { label: 'Medium', color: '#fff', bg: '#E8A317', border: '#C78F14', icon: '🔧' },
  2: { label: 'Low', color: '#fff', bg: '#159A70', border: '#117A57', icon: '📋' },
  1: { label: 'Low', color: '#fff', bg: '#159A70', border: '#117A57', icon: '📋' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  REPORTED: { label: 'Reported', color: '#3B82F6', bg: '#DBEAFE' },
  ASSIGNED: { label: 'Assigned', color: '#F59E0B', bg: '#FEF3C7' },
  IN_PROGRESS: { label: 'In Progress', color: '#8B5CF6', bg: '#EDE9FE' },
  RESOLVED: { label: 'Resolved', color: '#10B981', bg: '#D1FAE5' },
};

const getPriority = (level: number) => PRIORITY_CONFIG[level] || PRIORITY_CONFIG[3];
const getStatus = (status: string) => STATUS_CONFIG[status] || { label: status, color: '#666', bg: '#f0f0f0' };

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'OVERDUE';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatSLADuration(totalSeconds: number): string {
  const mins = Math.round(Math.abs(totalSeconds) / 60);
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hrs ${m} mins` : `${h} hrs`;
}

function slaProgress(incident: Incident): number {
  if (incident.status === 'RESOLVED') return 100;
  const deadline = new Date(incident.deadline_at).getTime();
  const created = new Date(incident.created_at).getTime();
  const total = deadline - created;
  if (total <= 0) return 100;
  const elapsed = Date.now() - created;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ═══════════════════════════════════════════════════════════════
   SLA COUNTDOWN HOOK
   ═══════════════════════════════════════════════════════════════ */
function useSLACountdown(remainingSecondsFromServer: number, isResolved: boolean) {
  const [remaining, setRemaining] = useState(remainingSecondsFromServer);

  useEffect(() => {
    setRemaining(remainingSecondsFromServer);
  }, [remainingSecondsFromServer]);

  useEffect(() => {
    if (isResolved) return;
    const interval = setInterval(() => {
      setRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isResolved]);

  return remaining;
}

/* ═══════════════════════════════════════════════════════════════
   SVG ICONS (inline, no external deps)
   ═══════════════════════════════════════════════════════════════ */
const Icons = {
  location: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  ),
  chevronRight: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  ),
  team: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  filter: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </svg>
  ),
  warning: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  ),
  siren: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════
   SKELETON COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div className="animate-pulse" style={{ background: COLORS.cardBg, borderRadius: 12, border: `1px solid ${COLORS.borderLight}`, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ height: 20, width: '60%', background: COLORS.borderLight, borderRadius: 4 }} />
        <div style={{ height: 24, width: 60, background: COLORS.borderLight, borderRadius: 12 }} />
      </div>
      <div style={{ height: 14, width: '80%', background: COLORS.borderLight, borderRadius: 4, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <div style={{ height: 12, width: 100, background: COLORS.borderLight, borderRadius: 4 }} />
        <div style={{ height: 12, width: 120, background: COLORS.borderLight, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="animate-pulse" style={{ background: COLORS.cardBg, borderRadius: 12, border: `1px solid ${COLORS.borderLight}`, padding: 16, textAlign: 'center' }}>
      <div style={{ height: 32, width: 40, background: COLORS.borderLight, borderRadius: 4, margin: '0 auto 8px' }} />
      <div style={{ height: 12, width: 60, background: COLORS.borderLight, borderRadius: 4, margin: '0 auto' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLA COUNTDOWN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function SLACountdownDisplay({ incident }: { incident: Incident }) {
  const remaining = useSLACountdown(incident.remainingSeconds, incident.status === 'RESOLVED');
  const progress = slaProgress(incident);
  const isOverdue = remaining <= 0;
  const deadline = new Date(incident.deadline_at).getTime();
  const created = new Date(incident.created_at).getTime();
  const totalDuration = deadline - created;

  const progressColor = isOverdue ? COLORS.critical : progress > 70 ? '#F39C12' : progress > 50 ? '#E8A317' : COLORS.success;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 130 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: isOverdue ? COLORS.critical : '#F39C12' }}>{Icons.clock}</span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 18,
          fontWeight: 700,
          color: isOverdue ? COLORS.critical : '#C85000',
          ...(isOverdue ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
        }}>
          {formatCountdown(Math.max(0, remaining))}
        </span>
      </div>
      <span style={{ fontSize: 11, color: COLORS.textMuted }}>
        of {formatSLADuration(totalDuration / 1000)}
      </span>
      {/* Progress bar */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1,
          height: 6,
          background: '#E8D5B8',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(100, progress)}%`,
            height: '100%',
            background: progressColor,
            borderRadius: 3,
            transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, minWidth: 32 }}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INCIDENT CARD
   ═══════════════════════════════════════════════════════════════ */
function IncidentCard({
  incident,
  onOpenDetail,
  onStatusChange,
  isActioning,
}: {
  incident: Incident;
  onOpenDetail: (inc: Incident) => void;
  onStatusChange: (id: number, status: string) => void;
  isActioning: boolean;
}) {
  const priority = getPriority(incident.level);
  const status = getStatus(incident.status);

  // Determine next valid status transitions
  const getNextStatuses = (currentStatus: string): { value: string; label: string }[] => {
    switch (currentStatus) {
      case 'REPORTED': return [{ value: 'ASSIGNED', label: 'Assigned' }, { value: 'RESOLVED', label: 'Resolved' }];
      case 'ASSIGNED': return [{ value: 'IN_PROGRESS', label: 'In Progress' }, { value: 'RESOLVED', label: 'Resolved' }];
      case 'IN_PROGRESS': return [{ value: 'RESOLVED', label: 'Resolved' }];
      default: return [];
    }
  };

  const nextStatuses = getNextStatuses(incident.status);

  return (
    <div
      style={{
        background: COLORS.cardBg,
        borderRadius: 14,
        border: `1px solid ${COLORS.borderLight}`,
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(139,100,60,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="incident-card"
      onClick={() => onOpenDetail(incident)}
      role="button"
      tabIndex={0}
      aria-label={`Incident: ${incident.title}`}
      onKeyDown={e => { if (e.key === 'Enter') onOpenDetail(incident); }}
    >
      {/* Priority stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: priority.bg,
      }} />

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: Icon + Content */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `${priority.bg}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          {priority.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h3 style={{
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: 15,
              color: COLORS.text,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 320,
            }}>
              {incident.title}
            </h3>
            <span style={{
              padding: '2px 12px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              color: priority.color,
              background: priority.bg,
              letterSpacing: 0.5,
            }}>
              {priority.label}
            </span>
          </div>

          <p style={{
            fontSize: 13,
            color: COLORS.textMuted,
            margin: '0 0 10px 0',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {incident.description}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: COLORS.textMuted, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {Icons.location}
              {incident.location}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {Icons.calendar}
              {formatDate(incident.created_at)} • {formatTime(incident.created_at)}
            </span>
          </div>
        </div>

        {/* Right: SLA + Status + Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          {incident.status !== 'RESOLVED' && (
            <SLACountdownDisplay incident={incident} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {incident.status !== 'RESOLVED' && nextStatuses.length > 0 ? (
              <select
                value={incident.status}
                onChange={e => {
                  e.stopPropagation();
                  onStatusChange(incident.id, e.target.value);
                }}
                onClick={e => e.stopPropagation()}
                disabled={isActioning}
                style={{
                  padding: '6px 28px 6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${status.color}40`,
                  background: status.bg,
                  color: status.color,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  minWidth: 120,
                }}
                aria-label="Change incident status"
              >
                <option value={incident.status}>{status.label}</option>
                {nextStatuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            ) : (
              <span style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: status.bg,
                color: status.color,
                fontSize: 12,
                fontWeight: 600,
              }}>
                {status.label}
              </span>
            )}
          </div>

          <div style={{ color: COLORS.gold, opacity: 0.6 }}>
            {Icons.chevronRight}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INCIDENT DETAIL MODAL
   ═══════════════════════════════════════════════════════════════ */
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
  const priority = getPriority(incident.level);
  const status = getStatus(incident.status);
  const remaining = useSLACountdown(incident.remainingSeconds, incident.status === 'RESOLVED');
  const isOverdue = remaining <= 0 && incident.status !== 'RESOLVED';
  const assignedTeam = teams.find(t => t.id === incident.team_id);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'relative',
          background: COLORS.cream,
          borderRadius: 16,
          border: `2px solid ${COLORS.gold}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.purple})`,
          padding: '20px 24px',
          borderRadius: '14px 14px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div style={{ flex: 1, marginRight: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 8,
                background: status.bg, color: status.color,
                fontSize: 11, fontWeight: 700,
              }}>{status.label}</span>
              <span style={{
                padding: '3px 10px', borderRadius: 8,
                background: priority.bg, color: '#fff',
                fontSize: 11, fontWeight: 700,
              }}>{priority.label}</span>
              {incident.tier > 0 && (
                <span style={{
                  padding: '3px 10px', borderRadius: 8,
                  background: incident.tier === 3 ? '#F59E0B' : '#EF4444',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  ...(incident.tier === 3 ? { animation: 'pulse 1.5s infinite' } : {}),
                }}>
                  {incident.tier === 3 ? '⚡ BUSTER CALL' : `Tier ${incident.tier}`}
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: '"Pirata One", cursive', fontSize: 24, color: '#fff', margin: 0 }}>
              {incident.title}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              #{incident.id} • Reported by {incident.reporter}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}
            aria-label="Close modal"
          >{Icons.close}</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Category', value: incident.category },
              { label: 'Location', value: incident.location },
              { label: 'Severity Level', value: `Level ${incident.level}` },
              { label: 'Assigned Team', value: assignedTeam ? `${assignedTeam.emoji} ${assignedTeam.name}` : 'Unassigned' },
            ].map(item => (
              <div key={item.label} style={{
                background: COLORS.parchment,
                borderRadius: 10,
                padding: 14,
                border: `1px solid ${COLORS.borderLight}`,
              }}>
                <p style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{item.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* SLA */}
          {incident.status !== 'RESOLVED' && (
            <div style={{
              borderRadius: 10, padding: 14, marginBottom: 20,
              background: isOverdue ? '#FEE2E2' : '#DBEAFE',
              border: `1px solid ${isOverdue ? '#FCA5A5' : '#93C5FD'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: isOverdue ? COLORS.critical : '#2563EB' }}>SLA Countdown</p>
              <span style={{
                fontFamily: 'monospace', fontSize: 22, fontWeight: 700,
                color: isOverdue ? COLORS.critical : '#2563EB',
                ...(isOverdue ? { animation: 'pulse 1.5s infinite' } : {}),
              }}>
                {isOverdue ? `OVERDUE by ${formatSLADuration(Math.abs(remaining))}` : formatCountdown(remaining)}
              </span>
            </div>
          )}

          {/* Description */}
          {incident.description && (
            <div style={{ background: COLORS.parchment, borderRadius: 10, padding: 14, marginBottom: 20, border: `1px solid ${COLORS.borderLight}` }}>
              <p style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Description</p>
              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{incident.description}</p>
            </div>
          )}

          {/* Timeline */}
          {incident.events && incident.events.length > 0 && (
            <div style={{ background: COLORS.parchment, borderRadius: 10, padding: 14, marginBottom: 20, border: `1px solid ${COLORS.borderLight}` }}>
              <p style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Activity Timeline</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {incident.events.map((ev, i) => (
                  <div key={ev.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.purple, marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, color: COLORS.text }}>{ev.message}</p>
                      <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{new Date(ev.at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {incident.status !== 'RESOLVED' && (
            <div style={{ borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 16 }}>
              <p style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Quick Actions</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {!incident.team_id && (
                  <select
                    defaultValue=""
                    onChange={e => { const v = parseInt(e.target.value, 10); if (v) onAssign(v); }}
                    disabled={isActioning}
                    style={{
                      padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.cardBg,
                      fontSize: 13, color: COLORS.text, cursor: 'pointer',
                    }}
                    aria-label="Assign to team"
                  >
                    <option value="" disabled>Assign Team...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                  </select>
                )}
                {(incident.status === 'ASSIGNED' || (incident.status === 'REPORTED' && incident.team_id)) && (
                  <button
                    onClick={() => onStatusChange('IN_PROGRESS')}
                    disabled={isActioning}
                    style={{
                      padding: '8px 16px', borderRadius: 8,
                      background: '#F59E0B20', border: '1px solid #F59E0B60',
                      color: '#B45309', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >▶ Start Working</button>
                )}
                {(incident.status === 'ASSIGNED' || incident.status === 'IN_PROGRESS') && (
                  <button
                    onClick={onResolve}
                    disabled={isActioning}
                    style={{
                      padding: '8px 16px', borderRadius: 8,
                      background: '#10B98120', border: '1px solid #10B98160',
                      color: '#047857', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >✓ Resolve</button>
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
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
export default function ResponseTeamDashboard() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [sortBy, setSortBy] = useState<string>('priority');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  /* ── SSE real-time ───────────────────────────────────────── */
  useEffect(() => {
    sse.connect();
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['rt-incidents'] });
      qc.invalidateQueries({ queryKey: ['rt-stats'] });
      qc.invalidateQueries({ queryKey: ['rt-resolved'] });
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
  const { data: incidents, isLoading: isIncidentsLoading } = useQuery({
    queryKey: ['rt-incidents', searchQuery],
    queryFn: () => api.getIncidents('active', searchQuery ? { q: searchQuery } : undefined),
    refetchInterval: 15000,
  });

  const { data: resolvedIncidents, isLoading: isResolvedLoading } = useQuery({
    queryKey: ['rt-resolved'],
    queryFn: () => api.getIncidents('resolved'),
    refetchInterval: 30000,
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

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: api.getMeta,
  });

  /* ── Filter & Sort incidents ─────────────────────────────── */
  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    let result = [...incidents];

    if (filterPriority) {
      const levelRanges: Record<string, number[]> = {
        critical: [5, 6],
        high: [4],
        medium: [3],
        low: [1, 2],
      };
      const levels = levelRanges[filterPriority] || [];
      result = result.filter(i => levels.includes(i.level));
    }

    if (filterStatus) {
      result = result.filter(i => i.status === filterStatus);
    }

    if (filterLocation) {
      result = result.filter(i => i.location === filterLocation);
    }

    // Sort
    switch (sortBy) {
      case 'priority':
        result.sort((a, b) => b.level - a.level);
        break;
      case 'sla':
        result.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
        break;
      case 'created':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'status':
        const statusOrder: Record<string, number> = { REPORTED: 0, ASSIGNED: 1, IN_PROGRESS: 2, RESOLVED: 3 };
        result.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
        break;
    }

    return result;
  }, [incidents, filterPriority, filterStatus, filterLocation, sortBy]);

  // Get unique locations from actual incident data
  const locations = useMemo(() => {
    if (!incidents) return [];
    return [...new Set(incidents.map(i => i.location))].sort();
  }, [incidents]);

  // Escalation watch: incidents nearing SLA breach
  const escalationIncidents = useMemo(() => {
    if (!incidents) return [];
    return incidents
      .filter(i => i.status !== 'RESOLVED' && (i.urgency === 'red' || i.isOverdue || i.tier > 0))
      .sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  }, [incidents]);

  // Recently resolved
  const recentlyResolved = useMemo(() => {
    if (!resolvedIncidents) return [];
    return resolvedIncidents
      .slice(0, 5)
      .sort((a, b) => new Date(b.resolved_at!).getTime() - new Date(a.resolved_at!).getTime());
  }, [resolvedIncidents]);

  /* ── Computed stats ──────────────────────────────────────── */
  const urgentCount = incidents?.filter(i => i.level >= 5 && i.status !== 'RESOLVED').length ?? 0;
  const inProgressCount = incidents?.filter(i => i.status === 'IN_PROGRESS').length ?? 0;
  const awaitingCount = incidents?.filter(i => i.status === 'REPORTED' || i.status === 'ASSIGNED').length ?? 0;
  const resolvedTodayCount = useMemo(() => {
    if (!resolvedIncidents) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return resolvedIncidents.filter(i => i.resolved_at && new Date(i.resolved_at).getTime() >= today.getTime()).length;
  }, [resolvedIncidents]);

  /* ── Mutations ───────────────────────────────────────────── */
  const assignMutation = useMutation({
    mutationFn: ({ id, teamId }: { id: number; teamId: number }) => api.assignIncident(id, teamId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rt-incidents'] });
      qc.invalidateQueries({ queryKey: ['rt-stats'] });
      qc.invalidateQueries({ queryKey: ['rt-resolved'] });
      setSelectedIncident(data);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.updateIncidentStatus(id, status),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rt-incidents'] });
      qc.invalidateQueries({ queryKey: ['rt-stats'] });
      qc.invalidateQueries({ queryKey: ['rt-resolved'] });
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
      qc.invalidateQueries({ queryKey: ['rt-resolved'] });
      setSelectedIncident(null);
    },
    onError: (err: any) => alert(err.message),
  });

  const isActioning = assignMutation.isPending || statusMutation.isPending || resolveMutation.isPending;

  const openDetail = async (inc: Incident) => {
    try {
      const full = await api.getIncident(inc.id);
      setSelectedIncident(full);
    } catch {
      setSelectedIncident(inc);
    }
  };

  const handleStatusChange = useCallback((id: number, status: string) => {
    if (status === 'RESOLVED') {
      resolveMutation.mutate(id);
    } else {
      statusMutation.mutate({ id, status });
    }
  }, [statusMutation, resolveMutation]);

  const clearFilters = () => {
    setFilterPriority('');
    setFilterStatus('');
    setFilterLocation('');
    setSearchQuery('');
  };

  const hasFilters = filterPriority || filterStatus || filterLocation || searchQuery;

  // Get the user's team (first team found for now — the system doesn't have team_members table)
  const myTeam = teams?.[0];

  return (
    <div style={{ minHeight: '100vh', background: COLORS.parchment, fontFamily: '"Inter", sans-serif' }}>
      {/* ═══════════════════════════════════════════════════════
         CSS ANIMATIONS
         ═══════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .incident-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139,100,60,0.15) !important; border-color: ${COLORS.gold} !important; }
        .parchment-bg { background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"); }
        .select-styled { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B5B4F' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; }
        .select-styled:focus { outline: none; border-color: ${COLORS.purple}; box-shadow: 0 0 0 2px ${COLORS.purple}20; }
        @media (max-width: 1024px) { .dashboard-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ═══════════════════════════════════════════════════════
         HERO HEADER
         ═══════════════════════════════════════════════════════ */}
      <header className="parchment-bg" style={{
        backgroundImage: `url(/images/reporter_map_bg.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderBottom: `3px solid ${COLORS.gold}`,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 200,
      }}>
        {/* Compass decoration */}
        <div style={{
          position: 'absolute', right: '15%', top: '50%', transform: 'translateY(-50%)',
          width: 300, height: 300, borderRadius: '50%',
          border: `2px solid ${COLORS.gold}30`,
          opacity: 0.15,
        }}>
          <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: `1px solid ${COLORS.gold}40` }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: `${COLORS.gold}30` }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: `${COLORS.gold}30` }} />
        </div>

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div>
            {/* Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <img src="/images/logo.png" alt="ImpelOps Logo" style={{ height: 56, width: 56, objectFit: 'contain' }} />
              <div>
                <h1 style={{ fontFamily: '"Pirata One", cursive', fontSize: 32, color: COLORS.navy, margin: 0, letterSpacing: 2 }}>IMPEL DOWN</h1>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.purple, textTransform: 'uppercase', letterSpacing: 4 }}>INCIDENT COMMAND</span>
              </div>
            </div>

            {/* Greeting */}
            <div style={{ marginBottom: 8 }}>
              <h2 style={{ fontFamily: '"Pirata One", cursive', fontSize: 36, color: COLORS.text, margin: 0 }}>
                Ahoy, <span style={{ color: COLORS.purple }}>{user?.name || 'Response Team'}!</span>
              </h2>
              <p style={{ fontSize: 15, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' }}>
                Handle assigned incidents, track deadlines, and keep operations moving.
              </p>
            </div>
          </div>

          {/* Logout */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: `${COLORS.navy}10`, border: `1px solid ${COLORS.navy}30`,
                color: COLORS.navy, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
              aria-label="Logout"
            >
              {Icons.logout}
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
         MAIN CONTENT
         ═══════════════════════════════════════════════════════ */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 30px' }}>
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>

          {/* ═══════════════════════════════════════════════════
             LEFT COLUMN
             ═══════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── My Assigned Incidents ────────────────────────── */}
            <section style={{
              background: COLORS.cardBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 4px 16px rgba(139,100,60,0.08)',
              overflow: 'hidden',
            }}>
              {/* Section Header */}
              <div style={{
                padding: '18px 24px',
                borderBottom: `1px solid ${COLORS.borderLight}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: `${COLORS.parchment}80`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>⚔️</span>
                  <div>
                    <h2 style={{ fontFamily: '"Pirata One", cursive', fontSize: 22, color: COLORS.navy, margin: 0 }}>
                      My Assigned Incidents
                    </h2>
                    <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
                      Incidents assigned to your team. Take action and update the status.
                    </p>
                  </div>
                </div>

                {/* Sort */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="sort-select" style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>Sort by:</label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="select-styled"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.cream,
                      fontSize: 12,
                      color: COLORS.text,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="priority">Priority (High to Low)</option>
                    <option value="sla">SLA Remaining</option>
                    <option value="created">Created Time</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </div>

              {/* Incident List */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {isIncidentsLoading && (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                )}

                {!isIncidentsLoading && filteredIncidents.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span style={{ fontSize: 48, opacity: 0.3, display: 'block', marginBottom: 12 }}>🛡️</span>
                    <p style={{ fontFamily: '"Pirata One", cursive', fontSize: 22, color: COLORS.textMuted, marginBottom: 4 }}>
                      {hasFilters ? 'No Incidents Match Your Filters' : 'All Clear, Commander'}
                    </p>
                    <p style={{ fontSize: 13, color: COLORS.textMuted }}>
                      {hasFilters ? 'Try adjusting your filters or clearing them.' : 'No incidents are currently assigned to your team.'}
                    </p>
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        style={{
                          marginTop: 12, padding: '8px 20px', borderRadius: 8,
                          background: COLORS.purple, border: 'none',
                          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >Clear Filters</button>
                    )}
                  </div>
                )}

                {filteredIncidents.map(inc => (
                  <IncidentCard
                    key={inc.id}
                    incident={inc}
                    onOpenDetail={openDetail}
                    onStatusChange={handleStatusChange}
                    isActioning={isActioning}
                  />
                ))}
              </div>
            </section>

            {/* ── Recently Resolved ────────────────────────────── */}
            <section style={{
              background: COLORS.cardBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 4px 16px rgba(139,100,60,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${COLORS.borderLight}`,
                display: 'flex', alignItems: 'center', gap: 10,
                background: `${COLORS.parchment}80`,
              }}>
                <span style={{ fontSize: 22 }}>✅</span>
                <h2 style={{ fontFamily: '"Pirata One", cursive', fontSize: 20, color: COLORS.navy, margin: 0 }}>
                  Recently Resolved
                </h2>
              </div>

              <div style={{ padding: '12px 20px' }}>
                {isResolvedLoading && <SkeletonCard />}

                {!isResolvedLoading && recentlyResolved.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '20px', fontSize: 13, color: COLORS.textMuted }}>
                    No incidents have been resolved recently.
                  </p>
                )}

                {recentlyResolved.map(inc => (
                  <div
                    key={inc.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: `1px solid ${COLORS.borderLight}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => openDetail(inc)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') openDetail(inc); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{ color: COLORS.success }}>{Icons.check}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, fontSize: 12, color: COLORS.textMuted }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {Icons.calendar}
                        {inc.resolved_at ? `${formatDate(inc.resolved_at)} • ${formatTime(inc.resolved_at)}` : '—'}
                      </span>
                      <span style={{
                        padding: '3px 10px', borderRadius: 8,
                        background: '#D1FAE5', color: '#059669',
                        fontSize: 11, fontWeight: 600,
                      }}>Resolved</span>
                      <span style={{ color: COLORS.gold, opacity: 0.6 }}>{Icons.chevronRight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ═══════════════════════════════════════════════════
             RIGHT COLUMN
             ═══════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── My Team ─────────────────────────────────────── */}
            <section style={{
              background: COLORS.cardBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 4px 16px rgba(139,100,60,0.08)',
              overflow: 'hidden',
            }}>
              <img 
                src="/images/magellan_banner.jpg" 
                alt="Warden Magellan" 
                style={{ width: '100%', height: 180, objectFit: 'cover', borderBottom: `2px solid ${COLORS.gold}` }} 
              />
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${COLORS.borderLight}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: `#ffffff`, // White background as in screenshot
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="20" fill={COLORS.navy} viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <h2 style={{ fontFamily: 'serif', fontSize: 22, color: COLORS.navy, margin: 0, fontWeight: 'bold' }}>
                    My Team
                  </h2>
                </div>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#4338ca', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                  </svg>
                  Edit Team
                </button>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {!teams ? (
                  <SkeletonStat />
                ) : myTeam ? (
                  <>
                    <div style={{
                      background: COLORS.parchment,
                      borderRadius: 10,
                      padding: '12px 16px',
                      border: `1px solid ${COLORS.borderLight}`,
                      marginBottom: 16,
                    }}>
                      <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>Team: </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>
                        {myTeam.emoji} {myTeam.name}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ textAlign: 'center', padding: 12, background: COLORS.parchment, borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
                        <div style={{ color: COLORS.navy, marginBottom: 4 }}>{Icons.team}</div>
                        <p style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>Tier</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{myTeam.tier}</p>
                      </div>
                      <div style={{ textAlign: 'center', padding: 12, background: COLORS.parchment, borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
                        <div style={{ marginBottom: 4, fontSize: 18 }}>{myTeam.emoji}</div>
                        <p style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>Symbol</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{myTeam.emoji}</p>
                      </div>
                    </div>

                    {/* Other teams */}
                    {teams.length > 1 && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>All Teams</p>
                        {teams.map(t => (
                          <div key={t.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 0', borderBottom: `1px solid ${COLORS.borderLight}`,
                            fontSize: 12, color: COLORS.text,
                          }}>
                            <span>{t.emoji} {t.name}</span>
                            <span style={{ fontSize: 11, color: COLORS.textMuted }}>Tier {t.tier}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ textAlign: 'center', padding: 20, fontSize: 13, color: COLORS.textMuted }}>
                    Team information couldn't be loaded.
                  </p>
                )}
              </div>
            </section>

            {/* ── Today's Work ─────────────────────────────────── */}
            <section style={{
              background: COLORS.cardBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 4px 16px rgba(139,100,60,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${COLORS.borderLight}`,
                display: 'flex', alignItems: 'center', gap: 10,
                background: `${COLORS.parchment}80`,
              }}>
                <span style={{ fontSize: 22 }}>📊</span>
                <h2 style={{ fontFamily: '"Pirata One", cursive', fontSize: 20, color: COLORS.navy, margin: 0 }}>
                  Today's Work
                </h2>
              </div>

              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                {stats ? (
                  <>
                    {[
                      { label: 'Urgent', value: urgentCount, icon: '🚨', color: COLORS.critical },
                      { label: 'In Progress', value: inProgressCount, icon: '🔧', color: '#F59E0B' },
                      { label: 'Awaiting\nUpdate', value: awaitingCount, icon: '⏳', color: COLORS.purple },
                      { label: 'Resolved', value: resolvedTodayCount, icon: '✅', color: COLORS.success },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        textAlign: 'center',
                        padding: '14px 8px',
                        background: COLORS.parchment,
                        borderRadius: 10,
                        border: `1px solid ${COLORS.borderLight}`,
                      }}>
                        <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{stat.icon}</span>
                        <p style={{ fontSize: 26, fontWeight: 800, color: stat.color, margin: '4px 0', fontFamily: '"Pirata One", cursive' }}>
                          {stat.value}
                        </p>
                        <p style={{ fontSize: 10, color: COLORS.textMuted, whiteSpace: 'pre-line', lineHeight: 1.3 }}>
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
                  </>
                )}
              </div>
            </section>

            {/* ── Quick Filters ────────────────────────────────── */}
            <section style={{
              background: COLORS.cardBg,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 4px 16px rgba(139,100,60,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${COLORS.borderLight}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: `${COLORS.parchment}80`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: COLORS.navy }}>{Icons.filter}</span>
                  <h2 style={{ fontFamily: '"Pirata One", cursive', fontSize: 20, color: COLORS.navy, margin: 0 }}>
                    Quick Filters
                  </h2>
                </div>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    style={{
                      padding: '4px 12px', borderRadius: 6,
                      background: `${COLORS.critical}10`, border: `1px solid ${COLORS.critical}30`,
                      color: COLORS.critical, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >Clear</button>
                )}
              </div>

              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {/* Priority */}
                  <div>
                    <label style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Priority</label>
                    <select
                      value={filterPriority}
                      onChange={e => setFilterPriority(e.target.value)}
                      className="select-styled"
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: `1px solid ${COLORS.border}`, background: COLORS.cream,
                        fontSize: 12, color: COLORS.text, cursor: 'pointer',
                      }}
                      aria-label="Filter by priority"
                    >
                      <option value="">All Priorities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Status</label>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="select-styled"
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: `1px solid ${COLORS.border}`, background: COLORS.cream,
                        fontSize: 12, color: COLORS.text, cursor: 'pointer',
                      }}
                      aria-label="Filter by status"
                    >
                      <option value="">All Statuses</option>
                      <option value="REPORTED">Reported</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Location */}
                  <div>
                    <label style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Location</label>
                    <select
                      value={filterLocation}
                      onChange={e => setFilterLocation(e.target.value)}
                      className="select-styled"
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: `1px solid ${COLORS.border}`, background: COLORS.cream,
                        fontSize: 12, color: COLORS.text, cursor: 'pointer',
                      }}
                      aria-label="Filter by location"
                    >
                      <option value="">All Locations</option>
                      {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>

                  {/* Keyword Search */}
                  <div>
                    <label style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Keyword</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }}>
                        {Icons.search}
                      </span>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
                          border: `1px solid ${COLORS.border}`, background: COLORS.cream,
                          fontSize: 12, color: COLORS.text, boxSizing: 'border-box',
                        }}
                        aria-label="Search incidents by keyword"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Escalation Watch ─────────────────────────────── */}
            <section style={{
              background: COLORS.cardBg,
              borderRadius: 16,
              border: `2px solid ${escalationIncidents.length > 0 ? COLORS.critical + '60' : COLORS.border}`,
              boxShadow: escalationIncidents.length > 0 ? `0 4px 20px ${COLORS.critical}15` : '0 4px 16px rgba(139,100,60,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${COLORS.borderLight}`,
                display: 'flex', alignItems: 'center', gap: 10,
                background: escalationIncidents.length > 0 ? `${COLORS.critical}08` : `${COLORS.parchment}80`,
              }}>
                <span style={{ color: escalationIncidents.length > 0 ? COLORS.critical : COLORS.navy }}>{Icons.warning}</span>
                <h2 style={{ fontFamily: '"Pirata One", cursive', fontSize: 20, color: COLORS.navy, margin: 0 }}>
                  Escalation Watch
                </h2>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {escalationIncidents.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '16px', fontSize: 13, color: COLORS.textMuted }}>
                    No incidents currently approaching SLA breach.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{
                      background: `${COLORS.critical}10`,
                      borderRadius: 10,
                      padding: 14,
                      border: `1px solid ${COLORS.critical}30`,
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.critical, marginBottom: 4 }}>
                        {escalationIncidents.length} incident{escalationIncidents.length !== 1 ? 's' : ''} nearing SLA breach
                      </p>

                      {escalationIncidents.slice(0, 3).map(inc => {
                        const totalDuration = (new Date(inc.deadline_at).getTime() - new Date(inc.created_at).getTime()) / 1000;
                        return (
                          <div key={inc.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 0',
                            borderTop: `1px solid ${COLORS.critical}15`,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {inc.title}
                              </p>
                              <p style={{ fontSize: 11, color: COLORS.textMuted }}>
                                SLA threshold: {formatSLADuration(totalDuration)} | Time remaining: <span style={{ color: COLORS.critical, fontWeight: 700, fontFamily: 'monospace' }}>
                                  {formatCountdown(Math.max(0, inc.remainingSeconds))}
                                </span>
                              </p>
                            </div>
                            <button
                              onClick={() => openDetail(inc)}
                              style={{
                                padding: '4px 12px', borderRadius: 6,
                                background: COLORS.navy, border: 'none',
                                color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
                              }}
                            >View Incident →</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════
         INCIDENT DETAIL MODAL
         ═══════════════════════════════════════════════════════ */}
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
