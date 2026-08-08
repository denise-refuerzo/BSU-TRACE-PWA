import React from 'react';

export default function AccountManagementTab({
  activeTab, setActiveTab, searchTerm, setSearchTerm, roleFilter, setRoleFilter,
  filteredAccounts, setSelectedUser, message, form, setForm, handleCreateAccount, offices
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h2 className="text-2xl font-bold tracking-tight">Account Management</h2>
        <p className="text-xs text-gray-500 mb-6">Manage university staff access and system permissions.</p>

        {/* TAB SELECTOR CONTROL BAR */}
        <div className="flex border-b border-neutral-200 mb-6 gap-2">
          <button 
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'registry' ? 'border-red-800 text-red-800' : 'border-transparent text-gray-400 hover:text-neutral-700'}`}
          >
            📋 Accounts Registry Table
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'create' ? 'border-red-800 text-red-800' : 'border-transparent text-gray-400 hover:text-neutral-700'}`}
          >
            ➕ Create New Account
          </button>
        </div>

        {/* PANEL CONTEXT 1: ACCOUNTS REGISTRY TABLE */}
        {activeTab === 'registry' && (
          <div className="space-y-4">
            <div className="flex gap-3 grid grid-cols-3 bg-white p-3 border border-neutral-200/80 rounded-xl shadow-xs">
              <input 
                type="text" placeholder="Search registry records..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="col-span-2 text-xs border border-neutral-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-700 bg-[#FDFBF9]"
              />
              <select 
                value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                className="text-xs border border-neutral-300 bg-white rounded-lg px-2 py-2 outline-none"
              >
                <option value="">All Roles</option>
                <option value="1">Originator</option>
                <option value="2">Processor</option>
                <option value="3">Signee</option>
                <option value="4">GSO Admin</option>
                <option value="5">ICT Admin</option>
              </select>
            </div>

            {/* SCROLL CONTAINER */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm max-h-[362px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs relative">
                <thead className="sticky top-0 bg-neutral-50 z-10 shadow-xs">
                  <tr className="text-neutral-500 font-bold border-b border-neutral-200 uppercase tracking-wider text-[10px]">
                    <th className="p-3">User Profile / Info</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Station / Scope Location</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {filteredAccounts.map((user) => (
                    <tr key={user.u_id} className={`transition-colors ${user.is_active === false ? 'bg-neutral-100/70 opacity-60 italic' : 'hover:bg-neutral-50/50'}`}>
                      <td className="p-3">
                        <p className="font-bold text-neutral-900">{user.full_name} {user.is_active === false && <span className="text-[10px] text-red-700 ml-1 font-mono font-bold uppercase">[Suspended]</span>}</p>
                        <p className="text-[11px] text-gray-400">@{user.username} | {user.uni_email}</p>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          user.a_id === 5 ? 'bg-purple-100 text-purple-700' :
                          user.a_id === 3 ? 'bg-amber-100 text-amber-700' :
                          user.a_id === 2 ? 'bg-blue-100 text-blue-700' : 
                          user.a_id === 4 ? 'bg-rose-100 text-red-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role_name}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">
                        {user.office_name ? (
                          <span className="text-red-800 font-semibold font-sans">🏬 {user.office_name}</span>
                        ) : user.department_name ? (
                          <span>📁 Dept: {user.department_name}</span>
                        ) : (
                          <span className="text-gray-400 italic">No Sector Bound</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          type="button"
                          onClick={() => setSelectedUser({ ...user })}
                          className="px-3 py-1 bg-neutral-900 text-white font-bold rounded-md hover:bg-red-800 transition-all text-[11px] cursor-pointer"
                        >
                          ⚙️ MANAGE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PANEL CONTEXT 2: CREATE BLOCK */}
        {activeTab === 'create' && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold mb-1 text-neutral-900">Create New Account</h3>
            <p className="text-xs text-gray-400 mb-6">Enter credentials and assign institutional roles</p>

            {message.text && (
              <div className={`mb-4 p-3 rounded-lg text-xs border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Full Name</label>
                  <input type="text" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}
                         className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-red-700 outline-none" placeholder="Juan Dela Cruz" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">University Email</label>
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                         className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-red-700 outline-none" placeholder="juan.delacruz@batstate-u.edu.ph" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Username</label>
                  <input type="text" required value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                         className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-red-700 outline-none" placeholder="j_delacruz" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Password</label>
                  <input 
                    type="password" 
                    required 
                    minLength="6"
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-red-700 outline-none" 
                    placeholder="••••••••••••" 
                  />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Account Type (Role)</label>
                  <select required value={form.accountType} onChange={e => setForm({...form, accountType: parseInt(e.target.value)})}
                          className="w-full border border-neutral-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-red-700 outline-none">
                    <option value="">Select assigned role...</option>
                    <option value="1">Originator</option>
                    <option value="2">Processor</option>
                    <option value="3">Signee</option>
                    <option value="4">GSO Admin</option>
                    <option value="5">ICT Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Department Scope</label>
                  <select 
                    required={form.accountType === 1} 
                    value={form.departmentId} 
                    onChange={e => setForm({...form, departmentId: e.target.value ? parseInt(e.target.value) : ''})}
                    disabled={form.accountType !== 1 && form.accountType !== ''}
                    className={`w-full border border-neutral-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-red-700 outline-none ${form.accountType !== 1 && form.accountType !== '' ? 'bg-neutral-100 opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select campus college...</option>
                    <option value="1">College of Informatics and Computing Sciences</option>
                    <option value="2">College of Accountancy, Business, Economics and International Hospitality Management</option>
                    <option value="3">College of Arts and Sciences</option>
                    <option value="4">College of Industrial Technology</option>
                    <option value="5">College of Engineering</option>
                    <option value="6">College of Teacher Education</option>
                  </select>
                </div>
              </div>

              {(form.accountType === 2 || form.accountType === 3 || form.accountType === 4) && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-[11px] font-black text-red-800 uppercase mb-1 tracking-wider">Assigned Office Workspace (Required for routing)</label>
                  
                  {form.accountType === 4 ? (
                    <div className="w-full border-2 border-red-200 bg-red-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-800 shadow-xs flex items-center justify-between">
                      <span>General Services Office (GSO)</span>
                      <span className="text-[10px] bg-red-800 text-white px-2 py-0.5 rounded uppercase tracking-wider">Auto-Assigned</span>
                    </div>
                  ) : (
                    <select 
                      required value={form.officeId} onChange={e => setForm({...form, officeId: parseInt(e.target.value)})}
                      className="w-full border-2 border-red-200 bg-white rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-red-700 outline-none font-semibold text-neutral-700 cursor-pointer shadow-xs"
                    >
                      <option value="">-- Choose Assigned Campus Branch Office Stop --</option>
                      {offices
                        .filter(off => !off.name.includes('General Services Office') && !off.name.includes('GSO'))
                        .map((off) => (
                        <option key={off.id} value={off.id}>{off.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button type="button" onClick={() => setForm({ username: '', password: '', accountType: '', fullName: '', email: '', departmentId: '', officeId: '' })}
                        className="px-4 py-2 text-sm border font-medium text-gray-500 rounded-lg hover:bg-neutral-50">RESET</button>
                <button type="submit" className="px-5 py-2 text-sm font-medium bg-red-800 text-white rounded-lg hover:bg-red-900">CREATE ACCOUNT</button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="space-y-6 mt-14">
        <div className="bg-[#2D1F1E] text-neutral-300 p-5 rounded-2xl shadow-sm">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">ℹ️ Role Definitions</h4>
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-white/5 rounded-lg border-l-2 border-red-600"><p className="font-bold text-white">Originator:</p><p className="text-neutral-400 mt-0.5">Initializes new document workflows and drafts requests.</p></div>
            <div className="p-3 bg-white/5 rounded-lg border-l-2 border-amber-500"><p className="font-bold text-white">Processor:</p><p className="text-neutral-400 mt-0.5">Validates data entry, handles scan arrivals/releases, and routes ad-hoc workflows inside an assigned office destination.</p></div>
            <div className="p-3 bg-white/5 rounded-lg border-l-2 border-purple-500"><p className="font-bold text-white">Signee:</p><p className="text-neutral-400 mt-0.5">Final authority within an assigned office branch with access privileges to evaluate, sign, or reject active document states.</p></div>
            <div className="p-3 bg-white/5 rounded-lg border-l-2 border-rose-500"><p className="font-bold text-white">GSO Admin:</p><p className="text-neutral-400 mt-0.5">Hybrid Processor/Signee role locked permanently to the General Services Office (GSO).</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}