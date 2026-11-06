const items = [
  { label: 'Approved', classes: 'text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  { label: 'Pending', classes: 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  { label: 'Cancelled', classes: 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700', dot: 'bg-gray-400' },
  { label: 'Completed', classes: 'text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800', dot: 'bg-sky-500' },
  { label: 'Blocked Period', classes: 'text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' }
];

export default function ResourceCalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs" aria-label="Calendar legend">
      <span className="mr-1 font-bold text-gray-600 dark:text-gray-300">Legend:</span>
      {items.map(item => (
        <span key={item.label} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] sm:text-xs font-bold ${item.classes}`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} /> {item.label}
        </span>
      ))}
    </div>
  );
}
