export function getWorkflowStops(workflow, selections = {}) {
  if (!workflow) return [];
  return Array.from({length: 7}, (_, index) => {
    const position = index + 1;
    const groupId = workflow[`stop_${position}_group_id`];
    return {
      position,
      groupId,
      groupName: workflow[`stop_${position}_group_name`],
      label: workflow[`stop_${position}_label`] || workflow[`stop_${position}_group_name`] || `Office ${position}`,
      name: workflow[`stop_${position}_name`],
      officeId: groupId ? (Number(selections[`stop_${position}`]) || null)
        : (workflow.resolved_route_ids?.[index] || workflow[`stop_${position}`] || null)
    };
  }).filter(stop => stop.groupId || stop.officeId);
}

export function getSelectedRouteKey(stops) {
  return stops.length >= 2 && stops.every(stop => stop.officeId)
    ? stops.map(stop => stop.officeId).join(',') : '';
}
