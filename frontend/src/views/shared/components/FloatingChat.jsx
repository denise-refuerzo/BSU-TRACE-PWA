import { useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import OfficeChatHub from '../OfficeChatHub';

export default function FloatingChat({
  isOpen,
  onOpenChange,
  hasUnread = false,
  onUnreadCleared,
  userId,
  officeId,
  targetDoc = null,
  onClearTargetDoc = null,
  label = 'Messages'
}) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const focusable = () => [...(panelRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]') || [])].filter(element => element.getClientRects().length);
    focusable()[0]?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') onOpenChange(false);
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [isOpen, onOpenChange]);

  const openChat = () => {
    onOpenChange(true);
    onUnreadCleared?.();
  };

  return (
    <>
      {isOpen && <div aria-hidden="true" onClick={() => onOpenChange(false)} className="fixed inset-0 z-[44] bg-black/30 backdrop-blur-[1px] md:bg-black/10" />}

      {isOpen && (
        <section ref={panelRef} role="dialog" aria-modal="true" aria-label={label} className="fixed inset-x-2 bottom-2 top-2 z-[45] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-4 md:bottom-6 md:left-auto md:right-6 md:top-auto md:h-[min(680px,calc(100dvh-3rem))] md:w-[420px]">
          <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-[#2D1F1E] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white/10 p-1.5"><MessageSquare size={17} /></span>
              <div><h2 className="text-sm font-black">{label}</h2><p className="text-[10px] text-white/60">Live document conversations</p></div>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} aria-label="Close chat" className="rounded-lg p-2 text-white/75 hover:bg-white/10 hover:text-white"><X size={19} /></button>
          </header>
          <div className="min-h-0 flex-1">
            <OfficeChatHub compact userId={userId} officeId={officeId} targetDoc={targetDoc} onClearTargetDoc={onClearTargetDoc} />
          </div>
        </section>
      )}

      {!isOpen && (
        <button type="button" onClick={openChat} aria-haspopup="dialog" aria-label={`Open ${label}${hasUnread ? ' — new activity' : ''}`} className="fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#D32F2F] text-white shadow-[0_12px_30px_rgba(120,0,0,0.35)] transition-transform hover:-translate-y-1 hover:bg-[#b71c1c] focus:outline-none focus:ring-4 focus:ring-red-200 md:bottom-7 md:right-7">
          <MessageSquare size={24} />
          {hasUnread && <span className="absolute right-0 top-0 flex h-4 w-4"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" /><span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-amber-500" /></span>}
        </button>
      )}
    </>
  );
}
