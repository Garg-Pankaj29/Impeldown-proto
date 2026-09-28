import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Skills options ──────────────────────────────────────────── */
const SKILL_OPTIONS = [
  'Investigation & Analysis',
  'Communication',
  'Coordination',
  'Field Support',
  'Technical Support',
  'Report Documentation',
];

const AVAILABILITY_OPTIONS = [
  'Full-time',
  'Part-time',
  'On-call',
  'Weekends only',
  'Flexible',
];

const ZONE_OPTIONS = [
  'Network & Communication Center',
  'Security & Operations Zone',
  'Hazardous Materials Zone',
  'Entry & Access Control',
  'Critical Infrastructure Zone',
  'Medical & Health Services',
  'Central Command',
  'Server & Database Center',
  'Administration & Management',
  'External / Perimeter Zone',
  'Facilities & Utility Areas',
  'Any Zone',
];

const DEPARTMENT_OPTIONS = [
  'Security Division',
  'Medical Corps',
  'Engineering & Infrastructure',
  'Communications & Intelligence',
  'Field Operations',
  'Administrative Support',
  'Emergency Response',
  'IT & Systems',
];

/* ── Ship Wheel Logo ─────────────────────────────────────────── */
function ShipWheelLogo() {
  return (
    <img
      src="/images/logo.png"
      alt="Impel Down Incident Command"
      className="w-12 h-12 object-contain drop-shadow-md"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   APPLY FOR RESPONSE TEAM PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function ApplyResponseTeam() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ── Form state ───────────────────────────────────────────── */
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [preferredZone, setPreferredZone] = useState('');
  const [motivation, setMotivation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Pause video when hidden ──────────────────────────────── */
  useEffect(() => {
    const handleVisibility = () => {
      if (!videoRef.current) return;
      if (document.hidden) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Toggle skill ─────────────────────────────────────────── */
  const toggleSkill = (skill: string) => {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  /* ── Validate ─────────────────────────────────────────────── */
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (!studentId.trim()) errs.studentId = 'ID is required';
    if (!department) errs.department = 'Select a department';
    if (!contactNumber.trim()) errs.contactNumber = 'Contact number is required';
    if (skills.length === 0) errs.skills = 'Select at least one skill';
    if (!availability) errs.availability = 'Select availability';
    if (!preferredZone) errs.preferredZone = 'Select a zone';
    if (!motivation.trim()) errs.motivation = 'This field is required';
    else if (motivation.length < 20) errs.motivation = 'Minimum 20 characters';
    if (!confirmed) errs.confirmed = 'You must confirm';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ── Submit ───────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    // Simulate API call (no backend endpoint yet)
    await new Promise(r => setTimeout(r, 1500));

    setSubmitted(true);
    setIsSubmitting(false);
  }

  /* ── Success state ────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
        {!prefersReduced && (
          <video ref={videoRef} autoPlay muted loop playsInline preload="auto"
            poster="/images/login_poster.png"
            className="fixed inset-0 w-full h-full object-cover z-0">
            <source src="/videos/login_bg_animation.mp4?v=3" type="video/mp4" />
          </video>
        )}
        {prefersReduced && (
          <div className="fixed inset-0 w-full h-full bg-cover bg-center z-0"
            style={{ backgroundImage: 'url(/images/login_poster.png)' }} />
        )}
        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-12 max-w-lg w-full mx-4 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="font-pirata text-3xl text-[#1e3a8a] mb-3">Application Submitted!</h2>
          <p className="text-gray-600 mb-2">Your application to join the Response Team has been received.</p>
          <p className="text-gray-500 text-sm mb-8">Our administrators will review your application and get back to you via email.</p>
          <button
            onClick={() => navigate('/login/response-team')}
            className="bg-[#991b1b] hover:bg-[#b91c1c] text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* ── Background ──────────────────────────────────────── */}
      {!prefersReduced && (
        <video ref={videoRef} autoPlay muted loop playsInline preload="auto"
          poster="/images/login_poster.png"
          className="fixed inset-0 w-full h-full object-cover z-0"
          onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}>
          <source src="/videos/login_bg_animation.mp4?v=3" type="video/mp4" />
        </video>
      )}
      {prefersReduced && (
        <div className="fixed inset-0 w-full h-full bg-cover bg-center z-0"
          style={{ backgroundImage: 'url(/images/login_poster.png)' }} />
      )}

      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header className="relative z-10 bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/login')}>
          <ShipWheelLogo />
          <div>
            <h1 className="font-serif font-black text-xl tracking-[0.08em] text-[#0f172a] leading-none">IMPEL DOWN</h1>
            <p className="text-[10px] text-[#1e3a8a] tracking-[0.3em] font-bold uppercase">Incident Command</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input type="text" readOnly placeholder="Search incidents, stations, or updates..."
              className="bg-gray-100 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-500 w-72 cursor-default" />
          </div>
          <div className="relative">
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-[#e11d48] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">3</span>
          </div>
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow">G</div>
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">Guest User</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex">
        {/* ── Left Panel ─────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col w-[380px] flex-shrink-0 relative overflow-hidden">
          {/* Parchment overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#f5e6c8]/85 via-[#f5e6c8]/75 to-[#f5e6c8]/60 backdrop-blur-[2px] z-10" />
          <div className="relative z-20 flex flex-col h-full p-8 pt-12">
            <div className="mb-8">
              <h2 className="font-pirata text-[2.5rem] text-[#1e3a8a] leading-tight tracking-wide mb-4">
                Apply for<br/>Response Team
              </h2>
              <p className="text-gray-700 text-sm leading-relaxed">
                Join the response team and help keep the seas and stations safe by investigating and resolving incidents together.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-5 mt-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[#1e3a8a] text-sm">Respond</h4>
                  <p className="text-gray-600 text-xs">Take action on assigned incidents</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[#1e3a8a] text-sm">Collaborate</h4>
                  <p className="text-gray-600 text-xs">Work with dedicated teams</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[#1e3a8a] text-sm">Make a Difference</h4>
                  <p className="text-gray-600 text-xs">Ensure safer and smoother operations at Impel Down</p>
                </div>
              </div>
            </div>

            {/* Marine badge at bottom */}
            <div className="mt-auto pt-8 flex items-center justify-center">
              <div className="bg-[#1e3a8a]/10 rounded-xl px-6 py-3 flex items-center gap-3 border border-[#1e3a8a]/20">
                <img src="/images/response_team_icon.png" alt="Marine" className="w-10 h-10 object-contain" />
                <span className="font-pirata text-lg text-[#1e3a8a] tracking-wider">MARINE</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Form Panel ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-8 px-6 md:px-12">
          <form onSubmit={handleSubmit} noValidate className="max-w-[820px] mx-auto">
            {/* Form Header */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden">
              {/* Scroll / parchment header decoration */}
              <div className="bg-gradient-to-r from-[#f5e6c8] to-[#ede0cc] px-8 py-6 border-b border-[#d4b88c]/40 flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1e3a8a]/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#1e3a8a]/20">
                  <svg className="w-6 h-6 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-pirata text-2xl text-[#1e3a8a] tracking-wide">Response Team Application</h1>
                  <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                    Fill in the details below to apply for the Response Team. Our administrators will review your application and get back to you.
                  </p>
                </div>
              </div>

              {/* ────────── Section 1: Personal Info ──────────── */}
              <div className="px-8 pt-7 pb-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 bg-[#1e3a8a]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-800 text-base">1. Personal Information</h2>
                </div>

                {/* Row 1: Name, Email, ID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Full Name <span className="text-[#e11d48]">*</span>
                    </label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      <input type="text" placeholder="Enter your full name" value={fullName}
                        onChange={e => { setFullName(e.target.value); if (errors.fullName) setErrors(p => ({ ...p, fullName: '' })); }}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors ${errors.fullName ? 'border-[#e11d48]' : 'border-gray-300'}`} />
                    </div>
                    {errors.fullName && <p className="text-[#e11d48] text-xs mt-1">{errors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Email Address <span className="text-[#e11d48]">*</span>
                    </label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                      <input type="email" placeholder="Enter your email" value={email}
                        onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors ${errors.email ? 'border-[#e11d48]' : 'border-gray-300'}`} />
                    </div>
                    {errors.email && <p className="text-[#e11d48] text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Student ID / Employee ID <span className="text-[#e11d48]">*</span>
                    </label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
                      </svg>
                      <input type="text" placeholder="Enter your ID" value={studentId}
                        onChange={e => { setStudentId(e.target.value); if (errors.studentId) setErrors(p => ({ ...p, studentId: '' })); }}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors ${errors.studentId ? 'border-[#e11d48]' : 'border-gray-300'}`} />
                    </div>
                    {errors.studentId && <p className="text-[#e11d48] text-xs mt-1">{errors.studentId}</p>}
                  </div>
                </div>

                {/* Row 2: Department, Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Department / Team <span className="text-[#e11d48]">*</span>
                    </label>
                    <select value={department}
                      onChange={e => { setDepartment(e.target.value); if (errors.department) setErrors(p => ({ ...p, department: '' })); }}
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-10 ${errors.department ? 'border-[#e11d48]' : 'border-gray-300'} ${!department ? 'text-gray-400' : 'text-gray-800'}`}>
                      <option value="" disabled>Select department</option>
                      {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.department && <p className="text-[#e11d48] text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Contact Number <span className="text-[#e11d48]">*</span>
                    </label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                      </svg>
                      <input type="tel" placeholder="Enter your contact number" value={contactNumber}
                        onChange={e => { setContactNumber(e.target.value); if (errors.contactNumber) setErrors(p => ({ ...p, contactNumber: '' })); }}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors ${errors.contactNumber ? 'border-[#e11d48]' : 'border-gray-300'}`} />
                    </div>
                    {errors.contactNumber && <p className="text-[#e11d48] text-xs mt-1">{errors.contactNumber}</p>}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-8 border-t border-gray-200" />

              {/* ────────── Section 2: Skills & Availability ──── */}
              <div className="px-8 pt-6 pb-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 bg-[#1e3a8a]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-800 text-base">2. Skills & Availability</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Skills checkboxes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Relevant Skills (Select all that apply) <span className="text-[#e11d48]">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {SKILL_OPTIONS.map(skill => (
                        <label key={skill} className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={skills.includes(skill)}
                            onChange={() => { toggleSkill(skill); if (errors.skills) setErrors(p => ({ ...p, skills: '' })); }}
                            className="w-4 h-4 rounded border-gray-300 text-[#1e3a8a] focus:ring-[#1e3a8a]/30 cursor-pointer" />
                          <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{skill}</span>
                        </label>
                      ))}
                    </div>
                    {errors.skills && <p className="text-[#e11d48] text-xs mt-2">{errors.skills}</p>}
                  </div>

                  {/* Availability + Zone */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Availability <span className="text-[#e11d48]">*</span>
                      </label>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        <select value={availability}
                          onChange={e => { setAvailability(e.target.value); if (errors.availability) setErrors(p => ({ ...p, availability: '' })); }}
                          className={`w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat ${errors.availability ? 'border-[#e11d48]' : 'border-gray-300'} ${!availability ? 'text-gray-400' : 'text-gray-800'}`}>
                          <option value="" disabled>Select availability</option>
                          {AVAILABILITY_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      {errors.availability && <p className="text-[#e11d48] text-xs mt-1">{errors.availability}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Preferred Zone / Location <span className="text-[#e11d48]">*</span>
                      </label>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        <select value={preferredZone}
                          onChange={e => { setPreferredZone(e.target.value); if (errors.preferredZone) setErrors(p => ({ ...p, preferredZone: '' })); }}
                          className={`w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat ${errors.preferredZone ? 'border-[#e11d48]' : 'border-gray-300'} ${!preferredZone ? 'text-gray-400' : 'text-gray-800'}`}>
                          <option value="" disabled>Select zone / location</option>
                          {ZONE_OPTIONS.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                      {errors.preferredZone && <p className="text-[#e11d48] text-xs mt-1">{errors.preferredZone}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-8 border-t border-gray-200" />

              {/* ────────── Section 3: Motivation ─────────────── */}
              <div className="px-8 pt-6 pb-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 bg-[#1e3a8a]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1e3a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-800 text-base">3. Motivation</h2>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Why do you want to join the Response Team? <span className="text-[#e11d48]">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      maxLength={300}
                      placeholder="Write a short answer..."
                      value={motivation}
                      onChange={e => { setMotivation(e.target.value); if (errors.motivation) setErrors(p => ({ ...p, motivation: '' })); }}
                      className={`w-full px-4 py-3 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors resize-none ${errors.motivation ? 'border-[#e11d48]' : 'border-gray-300'}`}
                    />
                    <span className="absolute bottom-2 right-3 text-xs text-gray-400">{motivation.length}/300</span>
                  </div>
                  {errors.motivation && <p className="text-[#e11d48] text-xs mt-1">{errors.motivation}</p>}
                </div>
              </div>

              {/* ────────── Footer: Confirm + Actions ─────────── */}
              <div className="px-8 py-5 bg-gray-50/80 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input type="checkbox" checked={confirmed}
                    onChange={e => { setConfirmed(e.target.checked); if (errors.confirmed) setErrors(p => ({ ...p, confirmed: '' })); }}
                    className="w-4 h-4 rounded border-gray-300 text-[#1e3a8a] focus:ring-[#1e3a8a]/30 cursor-pointer mt-0.5" />
                  <span className={`text-xs leading-relaxed ${errors.confirmed ? 'text-[#e11d48]' : 'text-gray-600'}`}>
                    I confirm that the information provided is correct to the best of my knowledge.
                  </span>
                </label>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/login/response-team')}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#991b1b] hover:bg-[#b91c1c] text-white font-bold text-sm py-2.5 px-6 rounded-lg transition-all
                      flex items-center gap-2 shadow-md hover:shadow-lg
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <img src="/images/response_team_icon.png" alt="" className="w-5 h-5 object-contain" />
                    )}
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
