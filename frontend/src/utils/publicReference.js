export function publicReference(prefix, value) {
  if (!value) return `${prefix}-UNKNOWN`;
  return `${prefix}-${String(value).replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}
