import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Lock, Calendar, MapPin, Box, Search, Eye, Truck, MonitorPlay, Users } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from "../../../api";
import { createRealtimeClient } from '../../../utils/realtimeClient';
import Swal from 'sweetalert2';
import {blockOnDay,blockMatchesResource} from '../../../utils/resourceSchedule';
import ResourceDayModal from './request-facilities/ResourceDayModal';
import ResourceBookingModal from './request-facilities/ResourceBookingModal';
import SubmittedRequestDetailsModal from './request-facilities/SubmittedRequestDetailsModal';

export default function RequestFacilitiesPage({ userId, officeName = '', facility = null, view = 'calendar' }) {
  const userName = localStorage.getItem('user') || 'Faculty User';
  
  const [selectedFacility, setSelectedFacility] = useState('Gymnasium');
  const activeFacility = facility || selectedFacility;
  const [bookings, setBookings] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [facilityOptions, setFacilityOptions] = useState([]);
  const [facilityOptionsLoading, setFacilityOptionsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDay, setSelectedDay] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatus, setRequestStatus] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [signatories, setSignatories] = useState(null);
  
  const todayObj = new Date();
  const todayString = todayObj.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const currentTimeString = `${String(todayObj.getHours()).padStart(2, '0')}:${String(todayObj.getMinutes()).padStart(2, '0')}`;

  const [form, setForm] = useState({
    reservationDate: '', purpose: '', department: officeName, intendedDates: [''], facilityDetails: {},
    startTime: '', endTime: '', expectedAttendees: '', assetName: '',
    destination: '', officialPassengers: [''], preparedByName: '', preparedByPosition: '',
    recommendingApprovalOfficeId: '', recommendingApprovalUserId: '',
    approvedByOfficeId: '', approvedByUserId: '', serviceTypeId: '3', pickUpTime: '', dropOffTime: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [blackouts, setBlackouts] = useState([]);

  const fetchBlackouts = async () => {
    try {
      const res = await fetchWithAuth('/api/resources/schedule-blocks');
      const data = await res.json();
      if (res.ok) setBlackouts(data);
    } catch (err) { console.error(err); }
  };

  const fetchActiveReservations = async () => {
    try {
      const res = await fetchWithAuth('/api/resources/bookings');
      const data = await res.json();
      if (res.ok) setBookings(data);
    } catch (err) { console.error("Error connecting calendar rows:", err); }
  };

  const fetchInventoryMetrics = async () => {
    try {
      const res = await fetchWithAuth('/api/resources/inventory');
      const data = await res.json();
      if (res.ok) setInventory(data);
    } catch (err) { console.error(err); }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await fetchWithAuth('/api/resources/my-requests');
      const data = await res.json();
      if (res.ok) setMyRequests(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Could not load submitted facility requests:', err); }
  };

  const fetchSignatories = async () => {
    try {
      const response = await fetchWithAuth('/api/account-access/me/booking-signatories');
      const data = await response.json();
      if (response.ok) {
        setSignatories(data);
        setForm(previous => ({
          ...previous,
          preparedByName: data.requestedBy?.name || '',
          preparedByPosition: data.requestedBy?.position || data.requestedBy?.officeName || '',
          recommendingApprovalOfficeId: data.offices?.some(office => String(office.officeId) === String(previous.recommendingApprovalOfficeId)) ? previous.recommendingApprovalOfficeId : '',
          recommendingApprovalUserId: data.offices?.some(office => String(office.officeId) === String(previous.recommendingApprovalOfficeId) && office.recommenders.some(person => String(person.userId) === String(previous.recommendingApprovalUserId))) ? previous.recommendingApprovalUserId : '',
          approvedByOfficeId: data.offices?.some(office => String(office.officeId) === String(previous.approvedByOfficeId)) ? previous.approvedByOfficeId : '',
          approvedByUserId: data.offices?.some(office => String(office.officeId) === String(previous.approvedByOfficeId) && office.approvers.some(person => String(person.userId) === String(previous.approvedByUserId))) ? previous.approvedByUserId : '',
          facilityDetails: {
            ...previous.facilityDetails,
            requestedByName: data.requestedBy?.name || '',
            requestedByPosition: data.requestedBy?.officeName || ''
          }
        }));
      }
    } catch (error) {
      console.error('Unable to load assigned approvers:', error);
    }
  };

  useEffect(() => {
    const refreshId = window.setTimeout(() => {
      fetchActiveReservations();
      fetchInventoryMetrics();
      fetchBlackouts();
      fetchMyRequests();
      fetchSignatories();
    }, 0);
    return () => window.clearTimeout(refreshId);
  }, [activeFacility, view]);

  useEffect(() => {
    if (!userId || userId === 'undefined') return;
    const socket = createRealtimeClient(API_BASE_URL, { secure: true, reconnection: true });
    const refreshResources = () => {
      fetchActiveReservations();
      fetchInventoryMetrics();
      fetchBlackouts();
      fetchMyRequests();
    };
    socket.on('connect', () => {
      socket.emit('join-resource-room');
      socket.emit('join-user-room', userId);
    });
    socket.on('resource-schedule-updated', refreshResources);
    socket.on('account-access-updated', fetchSignatories);
    return () => socket.disconnect();
  }, [userId]);

  const facilityScheduleReady = activeFacility !== 'Van' && !form.intendedDates.some(date => !date) &&
    Boolean(form.startTime) && Boolean(form.endTime) && form.startTime < form.endTime;

  useEffect(() => {
    if (!facilityScheduleReady) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setFacilityOptionsLoading(true);
      try {
        const query = new URLSearchParams({type: activeFacility === 'Multimedia Room' ? 'Room' : 'Gymnasium', dates: form.intendedDates.join(','), start: form.startTime, end: form.endTime});
        const response = await fetchWithAuth(`/api/resources/available-facilities?${query}`);
        const data = await response.json();
        if (active && response.ok) {
          setFacilityOptions(Array.isArray(data) ? data : []);
          setForm(previous => ({...previous, assetName: data.some(option => option.asset_name === previous.assetName) ? previous.assetName : ''}));
        }
      } finally { if (active) setFacilityOptionsLoading(false); }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activeFacility, facilityScheduleReady, form.intendedDates, form.startTime, form.endTime]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const typeMapping = { 'Gymnasium': 'Gymnasium', 'Multimedia Room': 'Room', 'Van': 'Vehicle' };
    
    if (activeFacility !== 'Van' && form.startTime >= form.endTime) {
      return alert("Invalid Timeline: End time must fall strictly after start time coordinates.");
    }

    if (activeFacility === 'Van') {
      if (![form.department, form.purpose, ...form.officialPassengers].every(value => value.trim())) {
        return alert('Please complete the requesting unit, travel purpose, and passenger names.');
      }
      if (form.pickUpTime >= form.dropOffTime) {
        return alert('Estimated arrival must be after estimated departure.');
      }
    }

    if (activeFacility !== 'Van') {
      const details = form.facilityDetails;
      if (!details.purposes?.length || !details.participants?.length) {
        return Swal.fire({icon: 'warning', title: 'Complete the form', text: 'Select at least one purpose and participant category.'});
      }
      if (new Set(form.intendedDates).size !== form.intendedDates.length) {
        return Swal.fire({icon: 'warning', title: 'Duplicate dates', text: 'Please select each intended date only once.'});
      }
    }

    const payload = {
      bookingType: typeMapping[activeFacility],
      assetName: activeFacility === 'Van' ? activeFacility : form.assetName,
      ...form,
      ...(activeFacility !== 'Van' ? {purpose: form.facilityDetails.purposes.map(value => value === 'Others' ? form.facilityDetails.purposesOther : value).join(', ')} : {})
    };

    setIsSubmitting(true);
    try {
      const confirmation = await Swal.fire({icon:'question',title:'Submit this request?',text:'This sends your request to GSO for review. Confirmation requires submitting the necessary documents in person.',showCancelButton:true,confirmButtonText:'Submit request',confirmButtonColor:'#991b1b'});
      if (!confirmation.isConfirmed) return;
      const res = await fetchWithAuth('/api/resources/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowFormModal(false);
        setForm({ reservationDate: '', purpose: '', department: officeName, intendedDates: [''], facilityDetails: {
          requestedByName: signatories?.requestedBy?.name || '', requestedByPosition: signatories?.requestedBy?.position || signatories?.requestedBy?.officeName || ''
        }, startTime: '', endTime: '', expectedAttendees: '', assetName: '', destination: '', officialPassengers: [''],
        preparedByName: signatories?.requestedBy?.name || '', preparedByPosition: signatories?.requestedBy?.position || signatories?.requestedBy?.officeName || '',
        recommendingApprovalOfficeId: '', recommendingApprovalUserId: '', approvedByOfficeId: '', approvedByUserId: '',
        serviceTypeId: '3', pickUpTime: '', dropOffTime: '' });
        fetchActiveReservations();
        await Swal.fire({
          icon: 'success',
          title: 'Request submitted successfully',
          text: 'This submission is a request only and does not confirm your booking. Please submit the necessary documents in person at the GSO office. Your request remains subject to review and confirmation.',
          confirmButtonText: 'Understood',
          confirmButtonColor: '#991b1b'
        });
      } else {
        const err = await res.json();
        await Swal.fire({icon: 'error', title: 'Request not submitted', text: err.error || 'Submission rejected.'});
      }
    } catch (err) {
      console.error(err);
      await Swal.fire({icon: 'error', title: 'Submission could not be verified', text: 'Check your requests before retrying.'});
    } finally { setIsSubmitting(false); }
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

  const statusOptions = ['All', ...new Set(myRequests.map(item => item.status).filter(Boolean))];
  const visibleRequests = myRequests.filter(item => {
    const term = requestSearch.trim().toLowerCase();
    const matchesSearch = !term || [item.booking_id, item.booking_type, item.asset_name, item.purpose, item.department, item.destination]
      .some(value => String(value || '').toLowerCase().includes(term));
    return matchesSearch && (requestStatus === 'All' || item.status === requestStatus);
  });
  const requestTypeLabel = type => type === 'Room' ? 'Room' : type === 'Vehicle' ? 'Vehicle' : 'Gymnasium';
  const requestStatusClass = status => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'confirmed' || normalized === 'approved') return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    if (normalized === 'declined' || normalized === 'rejected' || normalized === 'cancelled') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  };
  const formatRequestDate = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (view === 'requests') {
    return (
      <div className="space-y-5 max-w-7xl mx-auto text-left animate-in fade-in duration-200">
        <div className="trace-section-banner rounded-2xl border border-gray-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] p-5 shadow-sm sm:p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Track the latest review status and assignment details for facility and vehicle requests from this account.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 dark:border-[#42292f] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 bg-gray-50/50 dark:bg-[#1c1113]">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">Request Status</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Updates appear automatically when GSO changes a request.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={requestSearch} onChange={event => setRequestSearch(event.target.value)} placeholder="Search requests..." className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-gray-900 dark:text-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-600 sm:w-64" />
              </label>
              <select value={requestStatus} onChange={event => setRequestStatus(event.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-red-600 cursor-pointer">
                {statusOptions.map(status => <option key={status}>{status === 'All' ? 'All statuses' : status}</option>)}
              </select>
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-red-50/60 dark:bg-[#2b1317] text-[11px] uppercase tracking-wide text-red-900 dark:text-red-300 border-b border-gray-200 dark:border-[#42292f]">
                <tr><th className="px-5 py-3">Request</th><th className="px-5 py-3">Date and time</th><th className="px-5 py-3">Purpose</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleRequests.map(item => (
                  <tr key={item.booking_id} className="hover:bg-gray-50/70 dark:hover:bg-[#2b1317]/45 transition-colors">
                    <td className="px-5 py-4"><p className="font-bold text-gray-900 dark:text-white">{requestTypeLabel(item.booking_type)} request</p><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.asset_name || 'Assignment pending'}</p></td>
                    <td className="px-5 py-4"><p className="font-semibold text-gray-800 dark:text-gray-200">{formatRequestDate(item.reservation_date)}</p><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.start_time?.slice(0, 5) || '—'}{item.end_time ? ` – ${item.end_time.slice(0, 5)}` : ''}</p></td>
                    <td className="max-w-xs px-5 py-4 text-gray-600 dark:text-gray-300"><p className="truncate">{item.purpose || '—'}</p></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${requestStatusClass(item.status)}`}>{item.status === 'Reserved' ? 'Pending' : (item.status || 'Pending')}</span></td>
                    <td className="px-5 py-4 text-right"><button onClick={() => setSelectedRequest(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-red-300 hover:text-red-700 dark:hover:text-red-400 cursor-pointer"><Eye size={14} /> Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
            {visibleRequests.map(item => (
              <button key={item.booking_id} onClick={() => setSelectedRequest(item)} className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-[#2b1317]/40">
                <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-gray-900 dark:text-white">{requestTypeLabel(item.booking_type)} request</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatRequestDate(item.reservation_date)} · {item.asset_name || 'Assignment pending'}</p></div><span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase ${requestStatusClass(item.status)}`}>{item.status === 'Reserved' ? 'Pending' : (item.status || 'Pending')}</span></div>
                <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{item.purpose || 'No purpose provided'}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400"><Eye size={13} /> View details</span>
              </button>
            ))}
          </div>

          {visibleRequests.length === 0 && <div className="px-5 py-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">No requests match the current search and status filter.</div>}
        </div>

        <SubmittedRequestDetailsModal request={selectedRequest} officeName={officeName} onClose={() => setSelectedRequest(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left animate-in fade-in duration-200">
      
      <div className="trace-section-banner bg-white dark:bg-[#180e10] p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-[#42292f] shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Check open times, blocked periods, and existing requests before submitting to GSO.</p>
        </div>
        {!facility && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-gray-100/80 dark:bg-[#1c1113] p-1.5 text-xs font-bold shadow-inner">
            {[
              { id: 'Van', label: 'Vehicles', icon: Truck },
              { id: 'Multimedia Room', label: 'Rooms', icon: MonitorPlay },
              { id: 'Gymnasium', label: 'Gymnasium', icon: Users }
            ].map(item => (
              <button key={item.id} onClick={() => setSelectedFacility(item.id)} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 uppercase tracking-wider transition-all cursor-pointer ${activeFacility === item.id ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2b1317] text-[#D32F2F] dark:text-red-400 shadow-sm' : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
                <item.icon size={14} /> {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CALENDAR SECTION */}
      <div className="bg-white dark:bg-[#180e10] border-t-4 border-t-[#D32F2F] dark:border-t-red-600 border-x border-b border-gray-200 dark:border-[#42292f] rounded-2xl shadow-sm p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-100 dark:border-[#42292f] pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-5">
            <h4 className="text-base sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
              <Calendar className="text-[#D32F2F] dark:text-red-400" size={20} strokeWidth={2.5} />
              {activeFacility === 'Van' ? 'Vehicles' : activeFacility} Schedule — <span className="text-[#D32F2F] dark:text-red-400">{monthNames[month]} {year}</span>
            </h4>
            
            <div className="flex items-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1c1113] px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-sm inline-block"></span> Pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 rounded-sm inline-block"></span> Approved
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 border border-gray-300 dark:border-gray-700 rounded-lg p-1 bg-white dark:bg-[#1c1113] shadow-sm">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md transition-colors cursor-pointer"><ChevronRight size={16} /></button>
            </div>
            <button onClick={() => setShowFormModal(true)} className="flex-1 sm:flex-none justify-center px-4 sm:px-5 py-2.5 bg-[#D32F2F] dark:bg-red-700 hover:bg-[#b71c1c] dark:hover:bg-red-800 text-white font-bold text-xs uppercase tracking-wide rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer">
              <Plus size={16} strokeWidth={2.5} /> New Request
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[9px] sm:text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={d} className={`pb-2 ${i === 0 || i === 6 ? 'text-red-400' : ''}`}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={index} className="bg-gray-50/50 dark:bg-[#120b0c] border border-dashed border-gray-200 dark:border-gray-800 rounded-md sm:rounded-xl min-h-[68px] sm:min-h-[120px]"></div>;
          
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
            return blockMatchesResource(blk,activeFacility) && blockOnDay(blk,dayString);
          });

          return (
            <div 
              key={index} 
              className={`border rounded-md sm:rounded-xl p-1 sm:p-2 min-h-[68px] sm:min-h-[120px] flex flex-col justify-between transition-all group ${
                activeBlock 
                  ? 'bg-red-50/30 dark:bg-red-900/20 border-red-200 dark:border-red-900 cursor-pointer'
                  : isPastDate 
                    ? 'bg-gray-50/80 dark:bg-[#180e10]/60 border-gray-200 dark:border-gray-800 cursor-pointer opacity-75'
                    : isToday
                      ? 'bg-red-50/10 dark:bg-red-900/10 border-[#D32F2F] dark:border-red-600 shadow-sm hover:shadow-md cursor-pointer'
                      : 'bg-white dark:bg-[#1c1113] border-gray-200 dark:border-[#42292f] hover:border-[#D32F2F] dark:hover:border-red-500 hover:shadow-sm cursor-pointer'
              }`}
              onClick={() => {
                setSelectedDay(dayString);
                fetchActiveReservations();
                fetchBlackouts();
              }}
            >
              <div className="flex justify-between items-start">
                  <span className={`text-[11px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full transition-colors ${
                  activeBlock 
                    ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50' 
                    : form.reservationDate === dayString 
                      ? 'bg-[#D32F2F] text-white shadow-sm' 
                      : isToday
                        ? 'bg-red-100 dark:bg-red-900/40 text-[#D32F2F] dark:text-red-300'
                        : isPastDate 
                          ? 'text-gray-400 dark:text-gray-600' 
                          : 'text-gray-700 dark:text-gray-300 group-hover:text-[#D32F2F] group-hover:bg-red-50 dark:group-hover:bg-red-900/30'
                }`}>
                  {day}
                </span>
                
                {!activeBlock && !isPastDate && (
                  <span className="hidden sm:inline opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600">
                    <Plus size={14} />
                  </span>
                )}
              </div>
              
              {activeBlock && (
                <div className="bg-white dark:bg-[#180e10] border border-red-200 dark:border-red-900 p-1 sm:p-2 rounded-md sm:rounded-lg text-center mt-auto shadow-sm">
                  <Lock size={11} className="mx-auto text-[#D32F2F] dark:text-red-400 sm:mb-1" />
                  <span className="hidden sm:block text-[9px] font-black uppercase text-[#D32F2F] dark:text-red-400 leading-tight">Closure scheduled: {activeBlock.reason}</span>
                </div>
              )}
              {!activeBlock && matches.length > 0 && (
                <div className="mt-auto flex justify-center sm:hidden"><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${matches.some(b => ['confirmed', 'approved'].includes(b.status?.toLowerCase())) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{matches.length}</span></div>
              )}
              {(
                <div className="hidden sm:block flex-1 overflow-y-auto space-y-1.5 mt-2 max-h-[85px] custom-scrollbar pr-0.5">
                  {matches.map((b, idx) => {
                    const isConfirmed = b.status?.toLowerCase() === 'confirmed' || b.status?.toLowerCase() === 'approved';
                    return (
                      <div key={idx} className={`p-1.5 rounded-md border text-[10px] text-left leading-tight transition-all shadow-sm ${
                        isConfirmed 
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                          : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                      }`}>
                        <p className="truncate uppercase font-bold">{b.purpose}</p>
                        
                        <div className="flex items-center gap-1 mt-1 font-medium opacity-90">
                          {b.booking_type === 'Vehicle' ? (
                            <>
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{b.vr_start?.substring(0,5)} – {b.vr_end?.substring(0,5)}</span>
                            </>
                          ) : (
                            <>
                              <Calendar size={10} className="shrink-0" />
                              <span className="truncate">{b.gm_start?.substring(0,5)} - {b.gm_end?.substring(0,5)}</span>
                            </>
                          )}
                        </div>
                        
                        <span className="text-[8.5px] block opacity-70 font-semibold truncate mt-1 pt-1 border-t border-black/10 dark:border-white/10">
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

      {/* Read-only live equipment count for this request page. */}
      <div className="border border-gray-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-[#42292f] pb-4">
          <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            Equipment Availability
          </h4>
          <span className="text-[10px] px-2.5 py-1 bg-gray-100 dark:bg-[#1c1113] border border-gray-200 dark:border-gray-700 rounded-md font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shadow-sm">
            Live count
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {inventory.map((item) => (
            <div key={item.asd_id} className="border border-gray-200 dark:border-[#42292f] rounded-xl p-5 flex items-center justify-between bg-gray-50 dark:bg-[#1c1113] hover:bg-white dark:hover:bg-[#180e10] hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-[#D32F2F] dark:text-red-400 rounded-xl font-bold shadow-sm group-hover:scale-105 transition-transform">
                  <Box size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">{item.asset_name}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Managed via GSO Admin accounts</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{item.current_stock}</span>
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 leading-none">/ {item.capacity}</span>
                </div>
                <span className="text-[9px] text-gray-500 dark:text-gray-400 block font-bold uppercase tracking-wider mt-1 bg-gray-100 dark:bg-[#180e10] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                  Available
                </span>
              </div>
            </div>
          ))}
          
          {inventory.length === 0 && (
            <div className="col-span-full text-center py-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No equipment availability is currently listed.</p>
            </div>
          )}
        </div>
      </div>

      {selectedDay && <ResourceDayModal key={`${activeFacility}-${selectedDay}`} date={selectedDay} facility={activeFacility} bookings={bookings} blocks={blackouts} today={todayString} onClose={() => setSelectedDay(null)} onRequest={(start, end) => {
        setForm({...form, reservationDate:selectedDay, intendedDates:[selectedDay], startTime:start, endTime:end, pickUpTime:start, dropOffTime:end});
        setSelectedDay(null);
        setShowFormModal(true);
      }} />}
      
      {showFormModal && (
        <ResourceBookingModal 
          activeFacility={activeFacility} 
          setShowFormModal={setShowFormModal} 
          isSubmitting={isSubmitting}
          handleBookingSubmit={handleBookingSubmit} 
          userName={userName} 
          todayString={todayString} 
          currentTimeString={currentTimeString} 
          form={form} 
          setForm={setForm} 
          facilityOptions={facilityScheduleReady ? facilityOptions : []}
          facilityOptionsLoading={facilityOptionsLoading}
          signatories={signatories}
        />
      )}

    </div>
  );
}