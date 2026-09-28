import { useAuthStore } from '../lib/auth';

export interface Incident {
  id: number;
  title: string;
  description: string;
  location: string;
  occurred_at: string;
  category: string;
  level: number;
  status: string;
  team_id: number | null;
  tier: number;
  reporter: string;
  created_at: string;
  deadline_at: string;
  resolved_at: string | null;
  escalated_at: string | null;
  buster_called_at: string | null;
  escalation_count: number;
  version: number;
  isOverdue: boolean;
  remainingSeconds: number;
  urgency: 'green' | 'yellow' | 'red';
  events?: IncidentEvent[];
  attachments?: Attachment[];
}

export interface IncidentEvent {
  id: number;
  type: string;
  actor: string;
  from_value: string | null;
  to_value: string | null;
  message: string;
  at: string;
}

export interface Attachment {
  id: number;
  filename: string;
  url: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  tier: number;
  emoji: string;
}

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  getMeta: async () => {
    const res = await fetch(`${API_BASE}/api/meta`);
    if (!res.ok) throw new Error('Failed to fetch meta');
    return res.json();
  },

  getMyStats: async () => {
    const res = await fetch(`${API_BASE}/api/incidents/mine/stats`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch my stats');
    return res.json();
  },

  getIncidents: async (view: 'active' | 'escalated' | 'resolved' | string = 'active', params?: Record<string, string>): Promise<Incident[]> => {
    const searchParams = new URLSearchParams({ view, ...params });
    const res = await fetch(`${API_BASE}/api/incidents?${searchParams.toString()}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },
  
  getIncident: async (id: number): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/api/incidents/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch incident');
    return res.json();
  },

  createIncident: async (formData: FormData): Promise<Incident> => {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_BASE}/api/incidents`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error('Failed to create incident: ' + errText);
    }
    return res.json();
  },

  getTeams: async (): Promise<Team[]> => {
    const res = await fetch(`${API_BASE}/api/teams`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  },

  getStats: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/api/stats`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  assignIncident: async (id: number, teamId: number): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/api/incidents/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ teamId }),
    });
    if (!res.ok) throw new Error('Failed to assign incident');
    return res.json();
  },

  updateIncidentStatus: async (id: number, status: string): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/api/incidents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update status');
    }
    return res.json();
  },

  resolveIncident: async (id: number): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/api/incidents/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to resolve incident');
    }
    return res.json();
  },
};
