import React from 'react';

export default function AccountManagementTab({
  activeTab, setActiveTab, searchTerm, setSearchTerm, roleFilter, setRoleFilter,
  filteredAccounts, setSelectedUser, message, form, setForm, handleCreateAccount, offices
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Account Management</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">Manage university staff access and system permissions.</p>
        </div>

        {/* TAB SELECTOR CONTROL BAR */}
        <div className="flex border-b border-gray-200 mb-6 gap-6">
          <button 
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'registry' 
                ? 'border-[#D32F2F] text-[#D32F2F]' 
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Accounts Registry
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'create' 
                ? 'border-[#D32F2F] text-[#D32F2F]' 
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Create Account
          </button>
        </div>

        {/* PANEL CONTEXT 1: ACCOUNTS REGISTRY TABLE */}
        {activeTab === 'registry' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search registry records..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              <div className="relative sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                </div>
                <select 
                  value={roleFilter} 
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 bg-gray-50 focus:bg-white rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] transition-colors appearance-none cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="1">Originator</option>
                  <option value="2">Processor</option>
                  <option value="3">Signee</option>
                  <option value="4">GSO Admin</option>
                  <option value="5">ICT Admin</option>
                </select>
              </div>
            </div>

            {/* Scrollable Table Container */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[450px]">
              <div className="overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse text-sm relative">
                  <thead className="sticky top-0 bg-gray-50 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <tr className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-4 border-b border-gray-200">User Profile / Info</th>
                      <th className="p-4 border-b border-gray-200">Role</th>
                      <th className="p-4 border-b border-gray-200">Station / Scope Location</th>
                      <th className="p-4 border-b border-gray-200 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAccounts.map((user) => (
                      <tr key={user.u_id} className={`transition-colors hover:bg-gray-50/50 ${user.is_active === false ? 'bg-gray-50 opacity-75' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${user.is_active === false ? 'bg-gray-200 text-gray-500' : 'bg-red-50 text-[#D32F2F]'}`}>
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 flex items-center gap-2">
                                {user.full_name} 
                                {user.is_active === false && (
                                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Suspended</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">@{user.username} &bull; {user.uni_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                            user.a_id === 5 ? 'bg-purple-50 border border-purple-100 text-purple-700' :
                            user.a_id === 3 ? 'bg-amber-50 border border-amber-100 text-amber-700' :
                            user.a_id === 2 ? 'bg-blue-50 border border-blue-100 text-blue-700' : 
                            user.a_id === 4 ? 'bg-red-50 border border-red-100 text-[#D32F2F]' : 
                            'bg-gray-100 border border-gray-200 text-gray-700'
                          }`}>
                            {user.role_name}
                          </span>
                        </td>
                        <td className="p-4">
                          {user.office_name ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                              {user.office_name}
                            </div>
                          ) : user.department_name ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                              {user.department_name}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No Sector Bound</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            type="button"
                            onClick={() => setSelectedUser({ ...user })}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all text-[11px] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-200"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-gray-500 text-sm">
                          No matching accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PANEL CONTEXT 2: CREATE BLOCK */}
        {activeTab === 'create' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm animate-in fade-in duration-200">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900">Create New Account</h3>
              <p className="text-sm text-gray-500 mt-1">Enter credentials and assign institutional roles and sector scopes.</p>
            </div>

            {message.text && (
              <div className={`mb-6 p-4 rounded-xl text-sm border flex items-start gap-3 shadow-sm ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Full Name</label>
                  <input type="text" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}
                         className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors" placeholder="e.g. Juan Dela Cruz" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">University Email</label>
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                         className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors" placeholder="juan.delacruz@batstate-u.edu.ph" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Username</label>
                  <input type="text" required value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                         className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors" placeholder="j_delacruz" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Password</label>
                  <input 
                    type="password" 
                    required 
                    minLength="6"
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors" 
                    placeholder="••••••••••••" 
                  />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Account Type (Role)</label>
                  <select required value={form.accountType} onChange={e => setForm({...form, accountType: parseInt(e.target.value)})}
                          className="w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors appearance-none cursor-pointer">
                    <option value="">Select assigned role...</option>
                    <option value="1">Originator</option>
                    <option value="2">Processor</option>
                    <option value="3">Signee</option>
                    <option value="4">GSO Admin</option>
                    <option value="5">ICT Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Department Scope</label>
                  <select 
                    required={form.accountType === 1} 
                    value={form.departmentId} 
                    onChange={e => setForm({...form, departmentId: e.target.value ? parseInt(e.target.value) : ''})}
                    disabled={form.accountType !== 1 && form.accountType !== ''}
                    className={`w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors appearance-none ${form.accountType !== 1 && form.accountType !== '' ? 'bg-gray-100 opacity-70 cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}
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
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 p-5 bg-gray-50 border border-gray-200 rounded-xl">
                  <label className="block text-xs font-bold text-[#D32F2F] uppercase mb-3 tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Assigned Office Workspace (Routing)
                  </label>
                  
                  {form.accountType === 4 ? (
                    <div className="w-full border border-red-200 bg-white rounded-lg px-4 py-3 text-sm font-bold text-gray-800 shadow-sm flex items-center justify-between">
                      <span>General Services Office (GSO)</span>
                      <span className="text-[10px] bg-red-100 text-[#D32F2F] px-2 py-1 rounded-md uppercase tracking-wider">Auto-Assigned</span>
                    </div>
                  ) : (
                    <select 
                      required value={form.officeId} onChange={e => setForm({...form, officeId: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 bg-white rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none font-semibold text-gray-800 cursor-pointer shadow-sm appearance-none"
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

              <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setForm({ username: '', password: '', accountType: '', fullName: '', email: '', departmentId: '', officeId: '' })}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors shadow-sm cursor-pointer"
                >
                  Reset Form
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 text-sm font-bold bg-[#D32F2F] text-white rounded-lg hover:bg-[#b71c1c] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: ROLE DEFINITIONS */}
      <div className="mt-14 lg:mt-0">
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm sticky top-6">
          <h4 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Role Definitions
          </h4>
          <div className="space-y-4">
            
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <p className="font-bold text-gray-900 text-sm">Originator</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">Initializes new document workflows and drafts requests across specific campus sectors.</p>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-bold text-blue-900 text-sm">Processor</p>
              </div>
              <p className="text-xs text-blue-800/80 leading-relaxed">Validates data entry, handles scan arrivals/releases, and routes ad-hoc workflows inside an assigned office destination.</p>
            </div>

            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                <p className="font-bold text-amber-900 text-sm">Signee</p>
              </div>
              <p className="text-xs text-amber-800/80 leading-relaxed">Final authority within an assigned office branch with access privileges to evaluate, sign, or reject active document states.</p>
            </div>

            <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-[#D32F2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                <p className="font-bold text-red-900 text-sm">GSO Admin</p>
              </div>
              <p className="text-xs text-red-800/80 leading-relaxed">Hybrid Processor/Signee role locked permanently to the General Services Office (GSO) for specialized operations.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}