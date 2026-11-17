import {parsePhilippineTime, formatPhilippineDate} from '../../../../utils/philippineTime';
import { useState, useEffect, useRef } from 'react';
import { Bell, X, Inbox, CheckCheck, CheckSquare, Square, Trash2 } from 'lucide-react';

const storedIds = key => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
};

export default function NotificationDropdown({
  notifications = [],
  onNotificationClick,
  userId = null,
  filters = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(() => storedIds(`bsu_read_notifications_${userId || 'guest'}`));
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [clearedIds, setClearedIds] = useState(() => storedIds(`bsu_cleared_notifications_${userId || 'guest'}`));
  const [sortOrder, setSortOrder] = useState('newest');
  const [category, setCategory] = useState('all');
  
  const containerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressTriggeredRef = useRef(false);

  const storageKey = `bsu_read_notifications_${userId || 'guest'}`;
  const clearedStorageKey = `bsu_cleared_notifications_${userId || 'guest'}`;

  // Persist read notifications
  const persistReadIds = (updatedIds) => {
    setReadNotificationIds(updatedIds);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedIds));
    } catch (e) {
      console.error(e);
    }
  };

  const persistClearedIds = (updatedIds) => {
    const limited = [...new Set(updatedIds.map(String))].slice(-500);
    setClearedIds(limited);
    try { localStorage.setItem(clearedStorageKey, JSON.stringify(limited)); }
    catch (error) { console.error(error); }
  };

  const visibleNotifications = notifications.filter(n => !clearedIds.includes(String(n.id)));
  const filteredNotifications = visibleNotifications
    .filter(n => category === 'all' || (n.categories || [n.category]).includes(category))
    .sort((a,b) => {
      const difference = (parsePhilippineTime(b.time)?.getTime() || 0) - (parsePhilippineTime(a.time)?.getTime() || 0);
      return sortOrder === 'newest' ? difference : -difference;
    });

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

  const unreadNotifications = visibleNotifications.filter(
    (n) => !readNotificationIds.includes(String(n.id))
  );
  const hasUnread = unreadNotifications.length > 0;

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const past = parsePhilippineTime(timestamp);
    if (!past) return '—';
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    
    const elapsed = now - past;
    if (elapsed < 0) return formatPhilippineDate(timestamp);
    if (elapsed < msPerMinute) return 'Just now';
    if (elapsed < msPerHour) return `${Math.round(elapsed / msPerMinute)}m ago`;
    if (elapsed < msPerDay) return `${Math.round(elapsed / msPerHour)}h ago`;
    return formatPhilippineDate(timestamp);
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
    const allIds = visibleNotifications.map((n) => String(n.id));
    persistReadIds(allIds);
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    }
  };

  const handleClear = () => {
    persistClearedIds([...clearedIds, ...visibleNotifications.map(n => n.id)]);
    setSelectedIds([]);
    setIsSelectMode(false);
  };
  const handleClearOne = id => persistClearedIds([...clearedIds, id]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger with Unread Indicator */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-[#2b1317] text-neutral-600 dark:text-gray-300 transition-colors relative cursor-pointer focus:outline-none"
        aria-label="Open notifications"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white dark:ring-[#180e10] animate-pulse" />
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
        <div className="fixed md:absolute right-0 bottom-0 md:bottom-auto md:top-full md:mt-2 w-full md:w-88 bg-white dark:bg-[#180e10] rounded-t-3xl md:rounded-2xl shadow-2xl border border-neutral-200 dark:border-[#42292f] z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-3 md:slide-in-from-top-2 duration-200 max-h-[82vh] md:max-h-[30rem] flex flex-col">
          
          {/* Header */}
          <div className="p-4 border-b border-neutral-100 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
                {isSelectMode ? `Selected (${selectedIds.length})` : 'Notifications'}
              </span>
              {!isSelectMode && hasUnread && (
                <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-black px-1.5 py-0.5 rounded-full">
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
                    className="text-[11px] font-bold text-neutral-600 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  >
                    {selectedIds.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedIds([]);
                    }}
                    className="text-[11px] font-bold text-neutral-400 dark:text-gray-500 hover:text-neutral-600 dark:hover:text-gray-300 cursor-pointer ml-1"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {hasUnread && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-bold text-red-800 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 cursor-pointer flex items-center gap-1"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} /> Mark all
                    </button>
                  )}
                  {visibleNotifications.length > 0 && <button onClick={handleClear} className="text-[11px] font-bold text-neutral-600 dark:text-gray-300 hover:text-red-800 dark:hover:text-red-400 flex items-center gap-1" title="Clear all notifications"><Trash2 size={14}/> Clear</button>}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-neutral-400 dark:text-gray-400 hover:text-neutral-600 dark:hover:text-gray-200 p-1 rounded-lg cursor-pointer md:hidden"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          {!isSelectMode && <div className="flex flex-wrap gap-2 border-b border-neutral-100 dark:border-[#42292f] px-4 py-2">
            {filters.length > 0 && <select aria-label="Filter notifications" value={category} onChange={event => setCategory(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-neutral-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] px-2 py-1.5 text-[11px] text-neutral-700 dark:text-gray-200">
              <option value="all">All notifications</option>
              {filters.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>}
            <select aria-label="Sort notifications" value={sortOrder} onChange={event => setSortOrder(event.target.value)} className="rounded-lg border border-neutral-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] px-2 py-1.5 text-[11px] text-neutral-700 dark:text-gray-200">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            </select>
          </div>}

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-neutral-100 dark:divide-gray-800 flex-1">
            {filteredNotifications.map((n) => {
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
                      ? 'bg-red-50/60 dark:bg-red-900/20'
                      : isRead
                      ? 'bg-white dark:bg-[#180e10] hover:bg-neutral-50/60 dark:hover:bg-[#2b1317]/40 opacity-65'
                      : 'bg-[#FCFAF8] dark:bg-[#1c1113] hover:bg-neutral-50 dark:hover:bg-[#2b1317] font-semibold'
                  }`}
                >
                  {/* Selection Mode Checkbox */}
                  {isSelectMode && (
                    <div className="mt-0.5 text-neutral-500 dark:text-gray-400 shrink-0">
                      {isSelected ? (
                        <CheckSquare size={16} className="text-red-800 dark:text-red-400" />
                      ) : (
                        <Square size={16} className="text-neutral-300 dark:text-gray-600" />
                      )}
                    </div>
                  )}

                  {/* Unread Indicator Bar */}
                  {!isSelectMode && !isRead && (
                    <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 mt-1 shrink-0 animate-pulse" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={`leading-snug truncate ${isRead ? 'font-normal text-neutral-700 dark:text-gray-300' : 'font-bold text-neutral-900 dark:text-white'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] font-normal text-neutral-400 dark:text-gray-500 shrink-0">
                        {formatRelativeTime(n.time)}
                      </span>
                    </div>
                    <p className="text-neutral-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2 text-[11px]">
                      {n.message}
                    </p>
                  </div>
                  {!isSelectMode && <button type="button" onClick={event => { event.stopPropagation(); handleClearOne(n.id); }}
                    onMouseDown={event => event.stopPropagation()} aria-label={`Clear notification: ${n.title}`}
                    title="Clear notification" className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-700 dark:hover:bg-[#2b1317]">
                    <X size={13}/>
                  </button>}
                </div>
              );
            })}

            {filteredNotifications.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center justify-center text-neutral-400 dark:text-gray-500">
                <Inbox size={28} className="mb-2 opacity-40 text-neutral-300 dark:text-gray-600" />
                <p className="text-xs font-bold">No active notifications</p>
                <p className="text-[10px] text-neutral-400 dark:text-gray-500 mt-0.5">No notifications in this view.</p>
              </div>
            )}
          </div>

          {/* Footer Bar when in Multi-Select Mode */}
          {isSelectMode && (
            <div className="p-3 border-t border-neutral-100 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-neutral-500 dark:text-gray-400 font-medium">
                {selectedIds.length} item{selectedIds.length === 1 ? '' : 's'} selected
              </span>
              <button
                onClick={handleMarkSelectedAsRead}
                disabled={selectedIds.length === 0}
                className="px-3.5 py-1.5 bg-red-800 dark:bg-red-700 hover:bg-red-900 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Mark as Read
              </button>
            </div>
          )}

          {!isSelectMode && filteredNotifications.length > 0 && (
            <div className="px-4 py-2 border-t border-neutral-100 dark:border-[#42292f] bg-neutral-50/60 dark:bg-[#1c1113] text-[10px] text-neutral-400 dark:text-gray-500 text-center select-none">
              Tip: Press & hold any notification to enter multi-select mode
            </div>
          )}
        </div>
      )}
    </div>
  );
}
