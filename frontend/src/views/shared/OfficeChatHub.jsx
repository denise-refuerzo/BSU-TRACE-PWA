import { useState, useEffect, useRef, useEffectEvent } from 'react';
import { createRealtimeClient as io } from '../../utils/realtimeClient';
import { publicReference } from '../../utils/publicReference';
import { Send, Lock, MessageSquare, RefreshCw, Search, FileText, Hash, ArrowLeft } from 'lucide-react';
import { fetchWithAuth } from "../../api";

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://bsu-trace-pwa.onrender.com';

function mergeMessages(previous, incoming) {
  const messages = new Map(previous.map(message => [String(message.message_id), message]));
  incoming.forEach(message => messages.set(String(message.message_id), message));
  return [...messages.values()].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
}

export default function OfficeChatHub({ userId, officeId, targetDoc = null, onClearTargetDoc = null, compact = false }) {
  const [directory, setDirectory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  
  const messageEndRef = useRef(null);
  const socketRef = useRef(null);
  const selectionVersion = useRef(0);
  const activeRoomRef = useRef(null);

  const fetchActiveDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const res = await fetchWithAuth('/api/chat/active-documents-directory');
      const data = await res.json();
      if (!res.ok) throw new Error('Unable to load conversations. Please try again.');
      setDirectory(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error(err);
      setError('Unable to load conversations. Use Refresh to try again.');
    } finally {
      setLoadingDirectory(false);
    }
  };

  const handleSelectDocument = async (doc, autoSelectFirstChannel = false) => {
    const version = ++selectionVersion.current;
    const directoryContext = directory.find(item => String(item.ini_id) === String(doc.ini_id));
    const selectedDocument = { ...doc, ...directoryContext };
    activeRoomRef.current = null;
    setDirectory(prev => prev.map(d => d.ini_id === doc.ini_id ? { ...d, hasAnyChat: false } : d));
    setSelectedDoc(selectedDocument);
    setActiveChannel(null);
    setMessages([]);
    setChannels([]);
    setError('');
    setLoading(true);

    try {
      const res = await fetchWithAuth(`/api/chat/document-channels/${doc.ini_id}`);
      const data = await res.json();
      if (version !== selectionVersion.current) return;
      if (!res.ok) throw new Error(data.error || 'Unable to load offices.');
      if (Array.isArray(data)) {
        const channelContext = data[0] || {};
        const canViewAllChannels = Boolean(selectedDocument.canViewAllChannels || channelContext.canViewAllChannels);
        const viewerRole = selectedDocument.viewerRole || channelContext.viewerRole || 'Processing Office';
        setSelectedDoc(previous => String(previous?.ini_id) === String(doc.ini_id) ? { ...previous, canViewAllChannels, viewerRole } : previous);
        setChannels(data);

        // Processing offices use their station. Submitters and collaborators can choose any station.
        if (!canViewAllChannels && officeId) {
          const targetOfficeChannel = data.find(c => c.officeId === parseInt(officeId));
          if (targetOfficeChannel) {
            handleActivateChannel(doc.ini_id, targetOfficeChannel);
            return;
          }
          setError('No conversation is available for your office on this document.');
        }

        if (canViewAllChannels && autoSelectFirstChannel && data.length > 0) {
          const firstAvailable = data.find(c => !c.isLocked) || data[0];
          if (firstAvailable) {
            handleActivateChannel(doc.ini_id, firstAvailable);
          }
        }
      }
    } catch (err) { 
      if (version === selectionVersion.current) setError('Unable to load offices for this document. Please try again.');
      console.error(err);
    } finally {
      if (version === selectionVersion.current) setLoading(false);
    }
  };

  const handleActivateChannel = async (docId, channel) => {
    const version = ++selectionVersion.current;
    activeRoomRef.current = null;
    setActiveChannel(null);
    setMessages([]);
    setError('');
    setChannels(prev => prev.map(c => c.officeId === channel.officeId ? { ...c, hasChat: false } : c));
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/chat/get-or-create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iniId: docId, officeId: channel.officeId })
      });
      const data = await res.json();
      if (version !== selectionVersion.current) return;
      if (res.ok) {
        activeRoomRef.current = data.roomId;
        setActiveChannel({ ...channel, roomId: data.roomId });
      } else {
        setError(data.error || 'Unable to open this conversation.');
      }
    } catch (err) { 
      if (version === selectionVersion.current) setError('Unable to open this conversation. Please try again.');
      console.error(err);
    } finally { 
      if (version === selectionVersion.current) setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !activeChannel || sending) return;
    const roomId = activeChannel.roomId;
    const draft = textInput;
    setSending(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: activeChannel.roomId, messageText: textInput })
      });
      if (res.ok) {
        const message = await res.json();
        if (String(activeRoomRef.current) === String(roomId)) {
          setMessages(previous => mergeMessages(previous, [message]));
          setTextInput(current => current === draft ? '' : current);
        }
      } else {
        setError('Message was not sent. Your draft is still available to retry.');
      }
    } catch (err) { 
      console.error(err);
      setError('Could not verify delivery. Check the conversation before retrying.');
    } finally {
      setSending(false);
    }
  };

  const refreshDirectory = useEffectEvent(() => fetchActiveDirectory());
  const openTarget = useEffectEvent(doc => {
    handleSelectDocument(doc, true);
    onClearTargetDoc?.();
  });

  useEffect(() => {
    const socket = io(SOCKET_URL, { reconnection: true });
    socketRef.current = socket;
    let connectedOnce = false;
    const connect = () => {
      if (userId) socket.emit('join-user-room', userId);
      if (officeId) socket.emit('join-office-room', officeId);
      if (connectedOnce) refreshDirectory();
      connectedOnce = true;
    };
    const refresh = () => refreshDirectory();
    socket.on('connect', connect);
    socket.on('chat-badge-updated', refresh);
    const initial = setTimeout(refresh, 0);
    return () => { clearTimeout(initial); socket.disconnect(); };
  }, [userId, officeId]);

  useEffect(() => {
    if (!targetDoc) return;
    const timer = setTimeout(() => openTarget(targetDoc), 0);
    return () => clearTimeout(timer);
  }, [targetDoc]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!activeChannel || !socket) return;
    const roomId = activeChannel.roomId;
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const res = await fetchWithAuth(`/api/chat/rooms/${roomId}/messages`);
        if (!res.ok) throw new Error('Unable to load messages.');
        const data = await res.json();
        if (!cancelled && String(activeRoomRef.current) === String(roomId)) setMessages(previous => mergeMessages(previous, data));
      } catch (err) { if (!cancelled) setError(err.message); }
    };
    const join = () => {
      socket.emit('join-chat-channel', roomId);
      loadMessages();
    };
    const receive = message => {
      if (String(activeRoomRef.current) === String(roomId) && String(message.room_id) === String(roomId)) setMessages(previous => mergeMessages(previous, [message]));
    };
    socket.on('new-chat-message', receive);
    socket.on('connect', join);
    // Reconnection runs join again and retrieves any messages missed offline.
    if (!socket.connected) loadMessages();
    return () => {
      cancelled = true;
      socket.emit('leave-chat-channel', roomId);
      socket.off('new-chat-message', receive);
      socket.off('connect', join);
    };
  }, [activeChannel, userId, officeId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const filteredDirectory = directory.filter(doc => 
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usesChannelPicker = Boolean(selectedDoc?.canViewAllChannels);
  const adHocDetourChannel = !usesChannelPicker && channels.find(c => c.officeId !== parseInt(officeId));

  return (
    <div className={`${compact ? 'h-full w-full' : 'max-w-6xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)]'} border border-gray-200 bg-white ${compact ? 'rounded-none border-0' : 'rounded-2xl shadow-sm'} flex overflow-hidden text-left relative`}>
      
      {/* 1. DOCUMENT LIST (Full width on mobile if no doc selected) */}
      <div className={`flex-col min-h-0 flex-shrink-0 w-full ${compact ? '' : 'md:w-72 lg:w-80'} border-r border-gray-200 bg-gray-50/50 ${
        selectedDoc ? (compact ? 'hidden' : 'hidden md:flex') : 'flex'
      }`}>
        <div className="p-4 border-b border-gray-200 bg-white space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <FileText size={14} className="text-[#D32F2F]" />
              Document References
            </h4>
            <button 
              onClick={fetchActiveDirectory} 
              className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw size={14} className={loadingDirectory ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search by file name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] shadow-xs transition-all" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {error && !selectedDoc && <p role="alert" className="p-2 text-xs text-red-700">{error}</p>}
          {filteredDirectory.map(doc => (
            <button 
              key={doc.ini_id} 
              onClick={() => handleSelectDocument(doc, false)}
              className={`w-full p-3.5 text-left rounded-xl transition-all flex flex-col gap-1.5 relative border group cursor-pointer ${
                selectedDoc?.ini_id === doc.ini_id 
                  ? 'bg-white border-[#D32F2F] shadow-sm ring-1 ring-[#D32F2F]/20' 
                  : doc.hasAnyChat 
                    ? 'bg-amber-50/60 border-amber-200 hover:bg-white hover:border-amber-300' 
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <p className={`text-xs font-bold truncate pr-2 ${selectedDoc?.ini_id === doc.ini_id ? 'text-[#D32F2F]' : 'text-gray-900 group-hover:text-[#D32F2F] transition-colors'}`}>
                  {doc.title}
                </p>
                {doc.hasAnyChat && <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0 animate-pulse"></span>}
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                <span className="font-mono">{publicReference('DOC', doc.ini_id)}</span>
                <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
              </div>
            </button>
          ))}
          {!loadingDirectory && filteredDirectory.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-12 text-gray-400">
              <Search className="w-6 h-6 mb-2" />
              <p className="text-xs font-medium">No matching files found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Submitters and collaborators choose among the document's office channels. */}
      {usesChannelPicker && selectedDoc && (
        <div className={`flex-col min-h-0 flex-shrink-0 w-full ${compact ? '' : 'md:w-64'} border-r border-gray-200 bg-white ${
          activeChannel ? (compact ? 'hidden' : 'hidden md:flex') : 'flex'
        }`}>
          <div className="p-4 border-b border-gray-200 bg-gray-50/70 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { selectionVersion.current += 1; setSelectedDoc(null); setLoading(false); }}
                className={`${compact ? '' : 'md:hidden'} p-1.5 -ml-1 text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer`}
                title="Back to Documents"
              >
                <ArrowLeft size={16} />
              </button>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <Hash size={14} className="text-gray-400" />
                Station Channels
              </h4>
            </div>
            <span className="text-[10px] font-bold text-gray-400 max-w-[90px] truncate">{selectedDoc.title}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-gray-50/30">
            {channels.map(chan => (
              <button 
                key={chan.officeId} 
                onClick={() => handleActivateChannel(selectedDoc.ini_id, chan)}
                className={`w-full p-3 text-left rounded-xl border transition-all flex flex-col gap-2 relative group cursor-pointer ${
                  activeChannel?.officeId === chan.officeId 
                    ? 'bg-gray-900 border-gray-900 text-white shadow-md' 
                    : chan.hasChat 
                      ? 'bg-amber-50 border-amber-200 text-gray-800 hover:bg-white' 
                      : 'bg-white hover:border-gray-300 border-gray-200 text-gray-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs font-bold truncate pr-2">{chan.officeName}</p>
                  {chan.hasChat && activeChannel?.officeId !== chan.officeId && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0"></span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${activeChannel?.officeId === chan.officeId ? 'bg-red-400' : chan.isLocked ? 'bg-gray-400' : 'bg-emerald-500'}`}></span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${activeChannel?.officeId === chan.officeId ? 'text-gray-300' : chan.isLocked ? 'text-gray-500' : 'text-emerald-700'}`}>
                    {chan.statusMessage}
                  </span>
                </div>
              </button>
            ))}
            {error && <p role="alert" className="text-xs text-red-700 p-2">{error}</p>}
            {loading && <p role="status" className="text-xs text-gray-500 p-2">Opening conversation…</p>}
            {!loading && channels.length === 0 && (
              <p className="text-xs text-center text-gray-400 mt-8">No stations mapped to this file yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Office users have one relevant channel, so resolve it without showing the channel picker. */}
      {!usesChannelPicker && selectedDoc && !activeChannel && (
        <div className="flex min-h-0 w-full flex-1 flex-col bg-white">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/70 p-4">
            <button
              type="button"
              onClick={() => { selectionVersion.current += 1; setSelectedDoc(null); setLoading(false); setError(''); }}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-200"
              aria-label="Back to documents"
            >
              <ArrowLeft size={17} />
            </button>
            <p className="min-w-0 truncate text-xs font-bold text-gray-800">{selectedDoc.title}</p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            {loading ? (
              <>
                <RefreshCw size={24} className="animate-spin text-[#D32F2F]" />
                <div><p role="status" className="text-sm font-bold text-gray-800">Opening conversation…</p><p className="mt-1 text-xs text-gray-400">Connecting to your office channel.</p></div>
              </>
            ) : (
              <>
                <MessageSquare size={24} className="text-gray-300" />
                <div><p className="text-sm font-bold text-gray-800">Conversation unavailable</p><p role="alert" className="mt-1 text-xs text-gray-500">{error || 'This document has no conversation for your office.'}</p></div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. ACTIVE CHAT WORKSPACE (Full width on mobile when channel is active) */}
      <div className={`flex-col min-h-0 min-w-0 flex-1 w-full bg-gray-50/50 ${
        activeChannel ? 'flex' : (compact ? 'hidden' : 'hidden md:flex')
      }`}>
        {activeChannel ? (
          <>
            {/* Header with Mobile Back Button */}
            <div className="p-3.5 md:p-4 border-b border-gray-200 bg-white flex flex-col gap-3 shrink-0 shadow-xs z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    selectionVersion.current += 1;
                    activeRoomRef.current = null;
                    setActiveChannel(null);
                    if (!usesChannelPicker) setSelectedDoc(null);
                  }}
                  className={`${compact ? '' : 'md:hidden'} p-1.5 -ml-1 text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer`}
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Hash size={15} className="text-[#D32F2F] shrink-0" />
                    <h4 className="text-sm md:text-base font-bold text-gray-900 truncate">{activeChannel.officeName}</h4>
                  </div>
                  <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                    Subject: <span className="text-gray-900 font-bold">{selectedDoc?.title}</span>
                  </p>
                </div>
              </div>

              {/* Ad-hoc station switcher for processing-office participants. */}
              {!usesChannelPicker && adHocDetourChannel && (
                <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-bold w-full overflow-x-auto">
                  <button 
                    onClick={() => handleSelectDocument(selectedDoc, false)}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 flex-1 justify-center cursor-pointer ${
                      activeChannel.officeId === parseInt(officeId) ? 'bg-white text-[#D32F2F] shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    Submitter channel
                  </button>
                  <button 
                    onClick={() => handleActivateChannel(selectedDoc.ini_id, adHocDetourChannel)}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 flex-1 justify-center cursor-pointer ${
                      activeChannel.officeId !== parseInt(officeId) ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    Detour ({adHocDetourChannel.officeName.split(' ')[0]})
                  </button>
                </div>
              )}
            </div>

            {/* Messages Feed */}
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-gray-50/70">
              {messages.map(msg => {
                const isMe = String(msg.sender_id) === String(userId);
                return (
                  <div 
                    key={msg.message_id} 
                    className={`flex flex-col w-max max-w-[85%] md:max-w-[70%] ${
                      isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                      {isMe ? 'You' : msg.sender_name} • {msg.role_name}
                    </span>
                    <div className={`p-3 md:p-3.5 rounded-2xl text-xs md:text-sm font-medium leading-relaxed shadow-xs break-words ${
                      isMe 
                        ? 'bg-[#D32F2F] text-white rounded-tr-xs' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs'
                    }`}>
                      {msg.message_text}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                  <MessageSquare size={24} className="mb-2 opacity-50" />
                  No messages yet. Send an inquiry below to begin.
                </div>
              )}
              <div ref={messageEndRef} className="h-2" />
            </div>

            {/* Input Bar or Locked Status */}
            {error && <p role="alert" className="px-4 py-2 text-xs text-red-700 bg-red-50">{error}</p>}
            {activeChannel.isLocked ? (
              <div className="p-3.5 border-t border-gray-200 bg-gray-100 flex items-center justify-center gap-2 text-gray-500 font-bold text-xs select-none">
                <Lock size={14} className="text-gray-400" /> {activeChannel.statusMessage}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-gray-200 bg-white flex gap-2 shrink-0">
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  value={textInput} 
                  onChange={e => setTextInput(e.target.value)}
                  className="min-w-0 flex-1 border border-gray-300 px-3.5 py-2.5 text-base md:text-sm rounded-xl outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-gray-50 focus:bg-white transition-all shadow-2xs"
                />
                <button 
                  type="submit" 
                  disabled={!textInput.trim() || sending}
                  aria-label="Send message"
                  className="px-4 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-xl shadow-xs transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center"
                >
                  <Send size={16} />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 select-none bg-white p-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 shadow-xs">
              <MessageSquare size={24} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700">No Chat Selected</p>
              <p className="text-xs font-medium text-gray-400 mt-1">Select a document reference on the left to start a thread.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
