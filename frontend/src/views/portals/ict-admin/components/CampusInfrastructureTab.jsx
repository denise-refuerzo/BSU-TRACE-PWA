import React from 'react';

export default function CampusInfrastructureTab({
  handleCreateDepartment, newDeptName, setNewDeptName,
  handleCreateOffice, newOfficeName, setNewOfficeName, infraSummary
}) {
  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div>
            <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">Register New Campus Department Structure</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Expands available lookups inside user account creation forms option blocks.</p>
          </div>
          <form onSubmit={handleCreateDepartment} className="flex gap-2 text-xs font-bold">
            <input type="text" required value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="e.g. CICS, CABEIHM" className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-700 bg-[#FDFBF9]" />
            <button type="submit" className="px-4 py-2 bg-neutral-900 hover:bg-neutral-950 text-white text-[11px] font-black rounded-lg uppercase tracking-wide cursor-pointer">Add Dept</button>
          </form>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div>
            <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">Register New Campus Branch Office Station Node</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Populates available nodes inside both user assignment forms and step visuals.</p>
          </div>
          <form onSubmit={handleCreateOffice} className="flex gap-2 text-xs font-bold">
            <input type="text" required value={newOfficeName} onChange={e => setNewOfficeName(e.target.value)} placeholder="e.g. Guidance Office, Cashier" className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-700 bg-[#FDFBF9]" />
            <button type="submit" className="px-4 py-2 bg-neutral-900 hover:bg-neutral-950 text-white text-[11px] font-black rounded-lg uppercase tracking-wide cursor-pointer">Add Office</button>
          </form>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Active Station Capacity Monitors</h4>
          <p className="text-[10px] text-gray-400 mt-0.5">Live index count detailing personnel distribution weights mapped straight out of storage nodes.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-bold">
          {infraSummary.officeCapacity.map((off, idx) => (
            <div key={idx} className="p-2 border border-neutral-200/70 bg-[#FDFBF9] rounded-xl flex justify-between items-center shadow-2xs">
              <span className="text-neutral-700 font-sans tracking-tight">🏬 {off.office_name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${off.staff_count > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{off.staff_count} STAFF</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}