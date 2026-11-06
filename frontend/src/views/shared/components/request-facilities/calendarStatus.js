export const calendarStatus = value => {
  if (['Approved', 'Confirmed', 'Ongoing', 'Delayed', 'Rescheduled', 'Resource Reassigned'].includes(value)) return 'Approved';
  if (['Pending', 'Reserved'].includes(value)) return 'Pending';
  if (value === 'Cancelled' || value === 'Canceled') return 'Cancelled';
  if (value === 'Completed') return 'Completed';
  return value || 'Unknown';
};

export const calendarStatusColors = {
  Approved: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
  Pending: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
  Cancelled: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300',
  Completed: 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300'
};
