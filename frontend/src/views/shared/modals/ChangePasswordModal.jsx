import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

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
  // --- Visibility States for each field ---
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const onFormSubmit = (e) => {
    e.preventDefault();

    // Prevent reusing the exact same password
    if (currentPassword === newPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Password',
        text: 'New password must be different from your current password.',
        confirmButtonColor: '#991b1b' // Matches your red-800 theme
      });
      return;
    }

    // Regex: At least one uppercase letter and at least one number
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;

    if (!passwordRegex.test(newPassword)) {
      Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Password must contain at least one uppercase letter and one number.',
        confirmButtonColor: '#991b1b'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Mismatch',
        text: 'New password and confirm password do not match.',
        confirmButtonColor: '#991b1b'
      });
      return;
    }

    // If validation passes, execute the parent's handler
    handleUpdatePassword(e);
  };

  // Reset local states when closing
  const handleClose = () => {
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden flex flex-col text-left animate-in zoom-in-95 duration-200">
        
        <div className="p-4 bg-neutral-900 text-white font-bold text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={16} />
            <span>Update Account Password</span>
          </div>
          <button onClick={handleClose} className="hover:opacity-80 transition-opacity cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onFormSubmit} className="p-6 space-y-4">
          
          {/* Current Password Field */}
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">Current Password</label>
            <div className="relative flex items-center">
              <input 
                type={showCurrent ? "text" : "password"} 
                required 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                className="w-full px-4 pr-10 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-1 focus:ring-red-800 bg-neutral-50 font-bold text-neutral-800" 
              />
              <button 
                type="button" 
                onClick={() => setShowCurrent(!showCurrent)} 
                className="absolute right-3 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div className="border-t border-neutral-100 my-4"></div>

          {/* New Password Field */}
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">New Password</label>
            <div className="relative flex items-center">
              <input 
                type={showNew ? "text" : "password"} 
                required 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full px-4 pr-10 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-1 focus:ring-red-800 bg-neutral-50 font-bold text-neutral-800" 
              />
              <button 
                type="button" 
                onClick={() => setShowNew(!showNew)} 
                className="absolute right-3 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password Field */}
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">Confirm New Password</label>
            <div className="relative flex items-center">
              <input 
                type={showConfirm ? "text" : "password"} 
                required 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full px-4 pr-10 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-1 focus:ring-red-800 bg-neutral-50 font-bold text-neutral-800" 
              />
              <button 
                type="button" 
                onClick={() => setShowConfirm(!showConfirm)} 
                className="absolute right-3 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={handleClose} 
              className="px-5 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-xl font-bold text-xs text-neutral-600 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-md uppercase tracking-wider transition-all cursor-pointer"
            >
              Confirm Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}