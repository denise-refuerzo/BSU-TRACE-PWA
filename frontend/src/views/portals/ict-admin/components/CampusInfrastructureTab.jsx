import React from 'react';

export default function CampusInfrastructureTab({
  handleCreateDepartment, newDeptName, setNewDeptName,
  handleCreateOffice, newOfficeName, setNewOfficeName, infraSummary
}) {
  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Campus Infrastructure</h2>
        <p className="text-sm text-gray-500 mt-1">Manage institutional departments and administrative office routing nodes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* REGISTER DEPARTMENT CARD */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="mb-5">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
              <div className="p-1.5 bg-red-50 text-[#D32F2F] rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              Register Department
            </h4>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Expands available institutional scopes for user account creation and directory mapping.
            </p>
          </div>
          <form onSubmit={handleCreateDepartment} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              required 
              value={newDeptName} 
              onChange={e => setNewDeptName(e.target.value)} 
              placeholder="e.g. CICS, CABEIHM" 
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#D32F2F] transition-all" 
            />
            <button 
              type="submit" 
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Add Dept
            </button>
          </form>
        </div>

        {/* REGISTER OFFICE CARD */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="mb-5">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              Register Branch Office
            </h4>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Populates available routing nodes for workflow blueprints and user assignments.
            </p>
          </div>
          <form onSubmit={handleCreateOffice} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              required 
              value={newOfficeName} 
              onChange={e => setNewOfficeName(e.target.value)} 
              placeholder="e.g. Guidance Office, Cashier" 
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all" 
            />
            <button 
              type="submit" 
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Add Office
            </button>
          </form>
        </div>
      </div>

      {/* ACTIVE STATION CAPACITY MONITORS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Active Station Capacity Monitors
          </h4>
          <p className="text-xs text-gray-500 mt-1">Live index count detailing personnel distribution mapped directly from storage nodes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {infraSummary.officeCapacity.map((off, idx) => (
            <div 
              key={idx} 
              className="p-4 border border-gray-200 bg-gray-50 rounded-xl flex justify-between items-center hover:bg-white hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="flex items-center gap-3 overflow-hidden pr-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-800 truncate" title={off.office_name}>
                  {off.office_name}
                </span>
              </div>
              
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider whitespace-nowrap shrink-0 shadow-sm ${
                off.staff_count > 0 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-red-50 text-[#D32F2F] border border-red-200'
              }`}>
                {off.staff_count} {off.staff_count === 1 ? 'STAFF' : 'STAFF'}
              </span>
            </div>
          ))}

          {/* Empty State Fallback */}
          {infraSummary.officeCapacity.length === 0 && (
            <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm font-medium text-gray-600">No offices registered yet.</p>
              <p className="text-xs text-gray-500 mt-1">Use the form above to add your first branch office.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}