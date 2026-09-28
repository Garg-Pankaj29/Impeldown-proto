import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth';

export default function ApplyResponseTeamPage() {
  const navigate = useNavigate();
  const registerResponder = useAuthStore((s) => s.registerResponder);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    teamId: '',
    contactNumber: '',
    skills: {
      investigation: false,
      communication: false,
      coordination: false,
      fieldSupport: false,
      technicalSupport: false,
      reportDocumentation: false,
    },
    availability: '',
    location: '',
    motivation: '',
    confirm: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckboxChange = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: { ...prev.skills, [skill as keyof typeof prev.skills]: !prev.skills[skill as keyof typeof prev.skills] },
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.confirm) {
      setError('You must confirm the information is correct.');
      return;
    }
    
    // Select selected skills as array of strings
    const selectedSkills = Object.entries(formData.skills)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    try {
      setIsLoading(true);
      setError(null);
      await registerResponder({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        teamId: formData.teamId,
        skills: selectedSkills,
        availability: formData.availability,
        location: formData.location,
        contactNumber: formData.contactNumber,
        motivation: formData.motivation
      });
      // Redirect to response team dashboard after successful registration
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Application failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center p-4 md:p-8"
      style={{ backgroundImage: 'url(/images/apply_bg.jpg)' }}
    >
      <div className="max-w-6xl w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Sidebar (Transparent-ish, showcasing background) */}
        <div className="md:w-5/12 p-8 md:p-12 relative flex flex-col" style={{ background: 'linear-gradient(to right, rgba(253,248,241,0.9), rgba(253,248,241,0.8))' }}>
          
          <div className="flex items-center gap-3 mb-10">
            {/* Simple logo fallback if image not present */}
            <div className="w-10 h-10 bg-marine rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-marine leading-none">IMPEL DOWN</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Incident Command</p>
            </div>
          </div>

          <h2 className="text-4xl font-black text-marine mb-4 font-serif">Apply for<br/>Response Team</h2>
          <p className="text-gray-700 mb-10 leading-relaxed">
            Join the response team and help keep the seas and stations safe by investigating and resolving incidents together.
          </p>

          <div className="space-y-8 flex-1">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-marine mb-1">Respond</h3>
                <p className="text-sm text-gray-600">Take action on assigned incidents</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-marine mb-1">Collaborate</h3>
                <p className="text-sm text-gray-600">Work with dedicated teams</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-marine mb-1">Make a Difference</h3>
                <p className="text-sm text-gray-600">Ensure safer and smoother operations at Impel Down</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="md:w-7/12 bg-white p-8 md:p-10 lg:p-12 h-[90vh] overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <svg className="w-8 h-8 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Response Team Application
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Fill in the details below to apply for the Response Team. Our administrators will review your application and get back to you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* Section 1 */}
            <div className="bg-[#f8f9fa] rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-marine mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                1. Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="Enter your full name" 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-marine outline-none"
                    value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input required type="email" placeholder="Enter your email" 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-marine outline-none"
                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <input required type="password" placeholder="Create a password" 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-marine outline-none"
                    value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="Enter your contact number" 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-marine outline-none"
                    value={formData.contactNumber} onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Department / Team <span className="text-red-500">*</span></label>
                  <select required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-marine outline-none bg-white"
                    value={formData.teamId} onChange={(e) => setFormData({...formData, teamId: e.target.value})}>
                    <option value="">Select department</option>
                    <option value="1">Jailer Beasts</option>
                    <option value="2">Demon Guards</option>
                    <option value="3">Buster Call Fleet</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-[#fffdf2] rounded-xl p-6 border border-amber-100">
              <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.492-3.053 5.084-5.084m-2.792 14.3l1.406-1.406a1.5 1.5 0 000-2.122l-3.659-3.659m-1.875 9.875l-1.406 1.406a1.5 1.5 0 01-2.122 0l-3.659-3.659m9.875-1.875l-3.053 2.492-5.084 5.084m0 0L3 21m0 0l5.877-5.877M3 21l1.406-1.406a1.5 1.5 0 012.122 0l3.659 3.659M3 21h0" />
                </svg>
                2. Skills & Availability
              </h3>
              
              <div className="mb-5">
                <label className="block text-xs font-bold text-amber-900 mb-2">Relevant Skills (Select all that apply) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'investigation', label: 'Investigation & Analysis' },
                    { id: 'communication', label: 'Communication' },
                    { id: 'coordination', label: 'Coordination' },
                    { id: 'fieldSupport', label: 'Field Support' },
                    { id: 'technicalSupport', label: 'Technical Support' },
                    { id: 'reportDocumentation', label: 'Report Documentation' }
                  ].map((skill) => (
                    <label key={skill.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-marine focus:ring-marine"
                        checked={formData.skills[skill.id as keyof typeof formData.skills]}
                        onChange={() => handleCheckboxChange(skill.id)} />
                      <span className="text-sm text-gray-700">{skill.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">Availability <span className="text-red-500">*</span></label>
                  <select required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-marine outline-none bg-white"
                    value={formData.availability} onChange={(e) => setFormData({...formData, availability: e.target.value})}>
                    <option value="">Select availability</option>
                    <option value="Day Shift">Day Shift</option>
                    <option value="Night Shift">Night Shift</option>
                    <option value="On Call">On Call 24/7</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">Preferred Zone / Location <span className="text-red-500">*</span></label>
                  <select required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-marine outline-none bg-white"
                    value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}>
                    <option value="">Select zone / location</option>
                    <option value="Surface">Surface Levels</option>
                    <option value="Underground">Underground Levels</option>
                    <option value="Any">Any Location</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-[#f0f9ff] rounded-xl p-6 border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.147l-2.83.942a.75.75 0 01-.95-.95l.942-2.83a4.5 4.5 0 011.147-1.89l13.633-13.633z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
                </svg>
                3. Motivation
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">Why do you want to join the Response Team? <span className="text-red-500">*</span></label>
                <div className="relative">
                  <textarea required placeholder="Write a short answer..." rows={4}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-marine outline-none resize-none"
                    value={formData.motivation} onChange={(e) => setFormData({...formData, motivation: e.target.value})}
                  />
                  <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                    {formData.motivation.length}/300
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="confirm" required className="w-4 h-4 rounded border-gray-300 text-marine focus:ring-marine"
                checked={formData.confirm} onChange={(e) => setFormData({...formData, confirm: e.target.checked})} />
              <label htmlFor="confirm" className="text-sm text-gray-600 cursor-pointer">
                I confirm that the information provided is correct to the best of my knowledge.
              </label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => navigate('/login/response-team')}
                className="px-6 py-2.5 rounded-lg font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className="px-6 py-2.5 rounded-lg font-bold text-white bg-[#b91c1c] hover:bg-[#991b1b] shadow-md transition-all flex items-center gap-2">
                {isLoading ? 'Submitting...' : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
