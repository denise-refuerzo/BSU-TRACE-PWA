import React, { useState } from 'react';
import { User, Building, Car, Landmark, Archive, FileText, Inbox, Clock, AlertTriangle, CheckCircle, BarChart2, Activity } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { baseChartOptions, buildForecastChartData, forecastChartOptions } from '../analyticsCharts';
import CompletedDocumentsModal from '../../../shared/modals/CompletedDocumentsModal';

export default function GSODashboardTab({
  userName,
  gsoOfficeName,
  expectedIncomingCount,
  pendingDocsList,
  archivedDocsList,
  completedDocsList,
  reservationsList,
  equipmentInventory,
  filterStatus,
  setFilterStatus,
  dashboardPage,
  setDashboardPage,
  totalDashPages,
  handleOpenDetails,
  setActiveTab,
  handleNavigateToProcurement,
  handleOpenIncomingModal,
  processedBottleneckData,
  bottleneckSort,
  setBottleneckSort,
  demandTimeFilter,
  setDemandTimeFilter,
  chartReadyDemandData
}) {
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);

  // Chart configs
  const bottleneckChartData = {
    labels: (processedBottleneckData || []).map(row => row.office_name),
    datasets: [{
      label: 'Delay (hours)',
      data: (processedBottleneckData || []).map(row => Number(row.dwell_time_hours || 0)),
      backgroundColor: '#991b1b',
      borderRadius: 6
    }]
  };

  const bottleneckChartOptions = { ...baseChartOptions, indexAxis: 'y', plugins: { ...baseChartOptions.plugins, legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 9 } } }, y: { grid: { display: false }, ticks: { font: { size: 9, weight: 600 } } } } };

  const forecastChartData = buildForecastChartData(chartReadyDemandData || [], true);
  const projectionInfo = (chartReadyDemandData || []).find(row => row.model_note);

  // Kanban Columns
  const kanbanColumns = [
    { id: 'Pending', label: 'Pending Docs', docs: pendingDocsList, color: 'border-t-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: <Clock size={16} /> },
    { id: 'Archived', label: 'Action Required', docs: archivedDocsList, color: 'border-t-[#D32F2F] dark:border-t-red-500', text: 'text-[#D32F2F] dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: <AlertTriangle size={16} /> }
  ];

  return (
    <div className="space-y-4 max-w-full mx-auto text-left animate-in fade-in duration-200 pb-6">      
        {/* HEADER SECTION: Profile & KPIs */}
        <div className="flex flex-col md:flex-row gap-4 shrink-0">
          <div className="flex-1 bg-white dark:bg-[#180e10] p-7 rounded-xl border border-gray-200 dark:border-[#42292f] shadow-sm flex items-start gap-4">
            <div className="bg-gray-100 dark:bg-[#2b1317] p-3 rounded-lg border border-gray-200 dark:border-[#42292f] shrink-0 mt-0.5">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight truncate w-full">{userName}</h3>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5 truncate w-full">GSO Admin / {gsoOfficeName}</p>
              <button 
                onClick={() => setActiveTab('profile')} 
                className="px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white rounded-md text-[11px] font-bold hover:bg-black dark:hover:bg-gray-700 transition-colors shrink-0 whitespace-nowrap"
              >
                Edit Profile &rarr;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex gap-3 shrink-0">
            <div 
              onClick={handleOpenIncomingModal}
              className="w-full md:w-36 lg:w-80 bg-white dark:bg-[#180e10] p-3 rounded-xl border-t-4 border-t-blue-500 border-x border-b border-gray-200 dark:border-x-[#42292f] dark:border-b-[#42292f] shadow-sm flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-all active:scale-95 text-center"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Inbox size={14} className="text-blue-500 shrink-0" />
                <span className="text-[12px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">Incoming</span>
              </div>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{String(expectedIncomingCount || 0).padStart(2, '0')}</p>
            </div>

            <div 
              onClick={() => setIsCompletedModalOpen(true)}
              className="w-full md:w-36 lg:w-80 bg-white dark:bg-[#180e10] p-3 rounded-xl border-t-4 border-t-emerald-500 border-x border-b border-gray-200 dark:border-x-[#42292f] dark:border-b-[#42292f] shadow-sm flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-all active:scale-95 text-center"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                <span className="text-[12px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">Completed</span>
              </div>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{String(completedDocsList.length).padStart(2, '0')}</p>
            </div>
          </div>
        </div>

        {/* ANALYTICS & FACILITIES COLLAPSED INTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Van Books', val: reservationsList.filter(r => r.booking_type === 'Vehicle').length, icon: <Car size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400', target: 'vehicle' },
              { label: 'Gym Books', val: reservationsList.filter(r => r.booking_type === 'Gymnasium').length, icon: <Landmark size={20} />, bg: 'bg-orange-50 dark:bg-orange-900/20', color: 'text-orange-600 dark:text-orange-400', target: 'gym' },
              { label: 'Room Books', val: reservationsList.filter(r => r.booking_type === 'Room').length, icon: <Building size={20} />, bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600 dark:text-purple-400', target: 'multimedia' },
              { label: 'Chairs', val: equipmentInventory.find(i => i.asset_name.toLowerCase().includes('chair'))?.capacity || 0, icon: <Archive size={20} />, bg: 'bg-teal-50 dark:bg-teal-900/20', color: 'text-teal-600 dark:text-teal-400', target: 'logistics' },
            ].map((item, idx) => (
              <div key={idx} onClick={() => handleNavigateToProcurement && handleNavigateToProcurement(item.target)} className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] p-3 rounded-xl shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-all active:scale-95">
                <div className={`w-10 h-10 rounded-lg ${item.bg} ${item.color} flex items-center justify-center shrink-0 shadow-sm`}>{item.icon}</div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{item.val}</p>
                  <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wide mt-1 block truncate">{item.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-xl p-4 shadow-sm flex flex-col min-h-56">
            <div className="mb-2 flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase flex items-center gap-1.5 tracking-wide">
                <BarChart2 className="text-purple-600 dark:text-purple-400" size={14} /> Avg. Processing Delay
              </h3>
              <select value={bottleneckSort} onChange={event => setBottleneckSort?.(event.target.value)} className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1113] p-1 text-[9px] font-bold uppercase outline-none dark:text-gray-300">
                <option value="desc">High</option>
                <option value="asc">Low</option>
              </select>
            </div>
            <div className="flex-1 min-h-[140px]">
              {!!processedBottleneckData?.length && <Bar data={bottleneckChartData} options={bottleneckChartOptions} />}
            </div>
          </div>
        </div>
        
      {/* Predictive Analytics / Forecast Widget */}
      <div className="lg:col-span-2 bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-xl p-4 shadow-sm flex flex-col min-h-56 hover:shadow-md transition-shadow sm:h-64 lg:h-80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
          <h3 className="text-[11px] font-bold text-gray-900 dark:text-white uppercase flex items-center gap-1.5 tracking-wide">
            <Activity className="text-indigo-600 dark:text-indigo-400" size={14} /> Short-Term Demand Projection
          </h3>
          <select 
            value={demandTimeFilter} 
            onChange={e => setDemandTimeFilter && setDemandTimeFilter(Number(e.target.value))} 
            className="w-full text-[9px] font-bold uppercase bg-gray-50 dark:bg-[#1c1113] border border-gray-200 dark:border-gray-700 rounded p-1 outline-none cursor-pointer sm:w-auto dark:text-gray-300"
          >
            <option value={2}>2 Months</option>
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={9}>9 Months</option>
            <option value={12}>12 Months</option>
          </select>
        </div>

        {projectionInfo?.model_note && (
          <p className="mb-2 rounded-md bg-amber-50 dark:bg-amber-900/20 px-2 py-1 text-[9px] font-medium leading-snug text-amber-900 dark:text-amber-200">
            {projectionInfo.model_note}
          </p>
        )}
        <div className="flex-1 min-h-0">
          {!!chartReadyDemandData?.length && <Line data={forecastChartData} options={forecastChartOptions} />}
          {!chartReadyDemandData?.length && (
            <div className="flex h-full items-center justify-center text-center text-[10px] font-bold text-gray-400 dark:text-gray-500">
              No booking history is available.
            </div>
          )}
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory custom-scrollbar pb-2 pt-1">
        {kanbanColumns.map((col) => {
          const isFiltered = filterStatus !== 'All' && filterStatus !== col.id;
          return (
            <div 
              key={col.id} 
              className={`w-[85vw] sm:w-80 md:w-auto md:flex-1 shrink-0 flex flex-col bg-gray-50/80 dark:bg-[#1f1214] rounded-xl border border-gray-200 dark:border-[#42292f] overflow-hidden transition-opacity snap-start ${isFiltered ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
            >
              <div 
                onClick={() => { setFilterStatus(prev => prev === col.id ? 'All' : col.id); setDashboardPage(1); }}
                className={`p-3 border-b border-gray-200 dark:border-[#42292f] bg-white dark:bg-[#2b1317] border-t-4 ${col.color} flex justify-between items-center shrink-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2b1317]/80 transition-colors`}
              >
                <h4 className={`text-xs font-black uppercase flex items-center gap-1.5 ${col.text} truncate pr-2`}>
                  {col.icon} {col.label}
                </h4>
                <span className={`${col.bg} ${col.text} text-[10px] font-black px-2 py-0.5 rounded-full border border-current/20 shrink-0`}>
                  {col.docs.length}
                </span>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {col.docs.length > 0 ? (
                  col.docs.map((doc, idx) => (
                    <div 
                      key={doc.ini_id || idx}
                      onClick={() => handleOpenDetails(doc, false)}
                      className="bg-white dark:bg-[#180e10] p-3 rounded-lg border border-gray-200 dark:border-[#42292f] shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500 transition-all cursor-pointer group flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#D32F2F] dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                          {doc.title}
                        </h5>
                        <FileText size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      </div>
                      <span className="w-max px-2 py-0.5 bg-gray-100 dark:bg-[#2b1317] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#42292f] font-bold text-[9px] uppercase tracking-wider rounded">
                        {doc.process_name || 'GENERAL FORM'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 space-y-2 opacity-50 py-8">
                    {col.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CompletedDocumentsModal 
        isOpen={isCompletedModalOpen} 
        onClose={() => setIsCompletedModalOpen(false)} 
        documents={completedDocsList}
        onDocumentClick={doc => handleOpenDetails(doc, false)}
      />
    </div>
  );
}