// One completed ad hoc visit satisfies one future stop, without manufacturing
// database processing records or changing the original route.
function routeProgress(sequence = [], steps = []) {
  const credits = new Map();
  const history = [];
  let position = 0;
  const completed = step => Boolean(step.time_out) && [3, 5].includes(Number(step.s_id));
  const skip = () => {
    const source = credits.get(position);
    history.push({...source, pd_id: `adhoc-route-${position}-${source.pd_id}`,
      is_adhoc: false, completed_via_adhoc: true, route_position: position,
      current_status: 'Completed via ad hoc'});
    position++;
  };
  for (const step of steps) {
    if (step.is_adhoc) {
      history.push(step);
      if (completed(step)) {
        const target = sequence.findIndex((office, index) => index >= position &&
          Number(office) === Number(step.current_office_id));
        if (target >= 0 && !credits.has(target)) credits.set(target, step);
      }
      continue;
    }
    while (credits.has(position)) skip();
    // A redundant visit already created by the old workflow must not advance
    // the route past a different office that still needs to process it.
    const matches = Number(sequence[position]) === Number(step.current_office_id);
    history.push({...step, route_position: matches ? position : null});
    if (matches && completed(step)) position++;
  }
  while (credits.has(position)) skip();
  const routeSteps = sequence.map((office,index) =>
    history.findLast(step => !step.is_adhoc && step.route_position === index) ||
    (credits.has(index) ? {...credits.get(index),is_adhoc:false,
      completed_via_adhoc:true,route_position:index} : null)).filter(Boolean);
  return {nextIndex: position, credits, history, routeSteps};
}

module.exports = {routeProgress};
