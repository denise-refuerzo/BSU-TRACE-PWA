export const dateKey = value => String(value).slice(0,10);
// End times are exclusive: a whole-day block ending at midnight does not block the next day.
export const blockOnDay = (block,date) => block.start_time < `${date}T23:59:59` && block.end_time > `${date}T00:00:00`;
export const blockMatchesResource = (block,facility) => block.ast_id === (facility === 'Van' ? 4 : facility === 'Gymnasium' ? 2 : 1);
