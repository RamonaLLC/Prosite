import React, { useState, useEffect } from 'react';
import { Role, Job, WorkerProfile, DirectMessage } from '../types';
import { 
  MessageSquare, Send, User, Building, HardHat, 
  Home, X, Briefcase, CheckCircle, Clock, Search, ArrowLeft
} from 'lucide-react';

interface MessagingCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: Role;
  currentUserId: string;
  currentUserName: string;
  jobs: Job[];
  workers: WorkerProfile[];
  onSendMessage: (msg: { text: string; recipientId: string; recipientName: string; jobId?: string }) => void;
  initialJobId?: string;
  initialRecipientId?: string;
  onSelectJob?: (jobId: string) => void;
}

export default function MessagingCenterModal({
  isOpen,
  onClose,
  userRole,
  currentUserId,
  currentUserName,
  jobs,
  workers,
  onSendMessage,
  initialJobId,
  initialRecipientId,
  onSelectJob
}: MessagingCenterModalProps) {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || jobs[0]?.id || '');
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Mobile responsive layout: 'contacts' list view vs active 'conversation' thread
  const [mobileView, setMobileView] = useState<'contacts' | 'conversation'>(
    initialRecipientId ? 'conversation' : 'contacts'
  );

  useEffect(() => {
    if (initialJobId) {
      setSelectedJobId(initialJobId);
    }
    if (initialRecipientId) {
      setSelectedRecipientId(initialRecipientId);
      setMobileView('conversation');
    }
  }, [initialJobId, initialRecipientId, isOpen]);

  // Messages state persisted locally
  const [messages, setMessages] = useState<DirectMessage[]>(() => {
    try {
      const saved = localStorage.getItem('prosite_direct_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  // Normalize role checking for Agent vs Customer
  const isAgent = userRole === 'customer' || (userRole as string) === 'agent' || userRole === 'client';

  // Determine eligible recipients based on exact role permissions
  let eligibleRecipients: { id: string; name: string; roleDesc: string; roleType: string; jobId?: string }[] = [];

  if (userRole === 'company' || userRole === 'manager' || userRole === 'admin') {
    // Company & Manager: Message all roster employees + agents with active or completed jobs
    workers.forEach(w => {
      eligibleRecipients.push({
        id: w.id,
        name: w.name,
        roleDesc: `Employee (${w.position})`,
        roleType: 'employee'
      });
    });

    jobs.forEach(j => {
      eligibleRecipients.push({
        id: `agent-${j.clientEmail || j.id}`,
        name: `${j.clientName || 'Agent'} (${j.address})`,
        roleDesc: 'Agent (Project Owner)',
        roleType: 'agent',
        jobId: j.id
      });
    });
  } else if (userRole === 'employee' || userRole === 'worker') {
    // Employee: Message Company, Managers, and assigned agents
    eligibleRecipients.push({
      id: 'company-1',
      name: 'ABC Construction Headquarters',
      roleDesc: 'Company HQ / Dispatch',
      roleType: 'company'
    });

    workers.filter(w => w.role === 'manager').forEach(m => {
      eligibleRecipients.push({
        id: m.id,
        name: m.name,
        roleDesc: 'Manager',
        roleType: 'manager'
      });
    });

    // Assigned agents
    jobs.filter(j => j.assignedWorkers.includes(currentUserId)).forEach(j => {
      eligibleRecipients.push({
        id: `agent-${j.clientEmail || j.id}`,
        name: `${j.clientName || 'Agent'} (${j.address})`,
        roleDesc: 'Agent (Assigned Job Site)',
        roleType: 'agent',
        jobId: j.id
      });
    });
  } else if (isAgent) {
    // Agent: Can message the Company contractor
    eligibleRecipients.push({
      id: 'company-1',
      name: 'ProSite Contractors & Remodeling',
      roleDesc: 'Contractor Company Dispatch',
      roleType: 'company'
    });
  }

  // Deduplicate and filter
  const uniqueRecipients = eligibleRecipients.filter(
    (v, i, a) => a.findIndex(t => t.id === v.id) === i
  );

  const filteredRecipients = uniqueRecipients.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.roleDesc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeRecipient = uniqueRecipients.find(r => r.id === selectedRecipientId) || uniqueRecipients[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeRecipient) return;

    const newMsg: DirectMessage = {
      id: `m-${Date.now()}`,
      senderId: currentUserId || 'user-1',
      senderName: currentUserName || (isAgent ? 'Agent' : 'User'),
      senderRole: isAgent ? 'customer' : userRole,
      recipientId: activeRecipient.id,
      recipientName: activeRecipient.name,
      jobId: selectedJobId,
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    setMessages(prev => {
      const updated = [...prev, newMsg];
      try {
        localStorage.setItem('prosite_direct_messages', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    onSendMessage({
      text: newMsg.text,
      recipientId: newMsg.recipientId,
      recipientName: newMsg.recipientName,
      jobId: selectedJobId
    });

    setMessageText('');
  };

  const roleDisplayBadge = isAgent ? 'AGENT' : userRole.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[94vh] sm:h-[85vh] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col min-w-0">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-xl shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2 truncate">
                <span>ProSite Direct Messages</span>
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 border border-slate-700 font-mono shrink-0">
                  {roleDisplayBadge} PORTAL
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Secure project communications between company, managers, field crew, and Agents.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg transition shrink-0 ml-2 cursor-pointer"
            aria-label="Close messaging"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Responsive Layout: Single column toggled on mobile, 2-column side-by-side on md+ */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          
          {/* Left: Contacts List (Full width on mobile when mobileView === 'contacts', fixed width on desktop) */}
          <div className={`
            ${mobileView === 'contacts' ? 'flex' : 'hidden md:flex'}
            w-full md:w-72 lg:w-80 border-r border-slate-800 bg-slate-950 flex-col shrink-0 min-w-0
          `}>
            <div className="p-3 border-b border-slate-800 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
              {filteredRecipients.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No contacts found
                </div>
              ) : (
                filteredRecipients.map((recipient) => {
                  const isSelected = activeRecipient?.id === recipient.id;
                  return (
                    <div
                      key={recipient.id}
                      onClick={() => {
                        setSelectedRecipientId(recipient.id);
                        setMobileView('conversation');
                      }}
                      className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                        isSelected
                          ? 'bg-blue-950/60 border-l-4 border-blue-500 text-white'
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0">
                        {recipient.roleType === 'company' ? <Building className="w-4 h-4 text-purple-400" /> :
                         recipient.roleType === 'employee' ? <HardHat className="w-4 h-4 text-amber-400" /> :
                         <Home className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate">{recipient.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{recipient.roleDesc}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Message Stream & Input (Full width on mobile when mobileView === 'conversation', flex-1 on desktop) */}
          <div className={`
            ${mobileView === 'conversation' ? 'flex' : 'hidden md:flex'}
            flex-1 flex-col bg-slate-900 min-w-0 overflow-hidden
          `}>
            
            {/* Conversation Header */}
            {activeRecipient ? (
              <div className="px-3 sm:px-5 py-2.5 sm:py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 min-w-0 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Mobile Back Button to return to contacts list */}
                  <button
                    type="button"
                    onClick={() => setMobileView('contacts')}
                    className="md:hidden p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 text-xs font-bold transition shrink-0 cursor-pointer"
                    aria-label="Back to contacts list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-[11px]">Contacts</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 sm:gap-2 truncate">
                      <span className="truncate">{activeRecipient.name}</span>
                      <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono shrink-0">
                        {activeRecipient.roleDesc}
                      </span>
                    </h4>
                  </div>
                </div>

                {/* Job Linker */}
                {jobs.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 uppercase hidden sm:inline">Job:</span>
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] sm:text-xs text-white focus:outline-none focus:border-blue-500 max-w-[130px] sm:max-w-[200px] truncate"
                    >
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.address} — {j.clientName}
                        </option>
                      ))}
                    </select>
                    {selectedJobId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectJob) {
                            onSelectJob(selectedJobId);
                            onClose();
                          }
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                        title="View full job details in popup modal"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View Job</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-850 border-b border-slate-800 text-xs text-slate-400">
                Select a contact from the list to start messaging
              </div>
            )}

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 min-w-0">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <MessageSquare className="w-8 h-8 opacity-40 text-blue-400" />
                  <p className="text-xs font-semibold text-slate-400">No messages in this conversation yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Type a message below to communicate directly about projects, job updates, and schedules.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderRole === userRole || (isAgent && msg.senderRole === 'customer');
                  const linkedJob = jobs.find(j => j.id === msg.jobId);
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col min-w-0 ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mb-1 max-w-full truncate">
                        <span className="font-bold text-slate-300 truncate">{msg.senderName}</span>
                        <span>• {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {linkedJob && (
                          <span 
                            onClick={() => {
                              if (onSelectJob) {
                                onSelectJob(linkedJob.id);
                                onClose();
                              }
                            }}
                            className="text-blue-400 hover:text-blue-300 underline cursor-pointer font-bold truncate max-w-[140px]"
                            title="Click to open job details in modal"
                          >
                            ({linkedJob.address})
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-md p-3 rounded-2xl text-xs leading-relaxed break-words word-break-all ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                            : 'bg-slate-850 text-slate-200 border border-slate-750 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0 min-w-0">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Message ${activeRecipient?.name || 'recipient'}...`}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 sm:px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-0"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || !activeRecipient}
                className="px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Send</span>
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
}
