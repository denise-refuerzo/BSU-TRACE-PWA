export default function AccountManagementTab({
  activeTab, searchTerm, setSearchTerm, roleFilter, setRoleFilter,
  officeFilter, setOfficeFilter, departmentFilter, setDepartmentFilter,
  originFilter, setOriginFilter, statusFilter, setStatusFilter,
  authorityFilter, setAuthorityFilter,
  sponsorFilter, setSponsorFilter,
  accounts, filteredAccounts, setSelectedUser, message, emailAvailability, checkEmailAvailability,
  form, setForm, handleCreateAccount, offices, departments
}) {
  return (
    <div className="w-full text-left">
      <div className="w-full">
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Manage university staff access and system permissions.</p>

        {/* PANEL CONTEXT 1: ACCOUNTS REGISTRY TABLE */}
        {activeTab === 'registry' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Search & Filter Bar */}
            <div className="grid gap-3 bg-white dark:bg-[#180e10] p-4 border border-gray-200 dark:border-[#42292f] rounded-xl shadow-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative sm:col-span-2 lg:col-span-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search registry records..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white transition-colors"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                </div>
                <select 
                  value={roleFilter} 
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] transition-colors appearance-none cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="1">Faculty Staff</option>
                  <option value="2">Office Staff</option>
                  <option value="4">GSO Admin</option>
                  <option value="5">ICT Admin</option>
                </select>
              </div>
              <select value={officeFilter} onChange={e => setOfficeFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#D32F2F] cursor-pointer">
                <option value="">All Offices</option>
                {offices.map(office => <option key={office.id} value={String(office.id)}>{office.name}</option>)}
              </select>
              <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#D32F2F] cursor-pointer">
                <option value="">All Departments</option>
                {departments.map(department => <option key={department.id} value={String(department.id)}>{department.name}</option>)}
              </select>
              <select value={originFilter} onChange={e => setOriginFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#D32F2F] cursor-pointer">
                <option value="">All Account Origins</option>
                <option value="ict">Created by ICT</option>
                <option value="registration_link">Registration Link</option>
              </select>
              <select value={authorityFilter} onChange={e => setAuthorityFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#D32F2F] cursor-pointer">
                <option value="">All Authority Levels</option>
                <option value="assignatory">Assignatories / Heads</option>
                <option value="regular">Regular Accounts</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#D32F2F] cursor-pointer">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Suspended</option>
              </select>
              <select value={sponsorFilter} onChange={e => setSponsorFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-[#D32F2F] cursor-pointer">
                <option value="">All Registration Sponsors</option>
                {[...new Map(accounts.filter(account => account.sponsor_id).map(account => [account.sponsor_id, account.sponsored_by])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>

            {/* Scrollable Table Container */}
            <div className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[450px]">
              <div className="overflow-auto custom-scrollbar flex-1">
                <table className="w-full min-w-[960px] text-left border-collapse text-sm relative">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-[#1c1113] z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <tr className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-4 border-b border-gray-200 dark:border-[#42292f] whitespace-nowrap">User Profile / Info</th>
                      <th className="p-4 border-b border-gray-200 dark:border-[#42292f] whitespace-nowrap">Role</th>
                      <th className="p-4 border-b border-gray-200 dark:border-[#42292f] whitespace-nowrap">Office</th>
                      <th className="p-4 border-b border-gray-200 dark:border-[#42292f] text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredAccounts.map((user) => (
                      <tr key={user.u_id} className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-[#2b1317]/50 ${user.is_active === false ? 'bg-gray-50 dark:bg-[#1c1113] opacity-75' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${user.is_active === false ? 'bg-gray-200 dark:bg-gray-800 text-gray-500' : 'bg-red-50 dark:bg-red-900/30 text-[#D32F2F] dark:text-red-400'}`}>
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {user.full_name} 
                                {user.is_active === false && (
                                  <span className="text-[9px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Suspended</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">@{user.username} &bull; {user.uni_email}</p>
                              {user.sponsored_by && <p className="mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Registered under {user.sponsored_by}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                            user.a_id === 5 ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-400' :
                            user.a_id === 3 ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
                            user.a_id === 2 ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400' : 
                            user.a_id === 4 ? 'bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-[#D32F2F] dark:text-red-400' : 
                            'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {Number(user.a_id) === 1 ? 'Faculty Staff' : user.role_name}
                          </span>
                          {user.is_assignatory && <span className="ml-2 inline-block rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Assignatory</span>}
                        </td>
                        <td className="p-4">
                          {user.office_name ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                              {user.office_name}
                            </div>
                          ) : user.department_name ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                              {user.department_name}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic whitespace-nowrap">No Sector Bound</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            type="button"
                            onClick={() => setSelectedUser({ ...user, _originalUniEmail: user.uni_email })}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1c1113] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all text-[11px] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-200"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
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
          <div className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-2xl p-6 md:p-8 shadow-sm animate-in fade-in duration-200">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Account</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter credentials and assign institutional roles and sector scopes.</p>
            </div>

            {message.text && (
              <div className={`mb-6 p-4 rounded-xl text-sm border flex items-start gap-3 shadow-sm ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`}>
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Full Name</label>
                  <input type="text" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}
                         className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white" placeholder="e.g. Juan Dela Cruz" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">University Email</label>
                  <input type="email" required pattern="[A-Za-z0-9._%+\-]+@g\.batstate-u\.edu\.ph" title="Use an official email ending in @g.batstate-u.edu.ph" value={form.email} onChange={e => setForm({...form, email: e.target.value.toLowerCase()})} onBlur={e => checkEmailAvailability(e.target.value)}
                         className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white" placeholder="name@g.batstate-u.edu.ph" />
                  <p className={`mt-1.5 text-xs ${emailAvailability.available === true ? 'text-emerald-700 dark:text-emerald-400' : emailAvailability.available === false ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{emailAvailability.message || 'Must end in @g.batstate-u.edu.ph and cannot already belong to another account.'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Username</label>
                  <input type="text" required value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                         className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white" placeholder="j_delacruz" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Password</label>
                  <input 
                    type="password" 
                    required 
                    minLength="6"
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors bg-gray-50 dark:bg-[#1c1113] text-gray-900 dark:text-white" 
                    placeholder="••••••••••••" 
                  />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Role</label>
                  <select required value={form.accountType} onChange={e => { const accountType = parseInt(e.target.value); setForm({...form, accountType, isAssignatory: accountType === 2 ? form.isAssignatory : false}); }}
                          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors appearance-none cursor-pointer">
                    <option value="">Select assigned role...</option>
                    <option value="1">Faculty Staff</option>
                    <option value="2">Office Staff</option>
                    <option value="4">GSO Admin</option>
                    <option value="5">ICT Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Department {form.accountType === 1 ? '(Required)' : '(Optional)'}</label>
                  <select 
                    required={form.accountType === 1} 
                    value={form.departmentId} 
                    onChange={e => setForm({...form, departmentId: e.target.value ? parseInt(e.target.value) : ''})}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">{form.accountType === 1 ? 'Choose a department...' : 'No department affiliation'}</option>
                    {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </div>
              </div>

              {(form.accountType === 2 || form.accountType === 3 || form.accountType === 4) && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 p-5 bg-gray-50 dark:bg-[#1c1113] border border-gray-200 dark:border-gray-700 rounded-xl">
                  <label className="block text-xs font-bold text-[#D32F2F] dark:text-red-400 uppercase mb-3 tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Office {form.accountType === 4 ? '' : '(Required)'}
                  </label>
                  
                  {form.accountType === 4 ? (
                    <div className="w-full border border-red-200 dark:border-red-900 bg-white dark:bg-[#180e10] rounded-lg px-4 py-3 text-sm font-bold text-gray-800 dark:text-white shadow-sm flex items-center justify-between">
                      <span>{offices.find(o => /general services|\bgso\b/i.test(o.name))?.name || 'General Services'}</span>
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-[#D32F2F] dark:text-red-300 px-2 py-1 rounded-md uppercase tracking-wider">Auto-Assigned</span>
                    </div>
                  ) : (
                    <select 
                      required value={form.officeId} onChange={e => setForm({...form, officeId: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none font-semibold cursor-pointer shadow-sm appearance-none"
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

              {form.accountType === 2 && (
                <section className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 p-5">
                  <label className="flex items-start gap-3 text-sm font-bold text-gray-900 dark:text-white cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={form.isAssignatory} onChange={e => setForm({...form, isAssignatory: e.target.checked})} />
                    <span>Leadership / assignatory account
                      <span className="mt-1 block text-xs font-normal text-gray-600 dark:text-gray-400">Automatically grants submission visibility, signatory eligibility, and permission to request registration links for the selected scope.</span>
                    </span>
                  </label>
                  {form.isAssignatory && (
                    <div className="mt-5 space-y-4">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Position title <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
                        <input value={form.positionTitle} maxLength={120} onChange={e => setForm({...form, positionTitle: e.target.value})} placeholder="e.g. Dean of CICS" className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-gray-900 dark:text-white px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Authority scope
                        <select value={form.authorityMode} onChange={e => setForm({...form, authorityMode: e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-gray-900 dark:text-white px-3 py-2.5 text-sm font-normal cursor-pointer">
                          <option value="office">Primary office</option>
                          <option value="department">Department</option>
                          <option value="multiple">Multiple offices</option>
                        </select>
                      </label>
                      {form.authorityMode === 'department' && (
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Department overseen
                          <select required value={form.authorityDepartmentId} onChange={e => setForm({...form, authorityDepartmentId: e.target.value ? Number(e.target.value) : ''})} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-gray-900 dark:text-white px-3 py-2.5 text-sm font-normal cursor-pointer">
                            <option value="">Choose a department...</option>
                            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                          </select>
                        </label>
                      )}
                      {form.authorityMode === 'multiple' && (
                        <div>
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Offices overseen</p>
                          <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#180e10] p-3 sm:grid-cols-2">
                            {offices.filter(off => !/general services|\bgso\b/i.test(off.name)).map(office => (
                              <label key={office.id} className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input type="checkbox" checked={form.authorityOfficeIds.includes(Number(office.id))} onChange={e => setForm({...form, authorityOfficeIds: e.target.checked ? [...form.authorityOfficeIds, Number(office.id)] : form.authorityOfficeIds.filter(id => id !== Number(office.id))})} /> {office.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-gray-100 dark:border-[#42292f]">
                <button 
                  type="button" 
                  onClick={() => setForm({ username: '', password: '', accountType: '', fullName: '', email: '', departmentId: '', officeId: '', isAssignatory: false, positionTitle: '', authorityMode: 'office', authorityOfficeIds: [], authorityDepartmentId: '' })}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-[#180e10] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors shadow-sm cursor-pointer"
                >
                  Reset Form
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 text-sm font-bold bg-[#D32F2F] dark:bg-red-700 text-white rounded-lg hover:bg-[#b71c1c] dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-md transition-all cursor-pointer flex items-center gap-2"
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