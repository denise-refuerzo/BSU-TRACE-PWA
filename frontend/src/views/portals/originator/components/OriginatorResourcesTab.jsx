import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Lock, Calendar, Truck, Presentation, MonitorPlay, Users, MapPin, Box } from 'lucide-react';
import { fetchWithAuth } from "../../../../api";
import ResourceBookingModal from '../modals/ResourceBookingModal';

export default function OriginatorResourcesTab({ userId }) {
  const userName = localStorage.getItem('user') || 'Faculty User';
  
  const [activeFacility, setActiveFacility] = useState('Gymnasium');
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [showFormModal, setShowFormModal] = useState(false);
  
  const todayObj = new Date();
  const todayString = todayObj.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const currentTimeString = `${String(todayObj.getHours()).padStart(2, '0')}:${String(todayObj.getMinutes()).padStart(2, '0')}`;

  const [form, setForm] = useState({
    reservationDate: '', purpose: '', department: 'CICS',
    startTime: '', endTime: '', expectedAttendees: '',
    destination: '', passengerCount: '', serviceTypeId: '3', pickUpTime: '', dropOffTime: ''
  });

  const [blackouts, setBlackouts] = useState([]);

  useEffect(() => {
    fetchActiveReservations();
    fetchInventoryMetrics();
    fetchBlackouts(); 
  }, [activeFacility]);

  const fetchBlackouts = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/resources/blackouts');
      const data = await res.json();
      if (res.ok) setBlackouts(data);
    } catch (err) { console.error(err); }
  };

  const fetchActiveReservations = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/resources/bookings');
      const data = await res.json();
      if (res.ok) setBookings(data);
    } catch (err) { console.error("Error connecting calendar rows:", err); }
  };

  const fetchInventoryMetrics = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/resources/inventory');
      const data = await res.json();
      if (res.ok) setInventory(data);
    } catch (err) { console.error(err); }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const typeMapping = { 'Gymnasium': 'Gymnasium', 'Multimedia Room': 'Room', 'Van': 'Vehicle' };
    
    if (activeFacility !== 'Van' && form.startTime >= form.endTime) {
      return alert("Invalid Timeline: End time must fall strictly after start time coordinates.");
    }

    const payload = {
      userId: parseInt(userId),
      bookingType: typeMapping[activeFacility],
      assetName: activeFacility,
      ...form
    };

    try {
      const res = await fetchWithAuth('http://localhost:5000/api/resources/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("🎉 Reservation successfully registered in system! Current status: Reserved.");
        setShowFormModal(false);
        setForm({ reservationDate: '', purpose: '', department: 'CICS', startTime: '', endTime: '', expectedAttendees: '', destination: '', passengerCount: '', serviceTypeId: '3', pickUpTime: '', dropOffTime: '' });
        fetchActiveReservations();
      } else {
        const err = await res.json();
        alert(err.error || "Submission rejected.");
      }
    } catch (err) { console.error(err); }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const calendarDays = Array.from({ length: firstDayIndex }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  useEffect(() => {
    const handleRefresh = () => fetchActiveReservations();
    window.addEventListener('refreshReservations', handleRefresh);
    return () => window.removeEventListener('refreshReservations', handleRefresh);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* HEADER & TABS SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-gray-900">Resource Scheduler</h3>
          <p className="text-sm text-gray-500 mt-1">Manage institutional asset schedules and venue reservations.</p>
        </div>
        
        <div className="bg-gray-100/80 p-1.5 rounded-xl flex flex-wrap items-center gap-1.5 font-bold text-xs shadow-inner">
          {[
            { id: 'Van', label: 'Vehicles', icon: <Truck size={14} /> },
            { id: 'Multimedia Room', label: 'Multimedia Room', icon: <MonitorPlay size={14} /> },
            { id: 'Gymnasium', label: 'Gymnasium', icon: <Users size={14} /> }
          ].map((fac) => (
            <button 
              key={fac.id} 
              onClick={() => setActiveFacility(fac.id)}
              className={`px-4 py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeFacility === fac.id 
                  ? 'bg-white text-[#D32F2F] shadow-sm border border-gray-200 ring-1 ring-gray-100' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 border border-transparent'
              }`}
            >
              {fac.icon}
              {fac.label}
            </button>
          ))}
        </div>
      </div>

      {/* CALENDAR SECTION */}
      <div className="bg-white border-t-4 border-t-[#D32F2F] border-x border-b border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-100 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-5">
            <h4 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Calendar className="text-[#D32F2F]" size={20} strokeWidth={2.5} />
              {activeFacility === 'Van' ? 'Vehicles' : activeFacility} Schedule — <span className="text-[#D32F2F]">{monthNames[month]} {year}</span>
            </h4>
            
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-100 border border-red-300 rounded-sm inline-block"></span> Reserved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 rounded-sm inline-block"></span> Confirmed
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 border border-gray-300 rounded-lg p-1 bg-white shadow-sm">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-md transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-md transition-colors cursor-pointer"><ChevronRight size={16} /></button>
            </div>
            <button onClick={() => setShowFormModal(true)} className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs uppercase tracking-wide rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer">
              <Plus size={16} strokeWidth={2.5} /> New Request
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase text-gray-400 tracking-wider">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={d} className={`pb-2 ${i === 0 || i === 6 ? 'text-red-400' : ''}`}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={index} className="bg-gray-50/50 border border-dashed border-gray-200 rounded-xl min-h-[120px]"></div>;
          
          const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPastDate = dayString < todayString; 
          const isToday = dayString === todayString;
          
          const matches = bookings.filter(b => {
            const dateObj = new Date(b.reservation_date);
            const localDateString = dateObj.toLocaleDateString('en-CA', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }).replace(/\//g, '-');
            const isDateMatch = localDateString === dayString;
            
            let isAssetMatch = false;
            if (activeFacility === 'Van') {
              isAssetMatch = b.booking_type === 'Vehicle';
            } else if (activeFacility === 'Multimedia Room') {
              isAssetMatch = b.booking_type === 'Room';
            } else if (activeFacility === 'Gymnasium') {
              isAssetMatch = b.booking_type === 'Gymnasium';
            }
            
            return isDateMatch && isAssetMatch;
          });
          
          const activeBlock = blackouts.find(blk => {
            if (blk.asset_name !== activeFacility) return false;
            const start = new Date(blk.start_time).toISOString().split('T')[0];
            const end = new Date(blk.end_time).toISOString().split('T')[0];
            return dayString >= start && dayString <= end;
          });

          return (
            <div 
              key={index} 
              className={`border rounded-xl p-2 min-h-[120px] flex flex-col justify-between transition-all group ${
                activeBlock 
                  ? 'bg-red-50/30 border-red-200 cursor-not-allowed' 
                  : isPastDate 
                    ? 'bg-gray-50/80 border-gray-200 cursor-not-allowed opacity-75' 
                    : isToday
                      ? 'bg-red-50/10 border-[#D32F2F] shadow-sm hover:shadow-md cursor-pointer'
                      : 'bg-white border-gray-200 hover:border-[#D32F2F] hover:shadow-sm cursor-pointer'
              }`}
              onClick={() => {
                if (!activeBlock && !isPastDate) {
                  setForm({ ...form, reservationDate: dayString });
                  setShowFormModal(true); 
                }
              }}
            >
              <div className="flex justify-between items-start">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                  activeBlock 
                    ? 'text-red-700 bg-red-100' 
                    : form.reservationDate === dayString 
                      ? 'bg-[#D32F2F] text-white shadow-sm' 
                      : isToday
                        ? 'bg-red-100 text-[#D32F2F]'
                        : isPastDate 
                          ? 'text-gray-400' 
                          : 'text-gray-700 group-hover:text-[#D32F2F] group-hover:bg-red-50'
                }`}>
                  {day}
                </span>
                
                {/* Optional Plus Icon on Hover for valid days */}
                {!activeBlock && !isPastDate && (
                  <span className="opacity-0 group-hover:opacity-100 text-gray-300">
                    <Plus size={14} />
                  </span>
                )}
              </div>
              
              {activeBlock ? (
                <div className="bg-white border border-red-200 p-2 rounded-lg text-center mt-auto shadow-sm">
                  <Lock size={12} className="mx-auto text-[#D32F2F] mb-1" />
                  <span className="text-[9px] font-black uppercase text-[#D32F2F] leading-tight block">Admin Override: {activeBlock.reason}</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 max-h-[85px] custom-scrollbar pr-0.5">
                  {matches.map((b, idx) => {
                    const isConfirmed = b.status?.toLowerCase() === 'confirmed' || b.status?.toLowerCase() === 'approved';
                    return (
                      <div key={idx} className={`p-1.5 rounded-md border text-[10px] text-left leading-tight transition-all shadow-sm ${
                        isConfirmed 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        <p className="truncate uppercase font-bold">{b.purpose}</p>
                        
                        <div className="flex items-center gap-1 mt-1 font-medium opacity-90">
                          {b.booking_type === 'Vehicle' ? (
                            <>
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{b.destination || 'Campus'}</span>
                            </>
                          ) : (
                            <>
                              <Calendar size={10} className="shrink-0" />
                              <span className="truncate">{b.gm_start?.substring(0,5)} - {b.gm_end?.substring(0,5)}</span>
                            </>
                          )}
                        </div>
                        
                        <span className="text-[8.5px] block opacity-70 font-semibold truncate mt-1 pt-1 border-t border-black/10">
                          {b.full_name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* LOGISTICS INVENTORY PANEL */}
      <div className="border border-gray-200 bg-white rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
          <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            Logistics Inventory
          </h4>
          <span className="text-[10px] px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md font-bold text-gray-500 uppercase tracking-wider shadow-sm">
            View Only
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {inventory.map((item) => (
            <div key={item.asd_id} className="border border-gray-200 rounded-xl p-5 flex items-center justify-between bg-gray-50 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 border border-red-100 text-[#D32F2F] rounded-xl font-bold shadow-sm group-hover:scale-105 transition-transform">
                  <Box size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm uppercase tracking-wide">{item.asset_name}</p>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">Managed via GSO Admin accounts</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-gray-900 tracking-tight leading-none">{item.current_stock}</span>
                  <span className="text-sm font-bold text-gray-400 leading-none">/ {item.capacity}</span>
                </div>
                <span className="text-[9px] text-gray-500 block font-bold uppercase tracking-wider mt-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                  Available
                </span>
              </div>
            </div>
          ))}
          
          {inventory.length === 0 && (
            <div className="col-span-full text-center py-6">
              <p className="text-sm text-gray-500 font-medium">No inventory metrics available to display.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL INJECTION */}
      {showFormModal && (
        <ResourceBookingModal 
          activeFacility={activeFacility} 
          setShowFormModal={setShowFormModal} 
          handleBookingSubmit={handleBookingSubmit} 
          userName={userName} 
          todayString={todayString} 
          currentTimeString={currentTimeString} 
          form={form} 
          setForm={setForm} 
        />
      )}

    </div>
  );
}