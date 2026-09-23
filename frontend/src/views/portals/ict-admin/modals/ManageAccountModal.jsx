import { publicReference } from '../../../../utils/publicReference';

export default function ManageAccountModal({ 
  selectedUser, setSelectedUser, handleUpdateAccount, offices, departments
}) {
  // Mirrors the original conditional rendering: {selectedUser && (...)}
  if (!selectedUser) return null;
  const officialEmailPattern = '[A-Za-z0-9._%+\\-]+@g\\.batstate-u\\.edu\\.ph';
  const normalizeEmail = value => String(value || '').trim().toLowerCase();
  const originalEmail = selectedUser._originalUniEmail ?? selectedUser.uni_email;
  const originalIsOfficial = /^[a-z0-9._%+-]+@g\.batstate-u\.edu\.ph$/i.test(normalizeEmail(originalEmail));
  const emailWasChanged = normalizeEmail(selectedUser.uni_email) !== normalizeEmail(originalEmail);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-neutral-200 max-w-lg w-full rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-neutral-100 pb-3 mb-4">
          <div>
            <h3 className="text-base font-black text-neutral-900">Manage Operational Profile</h3>
            <p className="text-[11px] text-gray-400">Account reference: {publicReference('USR', selectedUser.u_id)}</p>
          </div>
          <button type="button" onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-neutral-800 text-lg p-1 cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleUpdateAccount} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1 tracking-wider text-red-800 font-black">System Username Identifier</label>
            <input 
              type="text" required value={selectedUser.username}
              onChange={e => setSelectedUser({...selectedUser, username: e.target.value.trim()})}
              className="w-full border-2 border-red-50 bg-white font-mono font-bold text-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Personnel Full Name</label>
            <input 
              type="text" required value={selectedUser.full_name}
              onChange={e => setSelectedUser({...selectedUser, full_name: e.target.value})}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Institutional Notification Email</label>
            <input 
              type="email" required pattern={originalIsOfficial || emailWasChanged ? officialEmailPattern : undefined} title="Use an official email ending in @g.batstate-u.edu.ph" value={selectedUser.uni_email}
              onChange={e => setSelectedUser({...selectedUser, uni_email: e.target.value.toLowerCase()})}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none"
            />
            {!originalIsOfficial && !emailWasChanged && <p className="mt-1 text-[10px] font-normal text-amber-700">This existing address can remain unchanged. A new address must end in @g.batstate-u.edu.ph.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">System Privilege Level</label>
              <select 
                value={selectedUser.a_id}
                onChange={e => setSelectedUser({...selectedUser, a_id: parseInt(e.target.value)})}
                className="w-full border border-neutral-300 bg-white rounded-lg px-2 py-2 outline-none"
              >
                <option value="1">Faculty Staff</option>
                <option value="2">Office Staff</option>
                <option value="4">GSO Admin</option>
                <option value="5">ICT Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Department {selectedUser.a_id === 1 ? '(Required)' : '(Optional)'}</label>
              <select 
                value={selectedUser.d_id || ''}
                required={selectedUser.a_id === 1}
                onChange={e => setSelectedUser({...selectedUser, d_id: e.target.value ? parseInt(e.target.value) : null})}
                className="w-full border border-neutral-300 bg-white rounded-lg px-2 py-2 outline-none"
              >
                <option value="">{selectedUser.a_id === 1 ? 'Choose a department' : 'No department affiliation'}</option>
                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
          </div>

          {(selectedUser.a_id === 2 || selectedUser.a_id === 3 || selectedUser.a_id === 4) && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <label className="block text-[10px] uppercase text-red-800 font-black mb-1">Assigned Branch Destination Office Block</label>
              
              {selectedUser.a_id === 4 ? (
                <div className="w-full border border-red-200 bg-white rounded-lg px-2 py-2 font-bold text-red-800 flex items-center justify-between">
                  <span>{offices.find(o => /general services|\bgso\b/i.test(o.name))?.name || 'General Services'}</span>
                  <span className="text-[9px] bg-red-100 px-1.5 py-0.5 rounded tracking-wider">Locked</span>
                </div>
              ) : (
                <select 
                  required value={selectedUser.o_id || ''}
                  onChange={e => setSelectedUser({...selectedUser, o_id: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full border border-neutral-300 bg-white rounded-lg px-2 py-2 font-bold outline-none text-neutral-700"
                >
                  <option value="">-- No Location Assigned --</option>
                  {offices
                    .filter(off => !/general services|\bgso\b/i.test(off.name))
                    .map((off) => (
                    <option key={off.id} value={off.id}>{off.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 🔒 READ-ONLY ZERO KNOWLEDGE 2FA AUDIT SHEET */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
            <label className="block text-[10px] uppercase text-gray-400 font-bold mb-2 tracking-wider">Multi-Factor Authentication Status Audit</label>
            {selectedUser.two_fa_enabled ? (
              <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/60 p-2.5 rounded-lg flex items-center gap-2">
                <span>🔒</span>
                <div>
                  <p className="leading-tight">MFA Protection Enforced</p>
                  <p className="text-[9px] text-emerald-600 font-normal mt-0.5">Cryptographic zero-knowledge lock active. Status cannot be modified by administrators.</p>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-amber-800 font-bold bg-amber-50 border border-amber-200/60 p-2.5 rounded-lg flex items-center gap-2">
                <span>⚠️</span>
                <div>
                  <p className="leading-tight">MFA Protection Inactive</p>
                  <p className="text-[9px] text-amber-600 font-normal mt-0.5">This profile has not activated secondary login verification keys yet.</p>
                </div>
              </div>
            )}
          </div>

          {/* 🟢 NEW SOFT DEACTIVATION MANAGED SYSTEM TOGGLE ELEMENT */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-neutral-700 select-none">Account Access Status</label>
              <p className="text-[10px] text-gray-400 font-normal leading-tight mt-0.5">Deactivating suspends profile login privileges without bricking core historical logs tracking links.</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active })}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all shadow-xs cursor-pointer ${
                selectedUser.is_active || selectedUser.is_active === undefined
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300' 
                  : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
              }`}
            >
              {selectedUser.is_active || selectedUser.is_active === undefined ? "🟢 Active" : "🔴 Suspended"}
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button type="button" onClick={() => setSelectedUser(null)} className="px-4 py-2 border text-gray-500 rounded-lg hover:bg-neutral-50 font-bold transition-all">CANCEL</button>
            <button type="submit" className="px-5 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 font-bold transition-all">SAVE OVERRIDES</button>
          </div>
        </form>
      </div>
    </div>
  );
}
