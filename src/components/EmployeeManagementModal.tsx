import React, { useState } from 'react';
import { WorkerProfile, Job, Invitation, CompanyCard, ExpensePurchase } from '../types';
import { 
  Users, UserCheck, MapPin, UserX, UserPlus, Trash2, 
  Check, X, AlertTriangle, Shield, Mail, Key, Clock, 
  ChevronRight, Briefcase, AlertCircle, CreditCard, DollarSign,
  Fuel, ShoppingCart, Calendar, Edit2, Save
} from 'lucide-react';
import { formatMDY } from '../utils/dateFormatter';

interface EmployeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: WorkerProfile[];
  jobs: Job[];
  cards?: CompanyCard[];
  expenses?: ExpensePurchase[];
  onUpdateWorkers: (updated: WorkerProfile[]) => void;
  onUpdateJobs: (updated: Job[]) => void;
  onSendInvite: (email: string, role: 'manager' | 'employee', managerCode?: string, jobRole?: string) => void;
  onSendNotification: (title: string, message: string, type: any, jobId?: string, workerId?: string) => void;
  userRole: 'company' | 'manager' | 'admin';
}

export default function EmployeeManagementModal({
  isOpen,
  onClose,
  workers,
  jobs,
  cards = [],
  expenses = [],
  onUpdateWorkers,
  onUpdateJobs,
  onSendInvite,
  onSendNotification,
  userRole
}: EmployeeManagementModalProps) {
  // Selected worker for actions & detail inspection
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  
  // Job Role editing state for selected worker
  const [isEditingJobRole, setIsEditingJobRole] = useState(false);
  const [editedJobRole, setEditedJobRole] = useState('');

  // Selected timeframe for card & expense metrics
  const [expenseTimeframe, setExpenseTimeframe] = useState<'week' | 'month' | 'all'>('month');

  // Action sub-modals / confirmation states
  const [actionType, setActionType] = useState<'none' | 'addToJob' | 'removeFromJob' | 'markIdle' | 'removeEmployee'>('none');
  const [selectedJobIdForAdd, setSelectedJobIdForAdd] = useState<string>('');
  const [selectedJobIdForRemove, setSelectedJobIdForRemove] = useState<string>('');

  // Add / Invite Form State (Company specifies Job Role)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'employee' | 'manager'>('employee');
  const [inviteJobRole, setInviteJobRole] = useState('General Laborer');
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState<string | null>(null);

  const isCompanyOwner = userRole === 'company' || userRole === 'admin';

  if (!isOpen) return null;

  // Sync edited job role when selectedWorker changes
  const handleSelectWorker = (worker: WorkerProfile) => {
    setSelectedWorker(worker);
    setEditedJobRole(worker.jobRole || worker.position || 'Field Specialist');
    setIsEditingJobRole(false);
    setActionType('none');
  };

  const handleSaveJobRole = () => {
    if (!selectedWorker || !editedJobRole.trim()) return;
    const updated = workers.map(w => {
      if (w.id === selectedWorker.id) {
        return {
          ...w,
          jobRole: editedJobRole.trim(),
          position: editedJobRole.trim()
        };
      }
      return w;
    });
    onUpdateWorkers(updated);
    setSelectedWorker({
      ...selectedWorker,
      jobRole: editedJobRole.trim(),
      position: editedJobRole.trim()
    });
    setIsEditingJobRole(false);
    onSendNotification(
      'Job Role Updated',
      `Company updated job role for ${selectedWorker.name} to "${editedJobRole.trim()}".`,
      'system',
      undefined,
      selectedWorker.id
    );
  };

  // 1. Currently On Site (Geofence verified at job)
  const onSiteWorkers = workers.filter(w => w.isAtJob && !w.isIdle);

  // 2. Idle (Not at job site or explicitly marked idle)
  const idleWorkers = workers.filter(w => !w.isAtJob || w.isIdle);

  // Active jobs for assigning
  const activeJobs = jobs.filter(j => j.status === 'in-progress' || j.status === 'planning');

  // Handle Add to Job
  const handleConfirmAddToJob = () => {
    if (!selectedWorker || !selectedJobIdForAdd) return;

    const targetJob = jobs.find(j => j.id === selectedJobIdForAdd);
    if (!targetJob) return;

    // Update job assigned workers
    const updatedJobs = jobs.map(j => {
      if (j.id === selectedJobIdForAdd) {
        const alreadyIn = j.assignedWorkers.includes(selectedWorker.id);
        const nextList = alreadyIn ? j.assignedWorkers : [...j.assignedWorkers, selectedWorker.id];
        return { ...j, assignedWorkers: nextList };
      }
      return j;
    });

    // Update worker state
    const updatedWorkers = workers.map(w => {
      if (w.id === selectedWorker.id) {
        return { ...w, isIdle: false, currentJobId: selectedJobIdForAdd };
      }
      return w;
    });

    onUpdateJobs(updatedJobs);
    onUpdateWorkers(updatedWorkers);

    onSendNotification(
      '👷 Assigned to Job',
      `You have been assigned to job site at ${targetJob.address}.`,
      'assignment',
      targetJob.id,
      selectedWorker.id
    );

    setActionType('none');
    setSelectedJobIdForAdd('');
  };

  // Handle Remove from Job
  const handleConfirmRemoveFromJob = () => {
    if (!selectedWorker || !selectedJobIdForRemove) return;

    const targetJob = jobs.find(j => j.id === selectedJobIdForRemove);
    if (!targetJob) return;

    const updatedJobs = jobs.map(j => {
      if (j.id === selectedJobIdForRemove) {
        return {
          ...j,
          assignedWorkers: j.assignedWorkers.filter(id => id !== selectedWorker.id)
        };
      }
      return j;
    });

    const updatedWorkers = workers.map(w => {
      if (w.id === selectedWorker.id) {
        return {
          ...w,
          currentJobId: w.currentJobId === selectedJobIdForRemove ? undefined : w.currentJobId
        };
      }
      return w;
    });

    onUpdateJobs(updatedJobs);
    onUpdateWorkers(updatedWorkers);

    onSendNotification(
      'Job Assignment Updated',
      `You have been removed from the job site at ${targetJob.address}.`,
      'assignment',
      targetJob.id,
      selectedWorker.id
    );

    setActionType('none');
    setSelectedJobIdForRemove('');
  };

  // Handle Mark Idle
  const handleConfirmMarkIdle = () => {
    if (!selectedWorker) return;

    // Remove worker from any currently assigned jobs
    const updatedJobs = jobs.map(j => ({
      ...j,
      assignedWorkers: j.assignedWorkers.filter(id => id !== selectedWorker.id)
    }));

    // Update worker to idle
    const updatedWorkers = workers.map(w => {
      if (w.id === selectedWorker.id) {
        return {
          ...w,
          isIdle: true,
          isAtJob: false,
          currentJobId: undefined
        };
      }
      return w;
    });

    onUpdateJobs(updatedJobs);
    onUpdateWorkers(updatedWorkers);

    onSendNotification(
      'Status Changed to Idle',
      `You have been marked as Idle by company management.`,
      'system',
      undefined,
      selectedWorker.id
    );

    setActionType('none');
  };

  // Handle Remove Employee Completely (Destructive)
  const handleConfirmRemoveEmployee = () => {
    if (!selectedWorker) return;

    // Remove worker from all jobs
    const updatedJobs = jobs.map(j => ({
      ...j,
      assignedWorkers: j.assignedWorkers.filter(id => id !== selectedWorker.id)
    }));

    // Remove from roster
    const updatedWorkers = workers.filter(w => w.id !== selectedWorker.id);

    onUpdateJobs(updatedJobs);
    onUpdateWorkers(updatedWorkers);

    setActionType('none');
    setSelectedWorker(null);
  };

  // Handle Send Invite
  const handleSendInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    // Generate random 5 digit code if manager
    const managerCode = inviteRole === 'manager' ? String(Math.floor(10000 + Math.random() * 90000)) : undefined;

    onSendInvite(inviteEmail, inviteRole, managerCode, inviteJobRole);

    setInviteSuccessMessage(
      inviteRole === 'manager'
        ? `Manager invitation sent to ${inviteEmail} with Job Role "${inviteJobRole}"! 5-Digit Verification Code: ${managerCode}`
        : `Employee invitation sent to ${inviteEmail} with Company-Assigned Job Role "${inviteJobRole}"!`
    );

    setInviteEmail('');
    setTimeout(() => {
      setInviteSuccessMessage(null);
    }, 6000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Employee & Crew Management
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                  {workers.length} Members
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage on-site check-ins, idle personnel, job assignments, and company invitations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* SECTION 1: CURRENTLY ON SITE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-mono">
                  1. Currently On Site ({onSiteWorkers.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Verified by Job Site Geofence</span>
            </div>

            {onSiteWorkers.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                No employees are currently checked in on-site.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {onSiteWorkers.map((worker) => {
                  const currentJob = jobs.find(j => j.id === worker.currentJobId);
                  return (
                    <div
                      key={worker.id}
                      onClick={() => handleSelectWorker(worker)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        selectedWorker?.id === worker.id
                          ? 'bg-blue-950/60 border-blue-500 shadow-md ring-1 ring-blue-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={worker.avatar}
                          alt={worker.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/60"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{worker.name}</span>
                            {worker.role === 'manager' && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-mono rounded">
                                Manager
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium">{worker.jobRole || worker.position}</p>
                          {currentJob && (
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {currentJob.address}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30 block">
                          On Site
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block mt-1">Tap to Manage</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: IDLE PERSONNEL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
                  2. Idle Personnel ({idleWorkers.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Available for Assignment</span>
            </div>

            {idleWorkers.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                No personnel currently in idle state.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {idleWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    onClick={() => handleSelectWorker(worker)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      selectedWorker?.id === worker.id
                        ? 'bg-blue-950/60 border-blue-500 shadow-md ring-1 ring-blue-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={worker.avatar}
                        alt={worker.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 opacity-80"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{worker.name}</span>
                          {worker.role === 'manager' && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-mono rounded">
                              Manager
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">{worker.jobRole || worker.position}</p>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          Status: {worker.isIdle ? 'Manually Idle' : 'Off Clock'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] font-semibold border border-slate-700 block">
                        Idle
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-1">Tap to Manage</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVE WORKER ACTIONS & FINANCIALS PANEL (Appears when an employee is selected) */}
          {selectedWorker && (() => {
            const assignedCards = cards.filter(c => 
              c.assignedWorkerId === selectedWorker.id || 
              (selectedWorker.assignedCardIds && selectedWorker.assignedCardIds.includes(c.id))
            );

            // Filter expenses for this worker
            const allWorkerExpenses = expenses.filter(exp => 
              exp.workerId === selectedWorker.id || 
              assignedCards.some(c => c.id === exp.cardId)
            );

            // Apply timeframe filter
            const now = new Date();
            const filteredExpenses = allWorkerExpenses.filter(exp => {
              if (expenseTimeframe === 'all') return true;
              const expDate = new Date(exp.date);
              if (expenseTimeframe === 'week') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return expDate >= oneWeekAgo;
              }
              if (expenseTimeframe === 'month') {
                const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return expDate >= oneMonthAgo;
              }
              return true;
            });

            const gasExpenses = filteredExpenses.filter(e => 
              e.category === 'Fuel' || 
              e.category === 'Gas' || 
              (e.description && e.description.toLowerCase().includes('gas')) ||
              (e.merchant && (
                e.merchant.toLowerCase().includes('shell') || 
                e.merchant.toLowerCase().includes('chevron') || 
                e.merchant.toLowerCase().includes('exxon') ||
                e.merchant.toLowerCase().includes('speedway') ||
                e.merchant.toLowerCase().includes('fuel')
              ))
            );

            const totalSpent = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const totalGasSpent = gasExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const totalGeneralSpent = totalSpent - totalGasSpent;

            return (
              <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border-2 border-blue-500/50 space-y-5 shadow-xl animate-fade-in">
                
                {/* Employee Header & Job Role Manager */}
                <div className="flex justify-between items-start flex-wrap gap-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedWorker.avatar}
                      alt={selectedWorker.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white">
                          {selectedWorker.name}
                        </h4>
                        {selectedWorker.role === 'manager' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                            Manager
                          </span>
                        )}
                      </div>

                      {/* Company-Assigned Job Role Section */}
                      <div className="mt-1 flex items-center gap-2">
                        {!isEditingJobRole ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-blue-400" />
                              Job Role: {selectedWorker.jobRole || selectedWorker.position}
                            </span>
                            {isCompanyOwner ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingJobRole(true);
                                  setEditedJobRole(selectedWorker.jobRole || selectedWorker.position || '');
                                }}
                                className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 font-mono transition cursor-pointer"
                                title="Company can edit this employee's job role"
                              >
                                <Edit2 className="w-3 h-3" /> Edit Role
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono italic">
                                (Company Assigned)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap animate-fade-in">
                            <input
                              type="text"
                              value={editedJobRole}
                              onChange={(e) => setEditedJobRole(e.target.value)}
                              placeholder="e.g. Lead Carpenter"
                              className="bg-slate-900 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                            />
                            <button
                              type="button"
                              onClick={handleSaveJobRole}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow"
                            >
                              <Save className="w-3 h-3" /> Save Role
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingJobRole(false)}
                              className="px-2 py-1 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-1">
                        {selectedWorker.phone || '+1 (415) 555-0199'} • {selectedWorker.address || 'San Francisco, CA'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedWorker(null)}
                    className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-800 rounded-lg transition"
                  >
                    Deselect
                  </button>
                </div>

                {/* Company Cards & Expense Usage (Timeframe Selected) */}
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <h5 className="text-xs font-black uppercase tracking-wider text-white font-mono">
                        Company Cards & Expense Tracking
                      </h5>
                    </div>

                    {/* Timeframe selector: Week, Month, All Time */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setExpenseTimeframe('week')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                          expenseTimeframe === 'week'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        This Week
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseTimeframe('month')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                          expenseTimeframe === 'month'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        This Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseTimeframe('all')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                          expenseTimeframe === 'all'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All Time
                      </button>
                    </div>
                  </div>

                  {/* Assigned Card(s) Badges */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block font-mono">
                      Assigned Company Card(s):
                    </span>
                    {assignedCards.length === 0 ? (
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-slate-400 text-xs italic">
                        No company cards currently assigned to {selectedWorker.name}. Assign cards under Company Settings → Company Cards.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {assignedCards.map(card => (
                          <div key={card.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-white block">{card.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {card.last4 ? `•••• ${card.last4}` : card.cardNumber} • Limit: ${(card.limit || card.monthlyLimit || 2500).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30">
                              {card.category || card.cardType || 'GAS / EXPENSES'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Financial Totals for Selected Timeframe */}
                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Card Spending</span>
                      <span className="text-base font-black text-white font-mono mt-0.5 block">
                        ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">{filteredExpenses.length} transactions</span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-mono text-amber-400 block uppercase flex items-center gap-1">
                        <Fuel className="w-3 h-3" /> Gas Purchases
                      </span>
                      <span className="text-base font-black text-amber-300 font-mono mt-0.5 block">
                        ${totalGasSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">{gasExpenses.length} fill-ups</span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-mono text-blue-400 block uppercase flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" /> Other Expenses
                      </span>
                      <span className="text-base font-black text-blue-300 font-mono mt-0.5 block">
                        ${totalGeneralSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">{filteredExpenses.length - gasExpenses.length} purchases</span>
                    </div>
                  </div>

                  {/* Recent Transactions List */}
                  {filteredExpenses.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                        Transaction History ({expenseTimeframe === 'week' ? 'This Week' : expenseTimeframe === 'month' ? 'This Month' : 'All Time'}):
                      </span>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {filteredExpenses.slice(0, 8).map(exp => (
                          <div key={exp.id} className="p-2 bg-slate-900/90 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              {exp.category === 'Fuel' || (exp.merchant && exp.merchant.toLowerCase().includes('shell')) ? (
                                <Fuel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <ShoppingCart className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              )}
                              <div>
                                <span className="font-bold text-white block text-[11px]">{exp.merchant || exp.description}</span>
                                <span className="text-[9px] text-slate-400 font-mono">{formatMDY(exp.date)} • {exp.category}</span>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              ${exp.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Management Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* 1. Add to Job */}
                <button
                  onClick={() => setActionType('addToJob')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    actionType === 'addToJob'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-blue-400" /> Add to Job
                </button>

                {/* 2. Remove from Job */}
                <button
                  onClick={() => setActionType('removeFromJob')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    actionType === 'removeFromJob'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                  }`}
                >
                  <UserX className="w-4 h-4 text-amber-400" /> Remove from Job
                </button>

                {/* 3. Mark Idle */}
                <button
                  onClick={() => setActionType('markIdle')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    actionType === 'markIdle'
                      ? 'bg-slate-700 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4 text-slate-400" /> Mark Idle
                </button>
              </div>

              {/* SUB-ACTION 1: ADD TO JOB FORM */}
              {actionType === 'addToJob' && (
                <div className="p-4 bg-slate-900 rounded-xl border border-blue-500/40 space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 block">
                      Select Active Job (Address only):
                    </label>
                    <select
                      value={selectedJobIdForAdd}
                      onChange={(e) => setSelectedJobIdForAdd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose Job Address --</option>
                      {activeJobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedJobIdForAdd && (
                    <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-lg space-y-2">
                      <p className="text-xs text-blue-200">
                        Confirm assigning <strong>{selectedWorker.name}</strong> to job at <strong>{jobs.find(j => j.id === selectedJobIdForAdd)?.address}</strong>?
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setActionType('none');
                            setSelectedJobIdForAdd('');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmAddToJob}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg shadow"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ACTION 2: REMOVE FROM JOB FORM */}
              {actionType === 'removeFromJob' && (
                <div className="p-4 bg-slate-900 rounded-xl border border-amber-500/40 space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 block">
                      Select Job to remove employee from:
                    </label>
                    {jobs.filter(j => j.assignedWorkers.includes(selectedWorker.id)).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">This employee is not currently assigned to any active jobs.</p>
                    ) : (
                      <select
                        value={selectedJobIdForRemove}
                        onChange={(e) => setSelectedJobIdForRemove(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- Choose Assigned Job Address --</option>
                        {jobs.filter(j => j.assignedWorkers.includes(selectedWorker.id)).map(j => (
                          <option key={j.id} value={j.id}>
                            {j.address}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedJobIdForRemove && (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-lg space-y-2">
                      <p className="text-xs text-amber-200">
                        Are you sure you want to remove <strong>{selectedWorker.name}</strong> from this job?
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setActionType('none');
                            setSelectedJobIdForRemove('');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-lg"
                        >
                          No
                        </button>
                        <button
                          onClick={handleConfirmRemoveFromJob}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white rounded-lg shadow"
                        >
                          Yes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ACTION 3: MARK IDLE CONFIRMATION */}
              {actionType === 'markIdle' && (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 space-y-3 animate-fade-in">
                  <p className="text-xs text-slate-200">
                    Manually mark <strong>{selectedWorker.name}</strong> as Idle? They will be removed from currently assigned jobs but will remain on the company roster for future assignments.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setActionType('none')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmMarkIdle}
                      className="px-4 py-1.5 bg-slate-700 hover:bg-slate-650 text-xs font-bold text-white rounded-lg shadow"
                    >
                      Confirm Idle
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-ACTION 4: REMOVE EMPLOYEE COMPLETELY (DESTRUCTIVE RED BUTTON) */}
              {isCompanyOwner && (
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">Roster Management</span>
                  
                  {actionType !== 'removeEmployee' ? (
                    <button
                      onClick={() => setActionType('removeEmployee')}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-400 hover:text-red-300 border border-red-800/60 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Employee
                    </button>
                  ) : (
                    <div className="w-full p-4 bg-red-950/80 border-2 border-red-600 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-red-200">
                            Are you sure you want to remove this employee?
                          </h5>
                          <p className="text-[11px] text-red-300/90 leading-relaxed">
                            Removing this employee will permanently remove them from your company's employee roster. They will lose access to company jobs and will need to be invited again if you want them to return.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => setActionType('none')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmRemoveEmployee}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-xs font-black text-white rounded-lg shadow-md"
                        >
                          Remove Employee
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })()}

          {/* SECTION 3: ADD / INVITE EMPLOYEE OR MANAGER */}
          {isCompanyOwner ? (
            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono">
                    3. Add Employee / Manager Invitation
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Send a company onboarding invite. Company specifies the job role (employees cannot self-assign roles).
                  </p>
                </div>
              </div>

              {inviteSuccessMessage && (
                <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  {inviteSuccessMessage}
                </div>
              )}

              <form onSubmit={handleSendInviteSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Account Type</label>
                    <select
                      value={inviteRole}
                      onChange={(e: any) => setInviteRole(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="employee">Employee (Field Crew)</option>
                      <option value="manager">Manager (Operational Admin)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-400 uppercase font-mono flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Job Role (Required)
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteJobRole}
                      onChange={(e) => setInviteJobRole(e.target.value)}
                      placeholder="e.g. Lead Carpenter, Plumber"
                      className="w-full bg-slate-900 border border-blue-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Email Address</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="e.g. teammate@company.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-blue-950/30 rounded-xl border border-blue-900/40 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-blue-300">
                    <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                      <strong>Company-Managed Roles:</strong> The assigned Job Role cannot be changed by the employee; only the company can update it.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-black text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Invitation Link
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
              <Shield className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-200 block">Restricted Permission: Company Accounts Only</span>
                <span>Only Company accounts can invite employees, create employee accounts, remove employees, or assign Job Roles.</span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
