export function parsePhilippineTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  let text = String(value).trim().replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text += 'T00:00:00';
  if (!/(Z|[+-]\d{2}(?::?\d{2})?)$/i.test(text)) text += '+08:00';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function formatPhilippineDateTime(value) {
  return parsePhilippineTime(value)?.toLocaleString('en-PH', {
    timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:true
  }) || '—';
}
export function formatPhilippineDate(value) {
  return parsePhilippineTime(value)?.toLocaleDateString('en-PH', {
    timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric'
  }) || '—';
}
