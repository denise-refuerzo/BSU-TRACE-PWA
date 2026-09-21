import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, X, CalendarDays, 
  LayoutGrid, List, Clock, MapPin, AlertCircle 
} from 'lucide-react';
import { resourceApi, confirmResourceAction, resourceSuccess, resourceError } from '../resourceActions';
import { dateKey, blockOnDay } from '../../../../utils/resourceSchedule';
import { publicReference } from '../../../../utils/publicReference';

const control = 'border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-red-700';

export default function ResourceAdminCalendar({ requests, blocks, assets, fleet, onRefresh, onOpenRequest }) {
  const [month, setMonth] = useState(new Date());
  const [resource, setResource] = useState('All');
  const [status, setStatus] = useState('All');
  const [calendarView, setCalendarView] = useState('grid'); // 'grid' | 'list'
  const [day, setDay] = useState(null);
  const [block, setBlock] = useState(null);
  const [busy, setBusy] = useState(false);

  const year = month.getFullYear();
  const index = month.getMonth();
  const today = new Date().toLocaleDateString('en-CA');
  const typeMap = { Vehicle: 4, Room: 1, Gymnasium: 2 };

  const filteredRequests = requests.filter(r => 
    (resource === 'All' || r.booking_type === resource) && 
    (status === 'All' || r.status === status)
  );

  const filteredBlocks = blocks.filter(b => 
    (resource === 'All' || b.ast_id === typeMap[resource]) && 
    (status === 'All' || status === 'Blocked')
  );

  const entries = (date) => [
    ...filteredRequests.filter(r => dateKey(r.reservation_date) === date).map(r => ({
      kind: 'request',
      record: r,
      label: r.status === 'Confirmed' ? 'Confirmed' : 'Pending'
    })),
    ...filteredBlocks.filter(b => blockOnDay(b, date)).map(b => ({
      kind: 'block',
      record: b,
      label: 'Blocked'
    }))
  ];

  // List view: all entries for the active month sorted chronologically
  const monthEntriesList = () => {
    const daysInMonth = new Date(year, index + 1, 0).getDate();
    const allDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(index + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayItems = entries(dStr);
      if (dayItems.length > 0) {
        allDays.push({ date: dStr, dayNumber: d, items: dayItems });
      }
    }
    return allDays;
  };

  const colors = {
    Confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Pending: 'bg-amber-50 text-amber-800 border-amber-200',
    Blocked: 'bg-rose-50 text-rose-800 border-rose-200'
  };

  const eventColors = {
    Confirmed: 'bg-emerald-100 text-emerald-950 border-emerald-600',
    Pending: 'bg-amber-100 text-amber-950 border-amber-500',
    Blocked: 'bg-rose-100 text-rose-950 border-rose-600'
  };

  function openBlock(date) {
    setBlock({ date, target: '', wholeDay: true, start: '08:00', end: '17:00', reason: '' });
  }

  async function saveBlock(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (!await confirmResourceAction(
        'Confirm Schedule Block?',
        `${block.date} · ${block.wholeDay ? 'Full Day' : `${block.start} - ${block.end}`} · ${block.reason}`
      )) return;
      const [kind, id] = block.target.split(':');
      const vehicle = kind === 'v' ? fleet.vehicles.find(v => v.vehicle_id === Number(id)) : null;
      const result = await resourceApi('schedule-blocks', 'POST', {
        ...block,
        assetId: vehicle ? vehicle.asd_id : Number(id),
        vehicleId: vehicle?.vehicle_id
      });
      setBlock(null);
      await onRefresh();
      await resourceSuccess(result.message);
    } catch (e) {
      await resourceError(e);
    } finally {
      setBusy(false);
    }
  }

  async function removeBlock(record) {
    if (busy) return;
    setBusy(true);
    try {
      if (!await confirmResourceAction('Remove Blocked Schedule?', record.reason)) return;
      const result = await resourceApi(`schedule-blocks/${record.block_id}`, 'DELETE');
      await onRefresh();
      await resourceSuccess(result.message);
    } catch (e) {
      await resourceError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Calendar Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Grid vs List */}
          <div className="flex items-center bg-neutral-200/70 p-1 rounded-xl">
            <button
              onClick={() => setCalendarView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calendarView === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={14} /> Month
            </button>
            <button
              onClick={() => setCalendarView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calendarView === 'list' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List size={14} /> List View
            </button>
          </div>

          <select aria-label="Filter resource" className={control} value={resource} onChange={e => setResource(e.target.value)}>
            <option value="All">All Resources</option>
            <option value="Vehicle">Vehicles</option>
            <option value="Room">Multimedia Room</option>
            <option value="Gymnasium">Gymnasium</option>
          </select>

          <select aria-label="Filter status" className={control} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="All">All Requests & Blocks</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-xl p-1">
            <button aria-label="Previous month" className="p-1 text-gray-600 hover:text-black rounded-lg hover:bg-gray-50" onClick={() => setMonth(new Date(year, index - 1, 1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold px-2 text-gray-800">
              {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button aria-label="Next month" className="p-1 text-gray-600 hover:text-black rounded-lg hover:bg-gray-50" onClick={() => setMonth(new Date(year, index + 1, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>

          <button 
            className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-black text-white rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer" 
            onClick={() => openBlock(day || today)}
          >
            <Plus size={14} /> Block Schedule
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex items-center gap-3 text-xs">
        <span className="font-bold text-gray-500">Legend:</span>
        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Confirmed
        </span>
        <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending
        </span>
        <span className="inline-flex items-center gap-1.5 font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Blocked Period
        </span>
      </div>

      {/* VIEW A: MONTH GRID */}
      {calendarView === 'grid' && (
        <div className="overflow-x-auto">
          <div className="min-w-[850px] grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 rounded-lg py-2">
                {d}
              </div>
            ))}

            {Array.from({ length: new Date(year, index, 1).getDay() }, (_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50/40 rounded-xl border border-dashed border-gray-100 min-h-[140px]" />
            ))}

            {Array.from({ length: new Date(year, index + 1, 0).getDate() }, (_, i) => {
              const date = `${year}-${String(index + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
              const items = entries(date);
              const isToday = date === today;

              return (
                <button 
                  key={date} 
                  onClick={() => setDay(date)} 
                  className={`min-h-[140px] flex flex-col text-left p-2 border rounded-xl transition-all cursor-pointer ${
                    isToday ? 'border-red-600 bg-red-50/20 ring-1 ring-red-200' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                    isToday ? 'bg-red-700 text-white' : 'text-gray-700'
                  }`}>
                    {i + 1}
                  </span>
                  
                  <div className="space-y-1.5 mt-2 w-full">
                    {items.slice(0, 2).map((item, itemIdx) => (
                      <div 
                        key={itemIdx} 
                        className={`rounded-lg border-l-3 px-2 py-1.5 text-[11px] leading-tight shadow-2xs ${eventColors[item.label]}`}
                      >
                        <p className="font-extrabold truncate">{item.record.purpose || item.record.reason || item.record.asset_name}</p>
                        <p className="text-[10px] font-medium opacity-80 mt-0.5">
                          {item.kind === 'request'
                            ? `${item.record.start_time?.slice(0, 5)} - ${item.record.end_time?.slice(0, 5)}`
                            : item.record.whole_day ? 'Full Day' : `${item.record.start_time?.slice(11, 16)} - ${item.record.end_time?.slice(11, 16)}`}
                        </p>
                      </div>
                    ))}
                    {items.length > 2 && (
                      <p className="text-[10px] font-bold text-gray-600 rounded bg-gray-100 px-1.5 py-1 text-center">
                        +{items.length - 2} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: AGENDA / SCHEDULE LIST */}
      {calendarView === 'list' && (
        <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
          {monthEntriesList().map(dayGroup => {
            const dateObj = new Date(dayGroup.date);
            const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <div key={dayGroup.date} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-gray-800">
                    <CalendarDays size={14} className="text-gray-500" />
                    <span>{dateLabel}</span>
                    {dayGroup.date === today && (
                      <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Today</span>
                    )}
                  </div>
                  <button onClick={() => openBlock(dayGroup.date)} className="text-[11px] text-gray-600 hover:text-black font-semibold flex items-center gap-1">
                    <Plus size={12} /> Add Block
                  </button>
                </div>

                <div className="divide-y divide-gray-100 p-2 space-y-1">
                  {dayGroup.items.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`border px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${colors[item.label]}`}>
                            {item.label}
                          </span>
                          <span className="font-bold text-xs text-gray-900">
                            {item.kind === 'request' ? (item.record.purpose || 'No Purpose Specified') : `Schedule Blocked: ${item.record.reason}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {item.kind === 'request'
                              ? `${item.record.start_time?.slice(0, 5)} - ${item.record.end_time?.slice(0, 5)}`
                              : item.record.whole_day ? 'Full Day' : `${item.record.start_time?.slice(11, 16)} - ${item.record.end_time?.slice(11, 16)}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {item.record.asset_name || item.record.vehicle_name}
                          </span>
                          {item.kind === 'request' && (
                            <span className="font-medium">Requested by: {item.record.requestor}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.kind === 'request' ? (
                          <button 
                            onClick={() => onOpenRequest(item.record)} 
                            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-red-50 hover:text-red-800 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            View Checklist
                          </button>
                        ) : (
                          <button 
                            disabled={busy}
                            onClick={() => removeBlock(item.record)} 
                            className="px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 font-bold rounded-lg transition-colors"
                          >
                            Remove Block
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {monthEntriesList().length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">No scheduled requests or blocks</p>
              <p className="text-xs text-gray-500 mt-0.5">Nothing is currently scheduled for this month.</p>
            </div>
          )}
        </div>
      )}

      {/* Day Details Modal */}
      {day && !block && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <section role="dialog" aria-modal="true" className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 space-y-4 shadow-xl text-left">
            <header className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">{day}</h3>
                <p className="text-xs text-gray-500">Scheduled events and blackout periods.</p>
              </div>
              <button aria-label="Close" onClick={() => setDay(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </header>

            <div className="space-y-3">
              {entries(day).map(item => (
                <article key={`${item.kind}-${item.record.booking_id || item.record.block_id}`} className={`border rounded-xl p-4 ${colors[item.label]}`}>
                  {item.kind === 'request' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between gap-2 font-bold text-xs">
                        <span>{publicReference('REQ', item.record.booking_id)} · {item.record.requestor}</span>
                        <span className="uppercase">{item.label}</span>
                      </div>
                      <p className="text-xs">{item.record.start_time?.slice(0, 5)} - {item.record.end_time?.slice(0, 5)} · {item.record.asset_name}</p>
                      <p className="text-xs font-semibold">{item.record.purpose}</p>
                      <button 
                        className="text-xs font-bold underline text-red-800 block mt-2 cursor-pointer" 
                        onClick={() => { setDay(null); onOpenRequest(item.record); }}
                      >
                        Open Request Checklist →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <strong className="text-xs font-bold block">Blocked Period · {item.record.vehicle_name || item.record.asset_name}</strong>
                      <p className="text-xs">{item.record.whole_day ? 'Full Day' : `${item.record.start_time?.replace('T', ' ')} - ${item.record.end_time?.replace('T', ' ')}`}</p>
                      <p className="text-xs font-semibold mt-1">{item.record.reason}</p>
                      <button disabled={busy} className="text-xs text-red-700 font-bold underline mt-2 block" onClick={() => removeBlock(item.record)}>
                        Remove Block
                      </button>
                    </div>
                  )}
                </article>
              ))}

              {!entries(day).length && <p className="text-sm text-gray-500 py-6 text-center">No schedule for this day.</p>}
            </div>

            <button className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors" onClick={() => openBlock(day)}>
              Block This Date
            </button>
          </section>
        </div>
      )}

      {/* Block Schedule Modal */}
      {block && (
        <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form role="dialog" onSubmit={saveBlock} className="rounded-2xl shadow-xl bg-white p-6 w-full max-w-lg space-y-4 text-left">
            <h3 className="text-base font-bold text-gray-900">Block a Resource</h3>
            <fieldset disabled={busy} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Facility or Vehicle</label>
                <select required value={block.target} onChange={e => setBlock({ ...block, target: e.target.value })} className={`${control} w-full`}>
                  <option value="">Choose an item to block</option>
                  {assets.filter(a => [1, 2].includes(a.ast_id)).map(a => (
                    <option key={`a${a.asd_id}`} value={`a:${a.asd_id}`}>{a.asset_name}</option>
                  ))}
                  {fleet.vehicles.map(v => (
                    <option key={`v${v.vehicle_id}`} value={`v:${v.vehicle_id}`}>{v.vehicle_name} · {v.plate_number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Date</label>
                <input required min={today} type="date" className={`${control} w-full`} value={block.date} onChange={e => setBlock({ ...block, date: e.target.value })} />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Duration</label>
                <select className={`${control} w-full`} value={String(block.wholeDay)} onChange={e => setBlock({ ...block, wholeDay: e.target.value === 'true' })}>
                  <option value="true">Full Day</option>
                  <option value="false">Specific Time Window</option>
                </select>
              </div>

              {!block.wholeDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700">Start</label>
                    <input required type="time" value={block.start} onChange={e => setBlock({ ...block, start: e.target.value })} className={`${control} w-full mt-1`} />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700">End</label>
                    <input required type="time" min={block.start} value={block.end} onChange={e => setBlock({ ...block, end: e.target.value })} className={`${control} w-full mt-1`} />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Blocking</label>
                <textarea required rows={3} placeholder="e.g., Campus renovation, routine maintenance" className={`${control} w-full`} value={block.reason} onChange={e => setBlock({ ...block, reason: e.target.value })} />
              </div>
            </fieldset>

            <footer className="flex justify-end gap-2 border-t pt-4">
              <button type="button" disabled={busy} onClick={() => setBlock(null)} className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button disabled={busy} className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold">
                Save Block
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
