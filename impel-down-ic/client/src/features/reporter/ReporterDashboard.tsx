import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Incident } from '../../services/api';
import { sse } from '../../services/sse';

const INCIDENT_LOCATION_MAP: Record<string, string> = {
  'Server Down / Network Outage': 'Network & Communication Center',
  'Security Incident / Unauthorized Activity': 'Security & Operations Zone',
  'Hazardous Material Leak / Chemical Exposure': 'Hazardous Materials Zone',
  'Unauthorized Access / Data Breach': 'Entry & Access Control',
  'Access Control / Authentication Failure': 'Entry & Access Control',
  'Infrastructure Failure / System Breach': 'Critical Infrastructure Zone',
  'Power Outage / Electrical Failure': 'Facilities & Utility Areas',
  'Fire / Major Safety Emergency': 'Facilities & Utility Areas',
  'Medical Emergency / Health Incident': 'Medical & Health Services',
  'Communication System Failure': 'Network & Communication Center',
  'Application / Database Failure': 'Server & Database Center',
  'Major Incident / Multiple System Failure': 'Entire Facility / Organization'
};

export default function ReporterDashboard() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // SSE Setup
  useEffect(() => {
    sse.connect();
    const handleUpdate = () => {
      qc.invalidateQueries({ queryKey: ['reporter-incidents'] });
      qc.invalidateQueries({ queryKey: ['reporter-stats'] });
    };
    sse.on('incident.created', handleUpdate);
    sse.on('incident.updated', handleUpdate);
    sse.on('incident.resolved', handleUpdate);
    return () => {
      sse.off('incident.created', handleUpdate);
      sse.off('incident.updated', handleUpdate);
      sse.off('incident.resolved', handleUpdate);
    };
  }, [qc]);

  // Data fetching
  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: api.getMeta
  });

  const { data: stats } = useQuery({
    queryKey: ['reporter-stats'],
    queryFn: api.getMyStats,
    refetchInterval: 30000
  });

  const { data: recentReports, isLoading: isReportsLoading } = useQuery({
    queryKey: ['reporter-incidents'],
    queryFn: () => api.getIncidents('active', { mine: '1', limit: '5' })
  });

  // Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<FileList | null>(null);

  const createMutation = useMutation({
    mutationFn: api.createIncident,
    onSuccess: () => {
      setTitle('');
      setLocation('');
      setCategory('');
      setOccurredAt('');
      setDescription('');
      setPhotos(null);
      qc.invalidateQueries({ queryKey: ['reporter-incidents'] });
      qc.invalidateQueries({ queryKey: ['reporter-stats'] });
      alert("Incident reported successfully!");
    },
    onError: (error) => {
      alert("Failed to report incident. " + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !category || !occurredAt) {
      alert("Please fill out all required fields.");
      return;
    }
    const formData = new FormData();
    formData.append('title', title);
    formData.append('location', location);
    formData.append('category', category);
    formData.append('occurredAt', new Date(occurredAt).toISOString());
    formData.append('description', description);
    formData.append('reporter', user?.name || 'Reporter');
    if (photos) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos.item(i);
        if (file) formData.append('photos', file);
      }
    }
    createMutation.mutate(formData);
  };

  const statusColor = (status: string, tier: number) => {
    if (status === 'RESOLVED') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'IN_PROGRESS') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (tier > 0) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };
  
  const statusLabel = (status: string, tier: number) => {
    if (status === 'RESOLVED') return 'Resolved';
    if (status === 'IN_PROGRESS') return 'In Progress';
    if (tier > 0) return 'Escalated';
    return 'Under Review';
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed font-sans text-gray-800 flex flex-col overflow-x-hidden relative"
      style={{ backgroundImage: 'url(/images/reporter_map_bg.png)' }}
    >
      <div className="absolute inset-0 bg-white/40 mix-blend-overlay pointer-events-none" />
      
      {/* Wave Footer container */}
      <div className="fixed bottom-0 left-0 w-full h-32 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute bottom-0 left-0 w-[200%] h-full bg-repeat-x bg-bottom opacity-70 animate-wave-slow"
          style={{ backgroundImage: 'url(/images/reporter/wave_back.svg)' }}
        />
        <div 
          className="absolute bottom-0 left-0 w-[200%] h-full bg-repeat-x bg-bottom opacity-80 animate-wave-medium"
          style={{ backgroundImage: 'url(/images/reporter/wave_mid.svg)' }}
        />
        <div 
          className="absolute bottom-0 left-0 w-[200%] h-full bg-repeat-x bg-bottom animate-wave-fast"
          style={{ backgroundImage: 'url(/images/reporter/wave_front.svg)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-[#b48c59]/30 p-4 px-8 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/images/reporter/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="font-pirata text-2xl text-[#1e3a8a] tracking-wider leading-none">IMPEL DOWN</h1>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Incident Command</span>
            </div>
          </div>
          
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                🔍
              </span>
              <input 
                type="text" 
                placeholder="Search incidents, stations, or updates..."
                className="w-full pl-12 pr-4 py-2 rounded-full bg-white/60 border border-[#b48c59]/40 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/50 placeholder-gray-400 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-600 hover:text-[#1e3a8a] transition-colors">
              🔔
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-3 border-l border-gray-300 pl-6">
              <img src="/images/reporter/avatar_reporter.png" alt="Avatar" className="h-10 w-10 rounded-full border-2 border-[#1e3a8a]" />
              <div className="text-sm font-bold text-gray-700">{user?.name}</div>
              <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-500 ml-2">
                ▼
              </button>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 pb-40">
          
          {/* Hero Banner */}
          <div className="relative rounded-[20px] overflow-hidden bg-white shadow-md mb-6 border border-[#b48c59]/30 flex min-h-[280px]">
            <img src="/images/straw_hats_bg.png" alt="Straw Hats" className="absolute inset-0 w-full h-full object-cover object-bottom" />
            
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-start px-6 md:px-8 pt-4 pb-2 text-center">
              <div className="max-w-xl font-serif drop-shadow-sm mt-0">
                <h1 className="text-xl md:text-3xl font-bold leading-tight mb-1">
                  <span className="text-[#0a194f]">Hey </span>
                  <span className="text-[#e11d48]">Reporter!</span>
                </h1>
                <div className="text-[#0a194f] text-xs md:text-sm font-bold mb-0.5">
                  See something? <span className="text-[#3b82f6]">Report it.</span>
                </div>
                <div className="text-[#0a194f] text-[10px] md:text-xs font-bold">
                  Together we make the seas (and stations) safer!
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-[#fef6e4] border border-[#b48c59]/40 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <img src="/images/reporter/icon_track_reports.png" className="w-12 h-12 object-contain" />
              <div>
                <div className="font-bold text-[#1e3a8a] text-lg">Track Reports</div>
                <div className="text-sm text-gray-600">View status updates</div>
              </div>
            </div>
            <div className="bg-[#e0f2fe] border border-[#b48c59]/40 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden">
              <img src="/images/reporter/icon_announcements.png" className="w-12 h-12 object-contain z-10" />
              <div className="z-10">
                <div className="font-bold text-[#1e3a8a] text-lg">Announcements</div>
                <div className="text-sm text-gray-600">MARINE news</div>
              </div>
              <img src="/images/reporter/seagull.png" className="absolute -right-4 -bottom-4 w-24 opacity-50 z-0" />
            </div>
            <div className="bg-[#ccfbf1] border border-[#b48c59]/40 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <img src="/images/reporter/icon_wheel.png" className="w-12 h-12 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
              <div>
                <div className="font-bold text-[#1e3a8a] text-lg">Need Help?</div>
                <div className="text-sm text-gray-600">Contact headquarters</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 h-full">
            
            {/* Left: Report Form */}
            <div className="flex-[45%] bg-[#fefdfb]/90 backdrop-blur-sm border border-[#b48c59]/50 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-[#b48c59]/20 pb-4">
                <img src="/images/reporter/form_hat.png" className="w-8 h-8 object-contain" />
                <h2 className="font-pirata text-3xl text-[#1e3a8a]">Report a New Incident</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Incident Title</label>
                  <input 
                    type="text" required value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full border border-gray-300 rounded bg-white p-2 text-sm focus:ring-2 focus:ring-[#1e3a8a]/30"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1">
                      <img src="/images/reporter/form_sign.svg" className="w-4 h-4" /> Type
                    </label>
                    <select 
                      required 
                      value={category} 
                      onChange={e => {
                        const newCat = e.target.value;
                        setCategory(newCat);
                        if (newCat && INCIDENT_LOCATION_MAP[newCat]) {
                          setLocation(INCIDENT_LOCATION_MAP[newCat]);
                        } else {
                          setLocation('');
                        }
                      }} 
                      className="w-full border border-gray-300 rounded bg-white p-2 text-sm focus:ring-2 focus:ring-[#1e3a8a]/30"
                    >
                      <option value="">Select Category</option>
                      {meta?.categories.map((c: string) => (
                        <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-[#1e3a8a] mb-1">
                      <img src="/images/reporter/form_map.svg" className="w-4 h-4" /> Location
                    </label>
                    <select 
                      required 
                      disabled={!category}
                      value={location} 
                      onChange={e => setLocation(e.target.value)} 
                      className="w-full border border-gray-300 rounded bg-white p-2 text-sm focus:ring-2 focus:ring-[#1e3a8a]/30 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">Select Location</option>
                      {(category && INCIDENT_LOCATION_MAP[category] 
                        ? [INCIDENT_LOCATION_MAP[category]] 
                        : meta?.locations || []
                      ).map((l: string) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#1e3a8a] mb-1">
                    <img src="/images/reporter/form_compass.svg" className="w-4 h-4" /> Date & Time
                  </label>
                  <input 
                    type="datetime-local" required value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
                    className="w-full border border-gray-300 rounded bg-white p-2 text-sm focus:ring-2 focus:ring-[#1e3a8a]/30"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#1e3a8a] mb-1">
                    <img src="/images/reporter/form_quill.svg" className="w-4 h-4" /> Details
                  </label>
                  <textarea 
                    rows={4} required value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Provide any additional context..."
                    className="w-full border border-gray-300 rounded bg-white p-2 text-sm focus:ring-2 focus:ring-[#1e3a8a]/30 resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#1e3a8a] mb-1">
                    <img src="/images/reporter/form_picture.svg" className="w-4 h-4" /> Attach Photos
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <input 
                      type="file" multiple accept="image/*"
                      onChange={e => setPhotos(e.target.files)}
                      className="hidden" id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer text-sm text-[#1e3a8a] font-semibold hover:underline">
                      Click to upload or drag and drop
                    </label>
                    <div className="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</div>
                    {photos && photos.length > 0 && (
                      <div className="mt-2 text-xs font-bold text-green-600">{photos.length} file(s) selected</div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" disabled={createMutation.isPending}
                  className="w-full bg-[#1e3a8a] hover:bg-[#152960] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md mt-4"
                >
                  <svg className="w-7 h-7" viewBox="0 0 64 64" fill="currentColor">
                    <defs>
                      <mask id="jolly-roger-mask">
                        <rect width="64" height="64" fill="white" />
                        <circle cx="40" cy="25" r="3" fill="black" />
                        <rect x="35" y="21" width="10" height="1.5" fill="black" />
                        <path d="M 37 21 A 3 3 0 0 1 43 21 Z" fill="black" />
                        <path d="M 35 29 L 45 21 M 45 29 L 35 21" stroke="black" strokeWidth="1.5" />
                      </mask>
                    </defs>
                    <path d="M 12 42 C 22 52, 42 52, 52 42 L 58 32 C 40 38, 24 38, 6 32 Z" />
                    <rect x="28" y="8" width="4" height="30" />
                    <path d="M 30 12 Q 52 12 52 24 Q 50 36 30 36 Z" mask="url(#jolly-roger-mask)" />
                    <circle cx="56" cy="32" r="3" />
                    <path d="M 53 29 L 59 35 M 53 35 L 59 29 M 56 27 L 56 37 M 51 32 L 61 32" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M 2 48 Q 10 42 18 48 T 34 48 T 50 48 T 66 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <path d="M -4 54 Q 4 48 12 54 T 28 54 T 44 54 T 60 54" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                  </svg>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Report'}
                </button>
              </form>
            </div>

            {/* Middle: Recent Reports */}
            <div className="flex-[35%] bg-[#fefdfb]/90 backdrop-blur-sm border border-[#b48c59]/50 rounded-2xl shadow-lg p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-[#b48c59]/20 pb-4">
                <div className="flex items-center gap-3">
                  <img src="/images/reporter/list_logbook.svg" className="w-8 h-8 object-contain" />
                  <h2 className="font-pirata text-3xl text-[#1e3a8a]">My Recent Reports</h2>
                </div>
                <button className="text-sm text-[#1e3a8a] font-bold hover:underline">View All</button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {isReportsLoading && <div className="text-center text-gray-500 py-8">Loading...</div>}
                {recentReports?.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                    <img src="/images/reporter/empty_bottle.svg" className="w-24 h-24 opacity-40 mb-4" />
                    <p className="font-medium text-lg">No reports yet.</p>
                    <p className="text-sm">When you report an incident, it will appear here.</p>
                  </div>
                )}
                {recentReports?.map((inc: Incident) => (
                  <div key={inc.id} className="bg-white border border-[#b48c59]/30 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={`/images/reporter/cat_${(inc.category || '').split('_')[0]?.toLowerCase() || ''}.png`} onError={(e) => e.currentTarget.src='/images/reporter/logo.png'} className="w-6 h-6 object-contain" />
                        <span className="font-bold text-[#1e3a8a] truncate max-w-[150px]">{inc.title}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold border ${statusColor(inc.status, inc.tier)}`}>
                        {statusLabel(inc.status, inc.tier)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between mt-3">
                      <span>{new Date(inc.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-medium text-gray-700">{inc.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex-[20%] flex flex-col gap-4">
              <div className="bg-[#fefdfb]/90 backdrop-blur-sm border border-[#b48c59]/50 rounded-2xl shadow-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <img src="/images/reporter/stat_anchor.svg" className="w-6 h-6" />
                  <h3 className="font-pirata text-2xl text-[#1e3a8a]">Quick Stats</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#e0f2fe] rounded-lg p-3 text-center border border-blue-200 shadow-sm relative overflow-hidden">
                    <img src="/images/reporter/stat_wanted.svg" className="absolute -right-2 -bottom-2 w-10 opacity-30" />
                    <div className="font-pirata text-4xl text-blue-700">{stats?.myReports || 0}</div>
                    <div className="text-xs font-bold text-blue-900 mt-1 uppercase">My Reports</div>
                  </div>
                  <div className="bg-[#ffedd5] rounded-lg p-3 text-center border border-orange-200 shadow-sm relative overflow-hidden">
                    <img src="/images/reporter/stat_compass.svg" className="absolute -right-2 -bottom-2 w-10 opacity-30" />
                    <div className="font-pirata text-4xl text-orange-700">{stats?.inProgress || 0}</div>
                    <div className="text-xs font-bold text-orange-900 mt-1 uppercase">In Progress</div>
                  </div>
                  <div className="bg-[#dcfce7] rounded-lg p-3 text-center border border-green-200 shadow-sm relative overflow-hidden">
                    <img src="/images/reporter/stat_flag_green.svg" className="absolute -right-2 -bottom-2 w-10 opacity-30" />
                    <div className="font-pirata text-4xl text-green-700">{stats?.resolved || 0}</div>
                    <div className="text-xs font-bold text-green-900 mt-1 uppercase">Resolved</div>
                  </div>
                  <div className="bg-[#ffe4e6] rounded-lg p-3 text-center border border-red-200 shadow-sm relative overflow-hidden">
                    <img src="/images/reporter/stat_flag_red.svg" className="absolute -right-2 -bottom-2 w-10 opacity-30" />
                    <div className="font-pirata text-4xl text-red-700">{stats?.needAction || 0}</div>
                    <div className="text-xs font-bold text-red-900 mt-1 uppercase">Need Action</div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 rounded-2xl flex items-center justify-center p-4">
                <img src="/images/reporter/stat_ship.svg" className="w-full max-w-[200px] object-contain drop-shadow-xl" />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
