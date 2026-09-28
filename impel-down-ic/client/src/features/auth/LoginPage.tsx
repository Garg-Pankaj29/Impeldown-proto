// Login page — matches ui_images/login.png exactly
// Follows docs/architecture.md, docs/tech-stack.md

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore, roleFromLabel, type Role } from '../../lib/auth';

/* ── Role card data ──────────────────────────────────────────── */
const roles = [
  {
    label: 'Reporter',
    subtitle: 'Report & Track',
    icon: (
      <img
        src="/images/reporter_icon.png?v=2"
        alt="Reporter icon"
        className="w-14 h-14 mx-auto object-contain drop-shadow-sm"
      />
    ),
  },
  {
    label: 'Response Team',
    subtitle: 'Respond & Resolve',
    icon: (
      <img
        src="/images/response_team_icon.png?v=2"
        alt="Response Team icon"
        className="w-14 h-14 mx-auto object-contain drop-shadow-sm"
      />
    ),
  },
] as const;

/* ── Ship-wheel logo (real PNG) ───────────────────────────────── */
function ShipWheelLogo({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const sizeClass = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  return (
    <img
      src="/images/logo.png"
      alt="Impel Down Incident Command logo"
      className={`${sizeClass} object-contain drop-shadow-md`}
    />
  );
}

/* ── Compass rose SVG ────────────────────────────────────────── */
function CompassRose() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <polygon points="12,2 14,10 12,8 10,10" fill="#1e3a8a" />
      <polygon points="12,22 14,14 12,16 10,14" fill="#6b7280" />
      <polygon points="2,12 10,10 8,12 10,14" fill="#6b7280" />
      <polygon points="22,12 14,10 16,12 14,14" fill="#6b7280" />
      <circle cx="12" cy="12" r="2" fill="#1e3a8a" />
    </svg>
  );
}

/* ── Jolly Roger small icon ──────────────────────────────────── */
function JollyRogerSmall({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`w-6 h-6 ${className}`} aria-hidden="true">
      <circle cx="16" cy="13" r="7" fill="#6b7280" />
      <circle cx="13" cy="12" r="1.5" fill="#fefdfb" />
      <circle cx="19" cy="12" r="1.5" fill="#fefdfb" />
      <rect x="14" y="19" width="4" height="4" rx="1" fill="#6b7280" />
      <line x1="8" y1="24" x2="24" y2="28" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="24" x2="8" y2="28" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const navigate = useNavigate();
  const { rolePath } = useParams<{ rolePath: string }>();
  const { login, register } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  const selectedRole = rolePath === 'response-team' ? 'Response Team' : 'Reporter';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  /* Clear form on role change */
  useEffect(() => {
    setEmail('');
    setPassword('');
    setErrors({});
  }, [rolePath]);

  /* Pause video when tab hidden */
  useEffect(() => {
    const handleVisibility = () => {
      if (!videoRef.current) return;
      if (document.hidden) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  /* prefers-reduced-motion */
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Validation ─────────────────────────────────────────────── */
  function validate(): boolean {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password.trim()) errs.password = 'Password is required';
    else if (password.length < 4) errs.password = 'Must be at least 4 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ── Submit ─────────────────────────────────────────────────── */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    
    try {
      const role: Role = roleFromLabel(selectedRole);
      if (isRegisterMode) {
        await register(email, password, role);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, form: err.message || 'Authentication failed' }));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex">
      {/* ── Background video ──────────────────────────────────── */}
      {!prefersReduced && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/login_poster.png"
          className="fixed inset-0 w-full h-full object-cover z-0"
          onError={(e) => {
            // Fallback to poster on error
            (e.target as HTMLVideoElement).style.display = 'none';
          }}
        >
          <source src="/videos/login_bg_animation.mp4?v=3" type="video/mp4" />
        </video>
      )}

      {/* Static poster fallback for reduced-motion */}
      {prefersReduced && (
        <div
          className="fixed inset-0 w-full h-full bg-cover bg-center z-0"
          style={{ backgroundImage: 'url(/images/login_poster.png)' }}
        />
      )}

      {/* Parchment overlay removed as per user request to see full screen video */}

      <div className="relative z-10 hidden lg:flex flex-col items-center justify-start flex-1 pl-[15vw] pr-8 pt-[15vh]">
        <div className="flex items-center gap-5 mb-3">
          <ShipWheelLogo size="lg" />
          <div>
            <h1 className="font-serif font-black text-[3.5rem] tracking-[0.1em] text-[#0f172a] leading-none drop-shadow-sm whitespace-nowrap">
              IMPEL DOWN
            </h1>
            <p className="text-[#0f172a] text-lg tracking-[0.4em] font-bold uppercase mt-2 whitespace-nowrap">
              Incident Command
            </p>
          </div>
        </div>

        {/* Decorative line with compass */}
        <div className="flex items-center gap-3 my-4 w-full max-w-md">
          <div className="flex-1 h-px bg-marine/40" />
          <CompassRose />
          <div className="flex-1 h-px bg-marine/40" />
        </div>

        <p className="text-marine/80 text-sm tracking-[0.4em] font-semibold uppercase">
          Report &nbsp;•&nbsp; Respond &nbsp;•&nbsp; Resolve
        </p>
      </div>

      {/* ── Right: Login card ─────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center w-full lg:w-[45%] px-6 py-12">
        <div
          className="w-full max-w-[480px] rounded-2xl shadow-2xl p-10 md:p-12"
          style={{ backgroundColor: 'rgba(254, 253, 251, 0.97)' }}
        >
          {/* ── Mobile logo (only on small screens) ────────── */}
          <div className="lg:hidden flex items-center gap-4 mb-8 justify-center">
            <ShipWheelLogo size="sm" />
            <div>
              <h1 className="font-serif font-black text-3xl tracking-[0.1em] text-[#0f172a] leading-none">
                IMPEL DOWN
              </h1>
              <p className="text-marine text-xs tracking-[0.3em] font-bold uppercase mt-1">
                Incident Command
              </p>
            </div>
          </div>

          {/* ── Heading ────────────────────────────────────── */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-800">
              {isRegisterMode ? (
                <>Create <span className="text-[#b91c1c]">Account</span></>
              ) : (
                <>Welcome <span className="text-[#b91c1c]">Aboard!</span></>
              )}
            </h2>
            <p className="text-[#6b7280] text-sm mt-1">
              {isRegisterMode ? 'Sign up for Impel Down Incident Command' : 'Log in to Impel Down Incident Command'}
            </p>
          </div>

          {/* ── Role picker ────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 mb-6" role="radiogroup" aria-label="Select your role">
            {roles.map((role) => {
              const isSelected = selectedRole === role.label;
              return (
                <button
                  key={role.label}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => navigate(`/login/${role.label === 'Reporter' ? 'reporter' : 'response-team'}`)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-marine focus:ring-offset-2
                    ${isSelected
                      ? 'border-[#e11d48] bg-[#fef2f2] shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="mb-2">{role.icon}</div>
                  <span className={`text-sm font-bold leading-tight text-center ${isSelected ? 'text-[#b91c1c]' : 'text-gray-700'}`}>
                    {role.label}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{role.subtitle}</span>
                </button>
              );
            })}
          </div>

          {/* ── Form ───────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.form && (
              <div className="p-3 bg-red-50 text-[#e11d48] text-sm rounded-lg border border-[#fca5a5]">
                {errors.form}
              </div>
            )}
            
            {/* Email */}
            <div>
              <div className={`relative flex items-center border rounded-lg transition-colors ${errors.email ? 'border-[#e11d48]' : 'border-gray-300 focus-within:border-marine'}`}>
                <svg className="absolute left-3 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                  className="w-full py-3 pl-11 pr-4 rounded-lg text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && <p id="email-error" className="text-[#e11d48] text-xs mt-1 ml-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className={`relative flex items-center border rounded-lg transition-colors ${errors.password ? 'border-[#e11d48]' : 'border-gray-300 focus-within:border-marine'}`}>
                <svg className="absolute left-3 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                  className="w-full py-3 pl-11 pr-11 rounded-lg text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-marine"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p id="password-error" className="text-[#e11d48] text-xs mt-1 ml-1">{errors.password}</p>}
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-marine focus:ring-marine cursor-pointer"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-[#b91c1c] font-medium hover:underline focus:outline-none focus:underline">
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-bold text-white text-base transition-all
                bg-[#991b1b] hover:bg-[#b91c1c] hover:shadow-lg
                focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:ring-offset-2
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  {isRegisterMode ? 'Create Account' : 'Log In'}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* ── Footer ─────────────────────────────────────── */}
          <div className="mt-6 flex flex-col items-center">
            <JollyRogerSmall className="opacity-40 mb-3" />
            <button 
              type="button"
              onClick={() => {
                if (!isRegisterMode && rolePath === 'response-team') {
                  navigate('/apply/response-team');
                } else {
                  setIsRegisterMode(!isRegisterMode);
                }
              }}
              className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 transition-colors rounded-lg p-3 w-full text-left"
            >
              <svg className="w-8 h-8 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {isRegisterMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                )}
              </svg>
              <div>
                <p className="text-sm font-bold text-gray-700">
                  {isRegisterMode ? 'Already have an account?' : 'New member?'}
                </p>
                <p className="text-xs text-gray-500">
                  {isRegisterMode 
                    ? 'Log in to Impel Down Command' 
                    : rolePath === 'response-team' 
                      ? 'Apply to join the Response Team'
                      : 'Create an account to get access'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
