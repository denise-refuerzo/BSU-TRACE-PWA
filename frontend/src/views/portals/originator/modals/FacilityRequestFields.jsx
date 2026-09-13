import React from 'react';

export default function FacilityRequestFields({ activeFacility, form, setForm, todayString, currentTimeString }) {
  const details = form.facilityDetails || {};
  const dates = form.intendedDates || [''];
  const inputClass = 'w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs mt-1 bg-white';
  const update = (key, value) => setForm(previous => ({...previous, facilityDetails: {...previous.facilityDetails, [key]: value}}));
  const textField = (label, key, type = 'text', required = true) => (
    <label key={key} className="block text-xs text-neutral-600">{label}
      <input type={type} required={required} value={details[key] || ''} onChange={e => update(key, e.target.value)} className={inputClass} />
    </label>
  );
  const choices = (title, key, options) => (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold text-neutral-600 mb-2">{title}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(option => (
          <label key={option} className="flex items-center gap-2 text-xs text-neutral-600">
            <input type="checkbox" checked={(details[key] || []).includes(option)} onChange={e => update(key, e.target.checked ? [...(details[key] || []), option] : (details[key] || []).filter(value => value !== option))} />{option}
          </label>
        ))}
      </div>
      {(details[key] || []).includes('Others') && textField('Others, please specify', `${key}Other`)}
    </fieldset>
  );
  return (
    <div className="space-y-6">
      <h4 className="font-semibold text-neutral-800 border-b pb-3">Facility and schedule</h4>
      <label className="block text-xs text-neutral-600">Facility being requested
        <input readOnly value={activeFacility} className={`${inputClass} bg-neutral-50`} />
      </label>
      <label className="block text-xs text-neutral-600">Requesting Office/Unit/Organization
        <input required value={form.department} onChange={e => setForm({...form, department: e.target.value})} className={inputClass} />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-xs font-bold text-neutral-600">Intended Date of Use</legend>
        {dates.map((date, index) => (
          <div key={index} className="flex items-center gap-2">
            <input aria-label={`Intended date ${index + 1}`} type="date" required min={todayString} value={date} onChange={e => setForm({...form, intendedDates: dates.map((value, i) => i === index ? e.target.value : value)})} className={inputClass} />
            <button type="button" disabled={dates.length === 1} onClick={() => setForm({...form, intendedDates: dates.filter((_, i) => i !== index)})} className="text-xs text-red-800 disabled:opacity-30">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setForm({...form, intendedDates: [...dates, '']})} className="text-xs font-bold text-red-800">+ Add Date</button>
      </fieldset>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-xs text-neutral-600">Start Time
          <input type="time" required min={dates.includes(todayString) ? currentTimeString : undefined} value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className={inputClass} />
        </label>
        <label className="text-xs text-neutral-600">End Time
          <input type="time" required min={form.startTime} value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className={inputClass} />
        </label>
      </div>
      <p className="text-xs text-neutral-500">The same time and request details apply to every selected date.</p>
      <h4 className="font-semibold text-neutral-800 border-b pb-3">Event details</h4>
      {choices('Purpose', 'purposes', ['Seminar/Training', 'Meeting', 'Special Class/Class Activity', 'Acquaintance', 'Presentation', 'Others'])}
      {choices('Participants who will Use the Facility', 'participants', ['Faculty', 'Student', 'External Partners', 'Staff', 'Parents', 'Others'])}
      <label className="block text-xs text-neutral-600">Expected Attendance
        <input type="number" required min="1" step="1" value={form.expectedAttendees} onChange={e => setForm({...form, expectedAttendees: e.target.value})} className={inputClass} />
      </label>
      <fieldset>
        <legend className="text-xs font-bold text-neutral-600 mb-2">Person in Charge during the Event</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{textField('Name', 'personInChargeName')}{textField('Position', 'personInChargePosition')}</div>
      </fieldset>
      {choices('Miscellaneous requests (optional)', 'miscellaneous', ['Basic Sound System', 'Operator', 'Maintenance Personnel', 'Others'])}
      <h4 className="font-semibold text-neutral-800 border-b pb-3">Names and positions</h4>
      {['Requested', 'Reviewed', 'Approved'].map(role => (
        <fieldset key={role} className="border-t border-neutral-200 pt-3">
          <legend className="text-xs font-bold text-neutral-600">{role} by</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {textField('Name', `${role.toLowerCase()}ByName`)}
            {textField('Position', `${role.toLowerCase()}ByPosition`)}
          </div>
        </fieldset>
      ))}
      <label className="block text-xs text-neutral-600">Remarks (optional)
        <textarea rows={3} value={details.remarks || ''} onChange={e => update('remarks', e.target.value)} className={inputClass} />
      </label>
    </div>
  );
}
