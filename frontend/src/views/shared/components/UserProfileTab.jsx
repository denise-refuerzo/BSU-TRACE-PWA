import React from 'react';
import { Camera, Building, User, ShieldCheck, Landmark } from 'lucide-react';

export default function UserProfileTab({
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  facultyId,
  officeName,
  twoFaEnabled,
  toggle2FA,
  handleUpdateProfile,
  setShowPassModal
}) {
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-in fade-in duration-200">
      {/* Header Profile Banner */}
      <div className="lg:col-span-3 bg-white border border-neutral-200 p-6 rounded-2xl flex items-center gap-6 shadow-sm">
        <div className="relative">
          <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 border-neutral-100 shadow-sm" />
          <div className="absolute -bottom-1 -right-1 bg-red-800 p-1.5 rounded-lg text-white shadow-md cursor-pointer">
            <Camera size={14} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-neutral-900">{profileName || 'Portal User'}</h3>
            <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-100 rounded text-[9px] font-black uppercase tracking-wider">Authority</span>
          </div>
          <p className="text-xs text-neutral-400 font-bold flex items-center gap-1.5">
            <Building size={12} /> Unit Sector • {officeName}
          </p>
          <p className="text-xs text-green-600 font-bold flex items-center gap-1 mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Security Seal Status: Active
          </p>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {/* Personal Information Form */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
            <User size={16} className="text-red-800" />
            <h4 className="text-xs uppercase font-black text-neutral-900 tracking-wider">Personal Information & Recovery Settings</h4>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">Full Authority Name</label>
                <input type="text" required value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none bg-neutral-50 font-bold text-neutral-800" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">System Recovery Email Address</label>
                <input type="email" required value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none bg-neutral-50 font-bold text-neutral-800" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl uppercase tracking-wide transition-all shadow-sm">Save Profiles Changes</button>
            </div>
          </form>
        </div>

        {/* Security Protocols */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-2">
            <ShieldCheck size={16} className="text-red-800" />
            <h4 className="text-xs uppercase font-black text-neutral-900 tracking-wider">Account Security Protocols</h4>
          </div>
          
          <div className="border border-neutral-200 rounded-xl p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
            <div>
              <h5 className="text-xs font-black text-neutral-900">Change Account Password</h5>
              <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">Update your administrative account passcode credentials regularly.</p>
            </div>
            <button onClick={() => setShowPassModal(true)} className="text-xs font-black text-red-800 hover:underline">Update</button>
          </div>

          <div className="border border-neutral-200 rounded-xl p-4 flex flex-col gap-4 hover:bg-neutral-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-black text-neutral-900">Secondary Two-Factor Authentication PIN</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">Enforce secondary multi-factor challenge prompt criteria upon account entry checkpoints.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={twoFaEnabled} onChange={e => toggle2FA(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-800"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Institutional Data Panel */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
            <Landmark size={16} className="text-neutral-500" />
            <h4 className="text-xs uppercase font-black text-neutral-900 tracking-wider">Institutional Data Placement</h4>
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wide block">Authority Faculty Identifier</span>
              <p className="font-black text-neutral-900 text-sm mt-0.5">{facultyId}</p>
            </div>
            <div>
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wide block">Campus Assigned Terminal Branch Unit</span>
              <p className="font-bold text-neutral-700 mt-0.5">{officeName}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50/40 border border-red-100 rounded-2xl p-4 text-[11px] leading-relaxed text-neutral-500 font-medium">
          ℹ️ <span className="font-bold text-neutral-800">Note:</span> Maintaining institutional profile bindings and role configurations falls under the jurisdiction of the University Central Registry Database console. Contact <span className="text-red-800 font-bold hover:underline">Campus IT Support</span> for configuration adjustments.
        </div>
      </div>
    </div>
  );
}