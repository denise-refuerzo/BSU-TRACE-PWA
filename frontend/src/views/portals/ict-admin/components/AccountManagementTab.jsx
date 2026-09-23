import AccessManagementTab from './AccessManagementTab';

export default function AccountManagementTab({
  activeTab, searchTerm, setSearchTerm, roleFilter, setRoleFilter,
  accounts, filteredAccounts, setSelectedUser, message, emailAvailability, checkEmailAvailability,
  form, setForm, handleCreateAccount, offices, departments
}) {
  if (activeTab === 'access') return <AccessManagementTab accounts={accounts} offices={offices} departments={departments} />;

  return (
    <div className="w-full">
      <div className="w-full">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Accounts Management</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">Manage university staff access and system permissions.</p>
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
                  <option value="1">Faculty Staff</option>
                  <option value="2">Office Staff</option>
                  <option value="4">GSO Admin</option>
                  <option value="5">ICT Admin</option>
                </select>
              </div>
            </div>

            {/* Scrollable Table Container */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[450px]">
              <div className="overflow-auto custom-scrollbar flex-1">
                <table className="w-full min-w-[960px] text-left border-collapse text-sm relative">
                  <thead className="sticky top-0 bg-gray-50 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <tr className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-4 border-b border-gray-200 whitespace-nowrap">User Profile / Info</th>
                      <th className="p-4 border-b border-gray-200 whitespace-nowrap">Role</th>
                      <th className="p-4 border-b border-gray-200 whitespace-nowrap">Office</th>
                      <th className="p-4 border-b border-gray-200 text-center whitespace-nowrap">Actions</th>
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
                              <p className="text-xs text-gray-500 whitespace-nowrap">@{user.username} &bull; {user.uni_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                            user.a_id === 5 ? 'bg-purple-50 border border-purple-100 text-purple-700' :
                            user.a_id === 3 ? 'bg-amber-50 border border-amber-100 text-amber-700' :
                            user.a_id === 2 ? 'bg-blue-50 border border-blue-100 text-blue-700' : 
                            user.a_id === 4 ? 'bg-red-50 border border-red-100 text-[#D32F2F]' : 
                            'bg-gray-100 border border-gray-200 text-gray-700'
                          }`}>
                            {Number(user.a_id) === 1 ? 'Faculty Staff' : user.role_name}
                          </span>
                        </td>
                        <td className="p-4">
                          {user.office_name ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 whitespace-nowrap">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                              {user.office_name}
                            </div>
                          ) : user.department_name ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                              {user.department_name}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic whitespace-nowrap">No Sector Bound</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            type="button"
                            onClick={() => setSelectedUser({ ...user, _originalUniEmail: user.uni_email })}
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
                  <input type="email" required pattern="[A-Za-z0-9._%+\-]+@g\.batstate-u\.edu\.ph" title="Use an official email ending in @g.batstate-u.edu.ph" value={form.email} onChange={e => setForm({...form, email: e.target.value.toLowerCase()})} onBlur={e => checkEmailAvailability(e.target.value)}
                         className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors" placeholder="name@g.batstate-u.edu.ph" />
                  <p className={`mt-1.5 text-xs ${emailAvailability.available === true ? 'text-emerald-700' : emailAvailability.available === false ? 'text-red-700' : 'text-gray-500'}`}>{emailAvailability.message || 'Must end in @g.batstate-u.edu.ph and cannot already belong to another account.'}</p>
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
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Role</label>
                  <select required value={form.accountType} onChange={e => setForm({...form, accountType: parseInt(e.target.value)})}
                          className="w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors appearance-none cursor-pointer">
                    <option value="">Select assigned role...</option>
                    <option value="1">Faculty Staff</option>
                    <option value="2">Office Staff</option>
                    <option value="4">GSO Admin</option>
                    <option value="5">ICT Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Department {form.accountType === 1 ? '(Required)' : '(Optional)'}</label>
                  <select 
                    required={form.accountType === 1} 
                    value={form.departmentId} 
                    onChange={e => setForm({...form, departmentId: e.target.value ? parseInt(e.target.value) : ''})}
                    className="w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">{form.accountType === 1 ? 'Choose a department...' : 'No department affiliation'}</option>
                    {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </div>
              </div>

              {(form.accountType === 2 || form.accountType === 3 || form.accountType === 4) && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 p-5 bg-gray-50 border border-gray-200 rounded-xl">
                  <label className="block text-xs font-bold text-[#D32F2F] uppercase mb-3 tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Office {form.accountType === 4 ? '' : '(Required)'}
                  </label>
                  
                  {form.accountType === 4 ? (
                    <div className="w-full border border-red-200 bg-white rounded-lg px-4 py-3 text-sm font-bold text-gray-800 shadow-sm flex items-center justify-between">
                      <span>{offices.find(o => /general services|\bgso\b/i.test(o.name))?.name || 'General Services'}</span>
                      <span className="text-[10px] bg-red-100 text-[#D32F2F] px-2 py-1 rounded-md uppercase tracking-wider">Auto-Assigned</span>
                    </div>
                  ) : (
                    <select 
                      required value={form.officeId} onChange={e => setForm({...form, officeId: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 bg-white rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none font-semibold text-gray-800 cursor-pointer shadow-sm appearance-none"
                    >
                      <option value="">Choose an office...</option>
                      {offices
                        .filter(off => !/general services|\bgso\b/i.test(off.name))
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

    </div>
  );
}
