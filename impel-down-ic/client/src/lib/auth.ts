// Auth stub — client-side only, no real JWT
// TODO(step-10): Replace with real JWT authentication against the server
// Follows docs/architecture.md

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'guard' | 'responder' | 'warden';

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string; role: Role; name: string } | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: Role) => Promise<void>;
  registerResponder: (data: any) => Promise<void>;
  logout: () => void;
}

// TODO(step-10): Replace this Zustand store with real JWT-based auth.
// Do not store passwords. Do not use localStorage for tokens.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      login: async (email: string, password: string) => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) {
            let errorMsg = 'Login failed';
            try {
              const d = await res.json();
              if (d.error) {
                errorMsg = typeof d.error === 'string' ? d.error : d.error.message || errorMsg;
              }
            } catch (e) {}
            throw new Error(errorMsg);
          }
          const data = await res.json();
          set({ isAuthenticated: true, user: data.user, token: data.token });
        } catch (e) {
          console.error(e);
          throw e;
        }
      },

      register: async (email: string, password: string, role: Role) => {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role }),
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || 'Registration failed');
          }
          const data = await res.json();
          set({ isAuthenticated: true, user: data.user, token: data.token });
        } catch (e) {
          console.error(e);
          throw e;
        }
      },

      registerResponder: async (payload: any) => {
        try {
          const res = await fetch('/api/auth/register-responder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || 'Registration failed');
          }
          const data = await res.json();
          set({ isAuthenticated: true, user: data.user, token: data.token });
        } catch (e) {
          console.error(e);
          throw e;
        }
      },

      logout: () => {
        set({ isAuthenticated: false, user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

/** Map role picker labels to Role type */
export const roleFromLabel = (label: string): Role => {
  switch (label) {
    case 'Reporter': return 'guard';
    case 'Response Team': return 'responder';
    case 'Incident Manager': return 'warden';
    default: return 'guard';
  }
};
