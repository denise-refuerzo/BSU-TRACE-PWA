export function formatOfficeLabel(name, fallback = 'Campus Office') {
  const label = String(name || fallback).trim();
  return /\boffice$/i.test(label) ? label : `${label} Office`;
}
