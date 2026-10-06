const startsWith = (value, prefix) => String(value || '').startsWith(prefix);

const actorFrom = action => ({
  name: action.full_name,
  timestamp: action.action_timestamp
});

const correctionFrom = action => ({
  ...actorFrom(action),
  message: String(action.action_type || '').replace(/^Sent Back for Revision:\s*/i, '').trim()
});

function attachStepActors(steps = [], actions = []) {
  const enriched = steps.map(step => ({...step}));
  const officeSteps = new Map();
  const activeStep = new Map();
  const nextStep = new Map();

  enriched.forEach((step, index) => {
    const officeId = Number(step.current_office_id);
    if (!officeSteps.has(officeId)) officeSteps.set(officeId, []);
    officeSteps.get(officeId).push(index);
  });

  const findStep = officeId => {
    const indexes = officeSteps.get(officeId) || [];
    const cursor = nextStep.get(officeId) || 0;
    return indexes[cursor];
  };

  for (const action of actions) {
    const officeId = Number(action.office_id);
    if (!officeSteps.has(officeId)) continue;
    const type = String(action.action_type || '');

    if (startsWith(type, 'Scanned In')) {
      const stepIndex = findStep(officeId);
      if (stepIndex == null) continue;
      enriched[stepIndex].time_in_actor = actorFrom(action);
      enriched[stepIndex].action_actors = enriched[stepIndex].action_actors || [];
      enriched[stepIndex].action_actors.push({...actorFrom(action), action: type});
      activeStep.set(officeId, stepIndex);
      nextStep.set(officeId, (nextStep.get(officeId) || 0) + 1);
      continue;
    }

    const stepIndex = activeStep.get(officeId);
    if (stepIndex == null) continue;
    const step = enriched[stepIndex];
    step.action_actors = step.action_actors || [];

    if (startsWith(type, 'Approved & Signed')) step.signed_actor = actorFrom(action);
    if (startsWith(type, 'Sent Back for Revision:')) step.correction = correctionFrom(action);
    if (startsWith(type, 'Scanned Out')) step.time_out_actor = actorFrom(action);

    step.action_actors.push({...actorFrom(action), action: type});
    if (startsWith(type, 'Scanned Out')) activeStep.delete(officeId);
  }

  return enriched;
}

module.exports = {attachStepActors};
