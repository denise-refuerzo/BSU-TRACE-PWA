import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({ page, totalPages, onPageChange, totalItems, pageSize }) {
  if (totalPages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);
  return <div className="flex flex-col gap-3 border-t border-neutral-100 bg-white p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
    <span className="font-medium text-neutral-500">Showing <strong className="text-neutral-900">{first}–{last}</strong> of <strong className="text-neutral-900">{totalItems}</strong> · Page {page} of {totalPages}</span>
    <div className="flex gap-2">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="trace-button disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15}/>Previous</button>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="trace-button disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight size={15}/></button>
    </div>
  </div>;
}
