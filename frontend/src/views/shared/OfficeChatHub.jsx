import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, MessageSquare, RefreshCw, Search, FileText, ChevronRight, Hash } from 'lucide-react';
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
    try {
      const res = await fetchWithAuth('/api/chat/active-documents-directory');
      const data = await res.json();
      if (res.ok) setDirectory(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (targetDoc && directory.length > 0) {
      const matchedDoc = directory.find(d => d.ini_id === targetDoc.ini_id) || targetDoc;
      handleSelectDocument(matchedDoc);
      if (onClearTargetDoc) onClearTargetDoc();
    }
  }, [targetDoc, directory]);

  const handleSelectDocument = async (doc) => {
    // Optimistically clear the unread notification dot for the document in the directory
    setDirectory(prev => prev.map(d => d.ini_id === doc.ini_id ? { ...d, hasAnyChat: false } : d));
    
    setSelectedDoc(doc);
    setActiveChannel(null);
    setMessages([]);
    try {
      const res = await fetchWithAuth(`/api/chat/document-channels/${doc.ini_id}`);
      const data = await res.json();
      if (res.ok) {
        setChannels(data);
        
        // IF USER IS A PROCESSOR, AUTOMATICALLY LOAD THEIR SPECIFIC WORKSPACE CHANNEL
        if (roleId === 2 && officeId) {
          const targetOfficeChannel = data.find(c => c.officeId === parseInt(officeId));
          if (targetOfficeChannel) {
            handleActivateChannel(doc.ini_id, targetOfficeChannel);
          }
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleActivateChannel = async (docId, channel) => {
    // Optimistically clear the unread notification dot for this specific channel
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMessageLogs = async (roomId) => {
    try {
      const res = await fetchWithAuth(`/api/chat/rooms/${roomId}/messages`);
      const data = await res.json();
      if (res.ok) setMessages(data);
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
  };

  // FILTER DIRECTORY ENTRIES DYNAMICALLY BY TITLE SEARCH INPUT
  const filteredDirectory = directory.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // DETECT IF AN ACTIVE AD-HOC DETOUR IS EXTANT ON THE CURRENT LIFECYCLE
  const adHocDetourChannel = roleId === 2 && channels.find(c => c.officeId !== parseInt(officeId));

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] border border-gray-200 bg-white rounded-2xl shadow-sm flex overflow-hidden text-left animate-in fade-in duration-200">
      
      {/* LEFT COLUMN: SYSTEM DATA DIRECTORIES (With search integration) */}
      <div className="w-72 md:w-80 border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0">
        <div className="p-4 border-b border-gray-200 bg-white space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <FileText size={14} className="text-gray-400" />
              Document References
            </h4>
            <button 
              onClick={fetchActiveDirectory} 
              className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors focus:outline-none"
              title="Refresh Directory"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          
          {/* INTERACTIVE SEARCH BAR COMPONENT */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search by file name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] shadow-sm transition-all" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {filteredDirectory.map(doc => (
            <button key={doc.ini_id} onClick={() => handleSelectDocument(doc)}
                    className={`w-full p-3 text-left rounded-xl transition-all flex flex-col gap-1.5 relative border group cursor-pointer focus:outline-none ${
                      selectedDoc?.ini_id === doc.ini_id 
                        ? 'bg-white border-[#D32F2F] shadow-sm ring-1 ring-[#D32F2F]/20' 
                        : doc.hasAnyChat 
                          ? 'bg-amber-50/50 border-amber-200 hover:bg-white hover:border-amber-300 hover:shadow-sm' 
                          : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'
                    }`}>
              <div className="flex items-center justify-between w-full">
                <p className={`text-xs font-bold truncate pr-2 ${selectedDoc?.ini_id === doc.ini_id ? 'text-[#D32F2F]' : 'text-gray-900 group-hover:text-[#D32F2F] transition-colors'}`}>
                  {doc.title}
                </p>
                {doc.hasAnyChat && <span className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0 shadow-sm"></span>}
              </div>
              <span className="text-[10px] font-mono font-medium text-gray-500">ID: {doc.ini_id}</span>
            </button>
          ))}
          {filteredDirectory.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-10 opacity-60">
              <Search className="w-6 h-6 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500 font-medium">No matching records.</p>
            </div>
          )}
        </div>
      </div>

      {/* CENTER COLUMN: RENDERED FOR ORIGINATORS (ROLE 1) ONLY */}
      {roleId === 1 && selectedDoc && (
        <div className="w-64 border-r border-gray-200 flex flex-col flex-shrink-0 bg-white animate-in slide-in-from-left-4 duration-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Hash size={14} className="text-gray-400" />
              Station Channels
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-gray-50/30">
            {channels.map(chan => (
              <button key={chan.officeId} onClick={() => handleActivateChannel(selectedDoc.ini_id, chan)}
                      className={`w-full p-3 text-left rounded-xl border transition-all flex flex-col gap-2 relative group cursor-pointer focus:outline-none ${
                        activeChannel?.officeId === chan.officeId 
                          ? 'bg-gray-900 border-gray-900 text-white shadow-md' 
                          : chan.hasChat 
                            ? 'bg-amber-50 border-amber-200 text-gray-800 hover:bg-white hover:shadow-sm' 
                            : 'bg-white hover:border-gray-300 border-gray-200 text-gray-800 hover:shadow-sm'
                      }`}>
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs font-bold truncate pr-2">{chan.officeName}</p>
                  {chan.hasChat && activeChannel?.officeId !== chan.officeId && (
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0 shadow-sm"></span>
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
          </div>
        </div>
      )}

      {/* RIGHT COLUMN: INTERACTIVE MESSENGER WORKSPACE CONTEXT */}
      <div className="flex-1 flex flex-col bg-gray-50/50 relative">
        {activeChannel ? (
          <>
            <div className="p-4 md:p-5 border-b border-gray-200 bg-white flex flex-col gap-4 shrink-0 shadow-sm z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Hash size={16} className="text-gray-400" />
                    <h4 className="text-base font-bold text-gray-900">{activeChannel.officeName}</h4>
                  </div>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    Subject: <span className="text-[#D32F2F] font-bold truncate max-w-[300px]">{selectedDoc.title}</span>
                  </p>
                </div>
              </div>

              {/* CROSS-OFFICE AD-HOC VERIFICATION CHAT SUB-TABS (Only visible to processors under detour states) */}
              {roleId === 2 && adHocDetourChannel && (
                <div className="flex bg-gray-100 p-1.5 rounded-lg text-xs font-bold w-max max-w-full overflow-x-auto custom-scrollbar">
                  <button 
                    onClick={() => handleSelectDocument(selectedDoc)}
                    className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeChannel.officeId === parseInt(officeId) ? 'bg-white text-[#D32F2F] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <MessageSquare size={14} />
                    Chat with Originator
                  </button>
                  <button 
                    onClick={() => handleActivateChannel(selectedDoc.ini_id, adHocDetourChannel)}
                    className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeChannel.officeId !== parseInt(officeId) ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <RefreshCw size={14} />
                    Detour Office ({adHocDetourChannel.officeName.split(' ')[0]})
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-gray-50/80">
              {messages.map(msg => {
                const isMe = msg.sender_id === parseInt(userId);
                return (
                  <div key={msg.message_id} className={`flex flex-col w-max max-w-[85%] md:max-w-[70%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <span className="text-[10px] font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                      {isMe ? (
                        <>You <span className="w-1 h-1 rounded-full bg-gray-300"></span> {msg.role_name}</>
                      ) : (
                        <>{msg.sender_name} <span className="w-1 h-1 rounded-full bg-gray-300"></span> {msg.role_name}</>
                      )}
                    </span>
                    <div className={`p-3.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${isMe ? 'bg-[#D32F2F] text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
                      {msg.message_text}
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} className="h-2" />
            </div>

            {activeChannel.isLocked ? (
              <div className="p-4 border-t border-gray-200 bg-gray-100 flex items-center justify-center gap-2 text-gray-500 font-bold text-xs select-none">
                <Lock size={16} className="text-gray-400" /> {activeChannel.statusMessage}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white flex gap-3 shrink-0">
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  value={textInput} 
                  onChange={e => setTextInput(e.target.value)}
                  className="flex-1 border border-gray-300 px-4 py-3 text-sm rounded-xl outline-none focus:ring-2 focus:ring-red-100 focus:border-[#D32F2F] bg-gray-50 focus:bg-white transition-all shadow-sm" 
                />
                <button 
                  type="submit" 
                  disabled={!textInput.trim()} 
                  className="p-3 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-sm cursor-pointer flex items-center justify-center"
                >
                  <Send size={18} />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 select-none bg-white">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
              <MessageSquare size={28} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-600">No Chat Selected</p>
              <p className="text-xs font-medium mt-1">Select a reference file to establish conversation metrics.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}