export default function FacilityRequestFields({ activeFacility, form, setForm, todayString, currentTimeString, facilityOptions = [], facilityOptionsLoading = false, signatories }) {
  const details = form.facilityDetails || {};
  const dates = form.intendedDates || [''];
  const inputClass = 'w-full border border-neutral-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs mt-1 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white outline-none';
  const update = (key, value) => setForm(previous => ({...previous, facilityDetails: {...previous.facilityDetails, [key]: value}}));
  const textField = (label, key, type = 'text', required = true) => (
    <label key={key} className="block text-xs text-neutral-600 dark:text-gray-400">{label}
      <input type={type} required={required} value={details[key] || ''} onChange={e => update(key, e.target.value)} className={inputClass} />
    </label>
  );
  const choices = (title, key, options) => (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold text-neutral-600 dark:text-gray-300 mb-2">{title}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(option => (
          <label key={option} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={(details[key] || []).includes(option)} onChange={e => update(key, e.target.checked ? [...(details[key] || []), option] : (details[key] || []).filter(value => value !== option))} className="rounded text-red-800 dark:text-red-700 focus:ring-red-700 cursor-pointer" />{option}
          </label>
        ))}
      </div>
      {(details[key] || []).includes('Others') && textField('Others, please specify', `${key}Other`)}
    </fieldset>
  );
  return (
    <div className="space-y-6">
      <h4 className="font-semibold text-neutral-800 dark:text-white border-b border-neutral-200 dark:border-[#42292f] pb-3">Facility and schedule</h4>
      <label className="block text-xs text-neutral-600 dark:text-gray-400">Requesting Office/Unit/Organization
        <input required readOnly value={form.department} className={`${inputClass} bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-gray-400 cursor-not-allowed`} />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-xs font-bold text-neutral-600 dark:text-gray-300">Intended Date of Use</legend>
        {dates.map((date, index) => (
          <div key={index} className="flex items-center gap-2">
            <input aria-label={`Intended date ${index + 1}`} type="date" required min={todayString} value={date} onChange={e => setForm({...form, intendedDates: dates.map((value, i) => i === index ? e.target.value : value)})} className={inputClass} />
            <button type="button" disabled={dates.length === 1} onClick={() => setForm({...form, intendedDates: dates.filter((_, i) => i !== index)})} className="text-xs text-red-800 dark:text-red-400 disabled:opacity-30 cursor-pointer font-bold">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setForm({...form, intendedDates: [...dates, '']})} className="text-xs font-bold text-red-800 dark:text-red-400 cursor-pointer">+ Add Date</button>
      </fieldset>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-xs text-neutral-600 dark:text-gray-400">Start Time
          <input type="time" required min={dates.includes(todayString) ? currentTimeString : undefined} value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className={inputClass} />
        </label>
        <label className="text-xs text-neutral-600 dark:text-gray-400">End Time
          <input type="time" required min={form.startTime} value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className={inputClass} />
        </label>
      </div>
      <label className="block text-xs text-neutral-600 dark:text-gray-400">Available {activeFacility === 'Gymnasium' ? 'gymnasium' : 'room'}
        <select required value={form.assetName || ''} onChange={e => setForm({...form, assetName: e.target.value})} disabled={facilityOptionsLoading || !form.startTime || !form.endTime} className={`${inputClass} disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-400 dark:disabled:text-gray-600 cursor-pointer`}>
          <option value="">{facilityOptionsLoading ? 'Checking availability…' : facilityOptions.length ? 'Choose an available facility' : 'No available facility for this schedule'}</option>
          {facilityOptions.map(option => <option key={option.asd_id} value={option.asset_name}>{option.asset_name}</option>)}
        </select>
      </label>
      <p className="text-xs text-neutral-500 dark:text-gray-400">The same time and request details apply to every selected date.</p>
      <h4 className="font-semibold text-neutral-800 dark:text-white border-b border-neutral-200 dark:border-[#42292f] pb-3">Event details</h4>
      {choices('Purpose', 'purposes', ['Seminar/Training', 'Meeting', 'Special Class/Class Activity', 'Acquaintance', 'Presentation', 'Others'])}
      {choices('Participants who will Use the Facility', 'participants', ['Faculty', 'Student', 'External Partners', 'Staff', 'Parents', 'Others'])}
      <label className="block text-xs text-neutral-600 dark:text-gray-400">Expected Attendance
        <input type="number" required min="1" max="99999" step="1" value={form.expectedAttendees} onChange={e => setForm({...form, expectedAttendees: e.target.value})} className={inputClass} />
      </label>
      <fieldset>
        <legend className="text-xs font-bold text-neutral-600 dark:text-gray-300 mb-2">Person in Charge during the Event</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{textField('Name', 'personInChargeName')}{textField('Position', 'personInChargePosition')}</div>
      </fieldset>
      {choices('Miscellaneous requests (optional)', 'miscellaneous', ['Basic Sound System', 'Operator', 'Maintenance Personnel', 'Others'])}
      <h4 className="font-semibold text-neutral-800 dark:text-white border-b border-neutral-200 dark:border-[#42292f] pb-3">Approvals</h4>
      <fieldset className="border-t border-neutral-200 dark:border-[#42292f] pt-3">
        <legend className="text-xs font-bold text-neutral-600 dark:text-gray-300">Prepared by</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-xs text-neutral-600 dark:text-gray-400">Position / Office<input readOnly value={signatories?.requestedBy?.position || signatories?.requestedBy?.officeName || 'No office assigned'} className={`${inputClass} bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-gray-400 cursor-not-allowed`} /></label>
          <label className="block text-xs text-neutral-600 dark:text-gray-400">Name<input readOnly value={signatories?.requestedBy?.name || 'Account not found'} className={`${inputClass} bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-gray-400 cursor-not-allowed`} /></label>
        </div>
      </fieldset>
      {[
        { label: 'Recommending Approval', officeKey: 'recommendingApprovalOfficeId', userKey: 'recommendingApprovalUserId', peopleKey: 'recommenders' },
        { label: 'Approved by', officeKey: 'approvedByOfficeId', userKey: 'approvedByUserId', peopleKey: 'approvers' }
      ].map(role => {
        const eligibleOffices = (signatories?.offices || []).filter(office => office[role.peopleKey]?.length);
        const selectedOffice = eligibleOffices.find(office => String(office.officeId) === String(form[role.officeKey]));
        return <fieldset key={role.userKey} className="border-t border-neutral-200 dark:border-[#42292f] pt-3">
          <legend className="text-xs font-bold text-neutral-600 dark:text-gray-300">{role.label}</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs text-neutral-600 dark:text-gray-400">Office<select required value={form[role.officeKey] || ''} onChange={e => setForm({...form, [role.officeKey]: e.target.value, [role.userKey]: ''})} className={`${inputClass} cursor-pointer`}><option value="">Choose an office</option>{eligibleOffices.map(office => <option key={office.officeId} value={office.officeId}>{office.officeName}</option>)}</select></label>
            <label className="block text-xs text-neutral-600 dark:text-gray-400">Name<select required disabled={!selectedOffice} value={form[role.userKey] || ''} onChange={e => setForm({...form, [role.userKey]: e.target.value})} className={`${inputClass} disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-400 dark:disabled:text-gray-600 cursor-pointer`}><option value="">{selectedOffice ? 'Choose a person' : 'Choose an office first'}</option>{(selectedOffice?.[role.peopleKey] || []).map(person => <option key={person.userId} value={person.userId}>{person.name}{person.position ? ` — ${person.position}` : ''}</option>)}</select></label>
          </div>
        </fieldset>;
      })}
      {!(signatories?.offices || []).some(office => office.recommenders.length) || !(signatories?.offices || []).some(office => office.approvers.length) ? <p className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/30 p-3 text-xs font-medium text-amber-800 dark:text-amber-300">Available recommending and final signatories must be assigned by ICT Admin before this request can be submitted.</p> : null}
      <label className="block text-xs text-neutral-600 dark:text-gray-400">Remarks (optional)
        <textarea rows={3} value={details.remarks || ''} onChange={e => update('remarks', e.target.value)} className={inputClass} />
      </label>
    </div>
  );
}