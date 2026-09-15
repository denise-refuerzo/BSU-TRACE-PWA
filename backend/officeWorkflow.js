const fail = (status, message) => Object.assign(new Error(message), {status});
const isOffice = user => [2, 3, 4].includes(Number(user.a_id)) && Number(user.o_id) > 0;
function resolveRoute(route, user) {
  const college = ({1:11, 2:12, 3:13, 4:14, 5:14, 6:24})[user.d_id] || 11;
  return Array.from({length:7}, (_, i) => Number(route[`stop_${i + 1}`]) || null)
    .filter(Boolean).map(id => id === 999 ? college : id);
}
async function resolveTemplateRoute(db, route, user, placeholderSelections = {}) {
  const sequence = [];
  for (let index = 1; index <= 7; index += 1) {
    const officeId = Number(route[`stop_${index}`]) || null;
    const groupId = Number(route[`stop_${index}_group_id`]) || null;
    if (groupId) {
      const selectedOfficeId = Number(placeholderSelections[groupId]);
      if (!selectedOfficeId) throw fail(400, `Select an office for the category placeholder at stop ${index}.`);
      const allowed = await db.query(`SELECT 1 FROM public.office_route_group_members m JOIN public.offices o ON o.o_id=m.office_id WHERE m.group_id=$1 AND m.office_id=$2`, [groupId, selectedOfficeId]);
      if (!allowed.rowCount) throw fail(400, `The selected office is not part of the category allowed at stop ${index}.`);
      sequence.push(selectedOfficeId);
    } else if (officeId) sequence.push(officeId === 999 ? ({1:11, 2:12, 3:13, 4:14, 5:14, 6:24}[user.d_id] || 11) : officeId);
  }
  return sequence;
}
function assertAction(step, user, action) {
  if (!isOffice(user)) throw fail(403, 'An assigned office account is required.');
  if (!step || step.time_out || Number(step.current_office_id) !== Number(user.o_id))
    throw fail(409, 'This document is not currently available for processing in your office. Refresh the list.');
  if (action === 'time-in') {
    if (step.time_in || step.s_id !== 1) throw fail(409, 'This document has already been received or is on hold.');
  } else {
    if (!step.time_in) throw fail(409, 'Record Time In before processing this document.');
    if (action === 'time-out' ? ![3,4].includes(step.s_id) : step.s_id !== 1)
      throw fail(409, action === 'time-out' ? 'Sign the document before recording Time Out.' : 'This action requires a pending document in your office.');
  }
}
module.exports = {fail, isOffice, resolveRoute, resolveTemplateRoute, assertAction};
