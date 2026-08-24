import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Lock } from 'lucide-react';
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
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-150">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-neutral-900">Resource Scheduler</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Manage institutional asset schedules and venue reservations.</p>
        </div>
        
        <div className="bg-neutral-200/60 p-1 rounded-xl flex items-center gap-1 font-bold text-xs">
          {['Van', 'Multimedia Room', 'Gymnasium'].map((fac) => (
            <button 
              key={fac} 
              onClick={() => setActiveFacility(fac)}
              className={`px-4 py-2 rounded-lg uppercase tracking-wide transition-all ${
                activeFacility === fac ? 'bg-red-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {fac === 'Van' ? 'Vehicles' : fac}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h4 className="text-base font-black tracking-tight text-neutral-900">
              {activeFacility} Schedule — <span className="text-red-800">{monthNames[month]} {year}</span>
            </h4>
            
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-600 rounded-sm"></span> Reserved</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-600 rounded-sm"></span> Confirmed</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex gap-1 border rounded-lg p-1 bg-neutral-50">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-white rounded transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-white rounded transition-colors"><ChevronRight size={16} /></button>
            </div>
            <button onClick={() => setShowFormModal(true)} className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors">
              <Plus size={14} /> New Request
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase text-neutral-400 tracking-wider border-b pb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={index} className="bg-neutral-50/50 border border-dashed border-neutral-100 rounded-xl min-h-[110px]"></div>;
          
          const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPastDate = dayString < todayString; 
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
              
              className={`border rounded-xl p-2 min-h-[110px] flex flex-col justify-between transition-colors ${
                activeBlock || isPastDate 
                  ? 'bg-neutral-50/50 border-neutral-200 cursor-not-allowed opacity-70' 
                  : 'bg-white border-neutral-200 hover:border-red-300 cursor-pointer'
              }`}
              onClick={() => {
                if (!activeBlock && !isPastDate) {
                  setForm({ ...form, reservationDate: dayString });
                  setShowFormModal(true); 
                }
              }}
            >
              <div className="flex justify-between items-start">
              <span className={`text-xs font-black block ${
                  activeBlock 
                    ? 'text-red-800' 
                    : form.reservationDate === dayString 
                      ? 'bg-red-800 text-white w-5 h-5 flex items-center justify-center rounded-full' 
                      : isPastDate 
                        ? 'text-neutral-300' 
                        : 'text-neutral-400'
                }`}>
                  {day}
                </span>
              </div>
              
              {activeBlock ? (
                <div className="bg-white border border-red-200 p-1.5 rounded-lg text-center mt-auto">
                  <Lock size={12} className="mx-auto text-red-700 mb-0.5" />
                  <span className="text-[8px] font-black uppercase text-red-800 leading-tight block">Admin Override: {activeBlock.reason}</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1 mt-1 max-h-[85px] scrollbar-thin">
                  {matches.map((b, idx) => {
                    const isConfirmed = b.status?.toLowerCase() === 'confirmed' || b.status?.toLowerCase() === 'approved';
                    return (
                      <div key={idx} className={`p-1.5 rounded-lg border text-[10px] font-bold text-left leading-tight transition-colors ${
                        isConfirmed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        <p className="truncate uppercase font-black">{b.purpose}</p>
                        <p className="text-[9px] opacity-80 mt-0.5 truncate">
                          {b.booking_type === 'Vehicle' ? `🚍 Dest: ${b.destination || 'Campus'}` : `⏱️ ${b.gm_start?.substring(0,5)} - ${b.gm_end?.substring(0,5)}`}
                        </p>
                        <span className="text-[8px] block opacity-60 font-medium truncate">By: {b.full_name}</span>
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

      <div className="border border-neutral-200 bg-white rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-black uppercase tracking-wider mb-4 text-neutral-400 flex items-center gap-1.5">📊 Logistics Inventory <span className="text-[9px] px-2 py-0.5 bg-neutral-100 rounded-full font-black text-neutral-500 tracking-normal">View Only</span></h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inventory.map((item) => (
            <div key={item.asd_id} className="border border-neutral-200 rounded-xl p-4 flex items-center justify-between bg-[#FDFBF9]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 text-red-800 rounded-xl font-bold text-xl">
                  {item.asset_name.includes('Chairs') ? '🪑' : '🪵'}
                </div>
                <div>
                  <p className="font-bold text-neutral-800 text-xs uppercase tracking-wide">{item.asset_name}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Quantities manually managed via GSO Admin accounts</p>
                </div>
              </div>
              <div className="text-right">
              <p className="text-2xl font-black text-neutral-900 tracking-tight">{item.current_stock} <span className="text-sm text-neutral-400">/ {item.capacity}</span></p>                <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Total Available</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL INJECTION - Replaces the inline code block */}
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