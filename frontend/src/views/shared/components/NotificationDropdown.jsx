import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Inbox, CheckCheck, CheckSquare, Square } from 'lucide-react';

export default function NotificationDropdown({
  notifications = [],
  onNotificationClick,
  userId = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const containerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressTriggeredRef = useRef(false);

  const storageKey = `bsu_read_notifications_${userId || 'guest'}`;

  // Load read notifications from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setReadNotificationIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, [storageKey]);

  // Persist read notifications
  const persistReadIds = (updatedIds) => {
    setReadNotificationIds(updatedIds);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedIds));
    } catch (e) {
      console.error(e);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsSelectMode(false);
        setSelectedIds([]);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadNotifications = notifications.filter(
    (n) => !readNotificationIds.includes(String(n.id))
  );
  const hasUnread = unreadNotifications.length > 0;

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const localizedString = String(timestamp).replace(/(\+00:00|\+00|Z)$/i, '');
    const now = new Date();
    const past = new Date(localizedString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    
    const elapsed = now - past;
    if (elapsed < msPerMinute) return 'Just now';
    if (elapsed < msPerHour) return `${Math.round(elapsed / msPerMinute)}m ago`;
    if (elapsed < msPerDay) return `${Math.round(elapsed / msPerHour)}h ago`;
    return `${Math.round(elapsed / msPerDay)}d ago`;
  };

  // -------------------------------------------------------------
  // LONG PRESS HANDLERS (Works for both touch and mouse click)
  // -------------------------------------------------------------
  const handleTouchStart = (notifId) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsSelectMode(true);
      setSelectedIds((prev) => (prev.includes(notifId) ? prev : [...prev, notifId]));
      if (navigator.vibrate) navigator.vibrate(40);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // -------------------------------------------------------------
  // CLICK HANDLER
  // -------------------------------------------------------------
  const handleItemClick = (notif) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    // In select mode, clicking toggles the checkbox selection
    if (isSelectMode) {
      setSelectedIds((prev) =>
        prev.includes(notif.id)
          ? prev.filter((id) => id !== notif.id)
          : [...prev, notif.id]
      );
      return;
    }

    // Normal click: mark this item as read and trigger action
    if (!readNotificationIds.includes(String(notif.id))) {
      persistReadIds([...readNotificationIds, String(notif.id)]);
    }
    setIsOpen(false);
    if (onNotificationClick) {
      onNotificationClick(notif);
    }
  };

  // -------------------------------------------------------------
  // BULK ACTIONS
  // -------------------------------------------------------------
  const handleMarkSelectedAsRead = () => {
    const stringified = selectedIds.map(String);
    const combined = Array.from(new Set([...readNotificationIds, ...stringified]));
    persistReadIds(combined);
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => String(n.id));
    persistReadIds(allIds);
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n.id));
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger with Unread Indicator */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors relative cursor-pointer focus:outline-none"
        aria-label="Open notifications"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={() => {
            setIsOpen(false);
            setIsSelectMode(false);
            setSelectedIds([]);
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 md:hidden animate-in fade-in duration-150"
        />
      )}

      {/* Dropdown Container */}
      {isOpen && (
        <div className="fixed md:absolute right-0 bottom-0 md:bottom-auto md:top-full md:mt-2 w-full md:w-88 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-3 md:slide-in-from-top-2 duration-200 max-h-[82vh] md:max-h-[30rem] flex flex-col">
          
          {/* Header */}
          <div className="p-4 border-b border-neutral-100 bg-[#FDFBF9] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider text-neutral-900">
                {isSelectMode ? `Selected (${selectedIds.length})` : 'Notifications'}
              </span>
              {!isSelectMode && hasUnread && (
                <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadNotifications.length}
                </span>
              )}
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2">
              {isSelectMode ? (
                <>
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-[11px] font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  >
                    {selectedIds.length === notifications.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedIds([]);
                    }}
                    className="text-[11px] font-bold text-neutral-400 hover:text-neutral-600 cursor-pointer ml-1"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {hasUnread && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-bold text-red-800 hover:text-red-900 cursor-pointer flex items-center gap-1"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} /> Mark all
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg cursor-pointer md:hidden"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-neutral-100 flex-1">
            {notifications.map((n) => {
              const isRead = readNotificationIds.includes(String(n.id));
              const isSelected = selectedIds.includes(n.id);

              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  onMouseDown={() => handleTouchStart(n.id)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onTouchStart={() => handleTouchStart(n.id)}
                  onTouchEnd={handleTouchEnd}
                  className={`p-4 text-xs text-left transition-colors flex items-start gap-3 select-none cursor-pointer ${
                    isSelected
                      ? 'bg-red-50/60'
                      : isRead
                      ? 'bg-white hover:bg-neutral-50/60 opacity-65'
                      : 'bg-[#FCFAF8] hover:bg-neutral-50 font-semibold'
                  }`}
                >
                  {/* Selection Mode Checkbox */}
                  {isSelectMode && (
                    <div className="mt-0.5 text-neutral-500 shrink-0">
                      {isSelected ? (
                        <CheckSquare size={16} className="text-red-800" />
                      ) : (
                        <Square size={16} className="text-neutral-300" />
                      )}
                    </div>
                  )}

                  {/* Unread Indicator Bar */}
                  {!isSelectMode && !isRead && (
                    <span className="w-2 h-2 rounded-full bg-red-600 mt-1 shrink-0 animate-pulse" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={`leading-snug truncate ${isRead ? 'font-normal text-neutral-700' : 'font-bold text-neutral-900'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] font-normal text-neutral-400 shrink-0">
                        {formatRelativeTime(n.time)}
                      </span>
                    </div>
                    <p className="text-neutral-500 mt-1 leading-relaxed line-clamp-2 text-[11px]">
                      {n.message}
                    </p>
                  </div>
                </div>
              );
            })}

            {notifications.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center justify-center text-neutral-400">
                <Inbox size={28} className="mb-2 opacity-40 text-neutral-300" />
                <p className="text-xs font-bold">No active notifications</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">You're all caught up with your documents.</p>
              </div>
            )}
          </div>

          {/* Footer Bar when in Multi-Select Mode */}
          {isSelectMode && (
            <div className="p-3 border-t border-neutral-100 bg-[#FDFBF9] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-neutral-500 font-medium">
                {selectedIds.length} item{selectedIds.length === 1 ? '' : 's'} selected
              </span>
              <button
                onClick={handleMarkSelectedAsRead}
                disabled={selectedIds.length === 0}
                className="px-3.5 py-1.5 bg-red-800 hover:bg-red-900 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Mark as Read
              </button>
            </div>
          )}

          {!isSelectMode && notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50/60 text-[10px] text-neutral-400 text-center select-none">
              Tip: Press & hold any notification to enter multi-select mode
            </div>
          )}
        </div>
      )}
    </div>
  );
}