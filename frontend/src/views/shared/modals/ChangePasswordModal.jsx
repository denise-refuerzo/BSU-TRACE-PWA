import React from 'react';
import { X, KeyRound } from 'lucide-react';

export default function ChangePasswordModal({
  isOpen,
  onClose,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  handleUpdatePassword
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden flex flex-col text-left animate-in zoom-in-95 duration-200">
        
        <div className="p-4 bg-neutral-900 text-white font-bold text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={16} />
            <span>Update Account Password</span>
          </div>
          <button onClick={onClose} className="hover:opacity-80 transition-opacity">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">Current Password</label>
            <input 
              type="password" 
              required 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-1 focus:ring-red-800 bg-neutral-50 font-bold text-neutral-800" 
            />
          </div>
          
          <div className="border-t border-neutral-100 my-4"></div>

          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">New Password</label>
            <input 
              type="password" 
              required 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-1 focus:ring-red-800 bg-neutral-50 font-bold text-neutral-800" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">Confirm New Password</label>
            <input 
              type="password" 
              required 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-1 focus:ring-red-800 bg-neutral-50 font-bold text-neutral-800" 
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-xl font-bold text-xs text-neutral-600 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-md uppercase tracking-wider transition-all"
            >
              Confirm Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}