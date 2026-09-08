import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, MessageSquare, RefreshCw, Search, FileText, ChevronRight, Hash, ChevronLeft, ArrowLeft } from 'lucide-react';
import { fetchWithAuth } from "../../api";

export default function OfficeChatHub({ userId, roleId, officeId, targetDoc = null, onClearTargetDoc = null }) {
  const [directory, setDirectory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const messageEndRef = useRef(null);

  useEffect(() => {
    fetchActiveDirectory();
  }, []);

  useEffect(() => {
    if (activeChannel) {
      fetchMessageLogs(activeChannel.roomId);
      const streamTimer = setInterval(() => fetchMessageLogs(activeChannel.roomId), 5000);
      return () => clearInterval(streamTimer);
    }
  }, [activeChannel]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchActiveDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const res = await fetchWithAuth('/api/chat/active-documents-directory');
      const data = await res.json();
      if (res.ok) setDirectory(data);
    } catch (err) { 
      console.error(err); 
    } finally {
      setLoadingDirectory(false);
    }
  };

  // Immediate selection of targetDoc when redirected from Document Tracking Details
  useEffect(() => {
    if (targetDoc) {
      handleSelectDocument(targetDoc, true);
      if (onClearTargetDoc) onClearTargetDoc();
    }
  }, [targetDoc]);

  const handleSelectDocument = async (doc, autoSelectFirstChannel = false) => {
    setDirectory(prev => prev.map(d => d.ini_id === doc.ini_id ? { ...d, hasAnyChat: false } : d));
    setSelectedDoc(doc);
    setActiveChannel(null);
    setMessages([]);

    try {
      const res = await fetchWithAuth(`/api/chat/document-channels/${doc.ini_id}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setChannels(data);

        // Auto-select workspace channel for processors
        if (roleId === 2 && officeId) {
          const targetOfficeChannel = data.find(c => c.officeId === parseInt(officeId));
          if (targetOfficeChannel) {
            handleActivateChannel(doc.ini_id, targetOfficeChannel);
            return;
          }
        }

        // Auto-select first unlocked station for originators if requested
        if (autoSelectFirstChannel && data.length > 0) {
          const firstAvailable = data.find(c => !c.isLocked) || data[0];
          if (firstAvailable) {
            handleActivateChannel(doc.ini_id, firstAvailable);
          }
        }
      }
    } catch (err) { 
      console.error(err); 
    }
  };

  const handleActivateChannel = async (docId, channel) => {
    setChannels(prev => prev.map(c => c.officeId === channel.officeId ? { ...c, hasChat: false } : c));
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/chat/get-or-create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iniId: docId, officeId: channel.officeId })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveChannel({ ...channel, roomId: data.roomId });
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchMessageLogs = async (roomId) => {
    try {
      const res = await fetchWithAuth(`/api/chat/rooms/${roomId}/messages`);
      const data = await res.json();
      if (res.ok) setMessages(data);
    } catch (err) { 
      console.error(err); 
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !activeChannel) return;

    try {
      const res = await fetchWithAuth('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: activeChannel.roomId, messageText: textInput })
      });
      if (res.ok) {
        setTextInput('');
        fetchMessageLogs(activeChannel.roomId);
      }
    } catch (err) { 
      console.error(err); 
    }
  };

  const filteredDirectory = directory.filter(doc => 
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adHocDetourChannel = roleId === 2 && channels.find(c => c.officeId !== parseInt(officeId));

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] border border-gray-200 bg-white rounded-2xl shadow-sm flex overflow-hidden text-left relative">
      
      {/* 1. DOCUMENT LIST (Full width on mobile if no doc selected) */}
      <div className={`flex-col flex-shrink-0 w-full md:w-72 lg:w-80 border-r border-gray-200 bg-gray-50/50 ${
        selectedDoc ? 'hidden md:flex' : 'flex'
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
                <span className="font-mono">ID: {doc.ini_id}</span>
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

      {/* 2. CHANNELS LIST (Mobile step 2: shown when doc selected but no chat active) */}
      {roleId === 1 && selectedDoc && (
        <div className={`flex-col flex-shrink-0 w-full md:w-64 border-r border-gray-200 bg-white ${
          activeChannel ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-gray-200 bg-gray-50/70 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedDoc(null)} 
                className="md:hidden p-1.5 -ml-1 text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer"
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
            {channels.length === 0 && (
              <p className="text-xs text-center text-gray-400 mt-8">No stations mapped to this file yet.</p>
            )}
          </div>
        </div>
      )}

      {/* 3. ACTIVE CHAT WORKSPACE (Full width on mobile when channel is active) */}
      <div className={`flex-col flex-1 w-full bg-gray-50/50 ${
        activeChannel ? 'flex' : 'hidden md:flex'
      }`}>
        {activeChannel ? (
          <>
            {/* Header with Mobile Back Button */}
            <div className="p-3.5 md:p-4 border-b border-gray-200 bg-white flex flex-col gap-3 shrink-0 shadow-xs z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (roleId === 1) setActiveChannel(null);
                    else setSelectedDoc(null);
                  }}
                  className="md:hidden p-1.5 -ml-1 text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
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

              {/* Ad-Hoc sub tabs for Processor (Role 2) */}
              {roleId === 2 && adHocDetourChannel && (
                <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-bold w-full overflow-x-auto">
                  <button 
                    onClick={() => handleSelectDocument(selectedDoc, false)}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 flex-1 justify-center cursor-pointer ${
                      activeChannel.officeId === parseInt(officeId) ? 'bg-white text-[#D32F2F] shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    Originator
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-gray-50/70">
              {messages.map(msg => {
                const isMe = msg.sender_id === parseInt(userId);
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
                  className="flex-1 border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm rounded-xl outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-gray-50 focus:bg-white transition-all shadow-2xs" 
                />
                <button 
                  type="submit" 
                  disabled={!textInput.trim()} 
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