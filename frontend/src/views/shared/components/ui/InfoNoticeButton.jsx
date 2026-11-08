import { useId, useState } from 'react';
import { Info } from 'lucide-react';

export default function InfoNoticeButton({ label, children }) {
  const [open, setOpen] = useState(false);
  const noticeId = useId();

  return (
    <div className="relative shrink-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
      <button type="button" aria-label={label} aria-expanded={open} aria-controls={noticeId} onClick={() => setOpen(current => !current)} className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-[#D32F2F] dark:text-red-400 shadow-sm transition-colors hover:bg-red-100 dark:hover:bg-red-900/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 cursor-pointer">
        <Info size={19} />
      </button>
      {open && <div id={noticeId} role="note" className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-red-100 dark:border-red-900 bg-white dark:bg-[#211316] p-4 text-sm leading-relaxed text-gray-700 dark:text-gray-200 shadow-xl">
        {children}
      </div>}
    </div>
  );
}
