import React from 'react';

export default function CampusInfrastructureTab({
  handleCreateDepartment, newDeptName, setNewDeptName,
  handleCreateOffice, newOfficeName, setNewOfficeName, newOfficeCategory, setNewOfficeCategory, officeCategoryEnabled, setOfficeCategoryEnabled, infraSummary
  , offices, editInfrastructure, deleteInfrastructure
}) {
  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Campus Infrastructure</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage institutional departments and administrative office routing nodes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* REGISTER DEPARTMENT CARD */}
        <div className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-2xl p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-5">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              <div className="p-1.5 bg-red-50 dark:bg-red-900/30 text-[#D32F2F] dark:text-red-400 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              Register Department
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Expands available institutional scopes for user account creation and directory mapping.
            </p>
          </div>
          <form onSubmit={handleCreateDepartment} className="flex flex-col gap-3 mt-5">
            <input 
              type="text" 
              required 
              value={newDeptName} 
              onChange={e => setNewDeptName(e.target.value)} 
              placeholder="e.g. CICS, CABEIHM" 
              className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#D32F2F] transition-all" 
            />
            <button 
              type="submit" 
              className="w-full px-5 py-2.5 bg-gray-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Add Dept
            </button>
          </form>
        </div>

        {/* REGISTER OFFICE CARD */}
        <div className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-2xl p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-5">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              Register Branch Office
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Populates available routing nodes for workflow blueprints and user assignments.
            </p>
          </div>
          <form onSubmit={handleCreateOffice} className="flex flex-col gap-3 mt-5">
            <input 
              type="text" 
              required 
              value={newOfficeName} 
              onChange={e => setNewOfficeName(e.target.value)} 
              placeholder="e.g. Guidance Office, Cashier" 
              className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all" 
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={officeCategoryEnabled} onChange={e => setOfficeCategoryEnabled(e.target.checked)} className="accent-blue-600 cursor-pointer" />
              Add this office to a category
            </label>
            {officeCategoryEnabled && <>
              <input
                type="text"
                list="office-category-suggestions"
                value={newOfficeCategory}
                onChange={e => setNewOfficeCategory(e.target.value)}
                placeholder="Start typing a category or create a new one"
                maxLength={150}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
              />
              <datalist id="office-category-suggestions">
                {[...new Set([
                  ...offices.map(office => office.category),
                  ...(infraSummary.officeCapacity || []).map(office => office.office_category)
                ].filter(Boolean))].sort().map(category => <option key={category} value={category} />)}
              </datalist>
            </>}
            <button 
              type="submit" 
              className="px-5 py-2.5 bg-gray-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Add Office
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">Registered Departments</h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(infraSummary.departments || []).map(d => (
            <div key={d.id} className="trace-category-card rounded-xl border border-gray-200 dark:border-[#42292f] bg-gray-50 dark:bg-[#1c1113] p-3 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">{d.name}</span>
              <span className="flex gap-2">
                <button type="button" className="text-xs text-red-800 dark:text-red-400 underline cursor-pointer" onClick={() => editInfrastructure('department',d.id,d.name)}>Edit</button>
                <button type="button" className="text-xs text-red-800 dark:text-red-400 underline cursor-pointer" onClick={() => deleteInfrastructure('department',d.id,d.name)}>Delete</button>
              </span>
            </div>
          ))}
          {!(infraSummary.departments || []).length && <p className="text-sm text-gray-500 dark:text-gray-400">No departments registered.</p>}
        </div>
      </div>

      {/* ACTIVE STATION CAPACITY MONITORS */}
      <div className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-2xl p-6 shadow-sm">
        <div className="mb-6 border-b border-gray-100 dark:border-[#42292f] pb-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Active Station Capacity Monitors
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Live index count detailing personnel distribution mapped directly from storage nodes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {infraSummary.officeCapacity.map((off, idx) => (
            <div 
              key={idx} 
              className="p-4 border border-gray-200 dark:border-[#42292f] bg-gray-50 dark:bg-[#1c1113] rounded-xl flex justify-between items-center hover:bg-white dark:hover:bg-[#180e10] hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
            >
              <div className="flex items-center gap-3 overflow-hidden pr-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white truncate block" title={off.office_name}>{off.office_name}</span>
                  {off.office_category && <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate block" title={off.office_category}>{off.office_category}</span>}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider whitespace-nowrap shrink-0 shadow-sm ${
                  off.staff_count > 0 
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-red-50 dark:bg-red-900/30 text-[#D32F2F] dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  {off.staff_count} {off.staff_count === 1 ? 'STAFF' : 'STAFF'}
                </span>
                <button type="button" className="text-xs text-red-800 dark:text-red-400 underline cursor-pointer" onClick={() => { const found=offices.find(o=>o.name===off.office_name); if(found) editInfrastructure('office',found.id,off.office_name); }}>Edit</button>
                <button type="button" className="text-xs text-red-800 dark:text-red-400 underline cursor-pointer" onClick={() => { const found=offices.find(o=>o.name===off.office_name); if(found) deleteInfrastructure('office',found.id,off.office_name); }}>Delete</button>
              </div>
            </div>
          ))}

          {/* Empty State Fallback */}
          {infraSummary.officeCapacity.length === 0 && (
            <div className="col-span-full py-8 text-center bg-gray-50 dark:bg-[#1c1113] rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No offices registered yet.</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use the form above to add your first branch office.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}