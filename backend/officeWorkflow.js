const fail = (status, message) => Object.assign(new Error(message), {status});
const isOffice = user => [2, 3, 4].includes(Number(user.a_id)) && Number(user.o_id) > 0;
function resolveRoute(route, user) {
  const college = ({1:11, 2:12, 3:13, 4:14, 5:14, 6:24})[user.d_id] || 11;
  return Array.from({length:7}, (_, i) => Number(route[`stop_${i + 1}`]) || null)
    .filter(Boolean).map(id => id === 999 ? college : id);
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
module.exports = {fail, isOffice, resolveRoute, assertAction};
