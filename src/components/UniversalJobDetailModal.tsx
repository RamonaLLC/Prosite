import React, { useState } from 'react';
import { Job, Role, WorkerProfile, JobDisputeRecord } from '../types';
import { 
  X, MapPin, Calendar, DollarSign, Users, CheckSquare, 
  Clock, ShieldAlert, CheckCircle, AlertTriangle, MessageSquare, 
  Camera, Briefcase, FileText, ArrowRight, EyeOff, Send, 
  Sparkles, Check, Phone, ShieldCheck
} from 'lucide-react';
import { formatMDY, renderColoredJobDate } from '../utils/dateFormatter';

interface UniversalJobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  userRole: Role;
  workers: WorkerProfile[];
  onOpenConfirmPayment?: (job: Job) => void;
  onOpenDispute?: (job: Job) => void;
  onOpenCompanyDisputeResponse?: (job: Job, dispute: JobDisputeRecord) => void;
  onOpenMessage?: (jobId: string, recipientName: string) => void;
  onToggleChecklistItem?: (jobId: string, taskId: string) => void;
  onConvertInspectionToActiveJob?: (jobId: string) => void;
  onOpenInspectionWorkspace?: (job: Job) => void;
  onUpdateJobs?: (updated: Job[]) => void;
  onSendNotification?: (title: string, message: string, type: any, jobId?: string) => void;
}

export const UniversalJobDetailModal: React.FC<UniversalJobDetailModalProps> = ({
  isOpen,
  onClose,
  job,
  userRole,
  workers,
  onOpenConfirmPayment,
  onOpenDispute,
  onOpenCompanyDisputeResponse,
  onOpenMessage,
  onToggleChecklistItem,
  onConvertInspectionToActiveJob,
  onOpenInspectionWorkspace,
  onUpdateJobs,
  onSendNotification
}) => {
  if (!isOpen || !job) return null;

  // Open Job Counter Offer State
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterPrice, setCounterPrice] = useState(String(job.jobValue || job.offeredPrice || 2500));
  const [counterComments, setCounterComments] = useState('');
  const [customerAcceptedSuccess, setCustomerAcceptedSuccess] = useState(false);

  // New checklist task & worker assign state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Promote Job $5 state
  const [isPromoting, setIsPromoting] = useState(false);

  const assignedWorkerProfiles = workers.filter(w => (job.assignedWorkers || []).includes(w.id));
  const completedTasks = (job.checklist || []).filter(t => t.status === 'completed').length;
  const totalTasks = (job.checklist || []).length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleStatusChange = (newStatus: 'not-started' | 'in-progress' | 'completed' | 'planning') => {
    const updatedJob: Job = {
      ...job,
      status: newStatus as any,
      history: [
        ...(job.history || []),
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: `Status Changed to ${newStatus.toUpperCase()}`,
          actor: userRole,
          details: `Job status updated to ${newStatus}`
        }
      ]
    };
    if (onUpdateJobs) onUpdateJobs([updatedJob]);
    if (onSendNotification) {
      onSendNotification(
        'Job Status Updated',
        `Job "${job.title}" status changed to ${newStatus.toUpperCase()}`,
        'job',
        job.id
      );
    }
  };

  const handleAddChecklistTask = () => {
    if (!newChecklistTitle.trim()) return;
    const newTask = {
      id: `task-${Date.now()}`,
      title: newChecklistTitle.trim(),
      status: 'pending' as const
    };
    const updatedJob: Job = {
      ...job,
      checklist: [...(job.checklist || []), newTask]
    };
    if (onUpdateJobs) onUpdateJobs([updatedJob]);
    setNewChecklistTitle('');
  };

  const handleToggleWorkerAssignment = (workerId: string) => {
    const isAssigned = (job.assignedWorkers || []).includes(workerId);
    const updatedWorkers = isAssigned
      ? (job.assignedWorkers || []).filter(id => id !== workerId)
      : [...(job.assignedWorkers || []), workerId];
    const updatedJob: Job = {
      ...job,
      assignedWorkers: updatedWorkers
    };
    if (onUpdateJobs) onUpdateJobs([updatedJob]);
  };

  // Privacy Rule: For Open Jobs prior to acceptance, hide exact street address from companies
  const isOpenJobUnaccepted = (job.isOpenJob || job.status === 'open-bid' || job.status === 'bidding') && !job.acceptedOfferCompanyId;
  const isCompanyViewingUnaccepted = (userRole === 'company' || userRole === 'manager' || userRole === 'worker' || userRole === 'employee') && isOpenJobUnaccepted;

  const displayAddress = isCompanyViewingUnaccepted 
    ? `[Exact Address Hidden Until Accepted] • ${job.address.split(',').slice(-2).join(',').trim() || 'Local Service Area'}`
    : job.address;

  // Status Badge styling: RED = NOT STARTED, ORANGE = ACTIVE, GREEN = COMPLETED
  const getStatusBadge = () => {
    if (job.status === 'completed') {
      return (
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-400" /> COMPLETED (GREEN)
        </span>
      );
    }
    if (job.status === 'in-progress' || (job.status as string) === 'active') {
      return (
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-400" /> ACTIVE (ORANGE)
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-rose-400" /> NOT STARTED (RED)
      </span>
    );
  };

  // Company Accepts Open Job
  const handleCompanyAcceptOpenJob = () => {
    const updatedJob: Job = {
      ...job,
      status: 'not-started', // Remains NOT STARTED until geofence arrival!
      isOpenJob: false,
      acceptedOfferCompanyId: 'current-company',
      companyName: job.companyName || 'ABC Construction HQ',
      history: [
        ...(job.history || []),
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Open Job Accepted by Company',
          actor: 'Company',
          details: 'Company accepted open job. Exact address revealed. Job status is NOT STARTED until geofence arrival is confirmed.'
        }
      ]
    };

    if (onUpdateJobs) onUpdateJobs([updatedJob]);
    if (onSendNotification) {
      onSendNotification(
        'Open Job Accepted!',
        `Thank you. Your job has been accepted by the company. The company will contact you prior to the scheduled job start date to confirm the information.`,
        'job',
        job.id
      );
    }
    setCustomerAcceptedSuccess(true);
  };

  // Company Submits Counter Offer
  const handleCompanySubmitCounterOffer = () => {
    const priceNum = parseFloat(counterPrice) || 0;
    const updatedBids = [
      ...(job.bids || []),
      {
        id: `counter-${Date.now()}`,
        companyId: 'company-current',
        companyName: job.companyName || 'ABC Construction HQ',
        price: priceNum,
        amount: priceNum,
        message: counterComments.trim() || 'Counter offer submitted with revised project estimate.',
        status: 'pending'
      }
    ];

    const updatedJob: Job = {
      ...job,
      bids: updatedBids,
      history: [
        ...(job.history || []),
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Counter Offer Submitted',
          actor: 'Company',
          details: `Company proposed counter offer of $${priceNum.toLocaleString()}: "${counterComments}"`
        }
      ]
    };

    if (onUpdateJobs) onUpdateJobs([updatedJob]);
    if (onSendNotification) {
      onSendNotification(
        'New Counter Offer Received',
        `Company submitted counter offer of $${priceNum.toLocaleString()} for ${job.title}. Please review and confirm or deny.`,
        'bid',
        job.id
      );
    }
    setShowCounterForm(false);
    onClose();
  };

  // Company Purchases $5 Promote Job
  const handlePromoteJob = () => {
    setIsPromoting(true);
    setTimeout(() => {
      const updatedJob: Job = {
        ...job,
        isPromoted: true
      };
      if (onUpdateJobs) onUpdateJobs([updatedJob]);
      if (onSendNotification) {
        onSendNotification(
          'Job Promoted ($5 Fee Applied)',
          `$5 Promote fee charged. You now have priority early access to newly posted Open Jobs during the 2-hour window.`,
          'system',
          job.id
        );
      }
      setIsPromoting(false);
    }, 600);
  };

  // Simulate Geofence Arrival to turn job ACTIVE
  const handleSimulateGeofenceArrival = () => {
    const updatedJob: Job = {
      ...job,
      status: 'in-progress', // ACTIVE
      isActualStarted: true,
      actualStartedAt: new Date().toISOString(),
      history: [
        ...(job.history || []),
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Geofence Arrival Confirmed — Job Active',
          actor: 'GPS Geofence',
          details: 'Employee arrival confirmed on-site via geofence. Job status changed to ACTIVE (ORANGE). Dispatch and job-site hours started.'
        }
      ]
    };

    if (onUpdateJobs) onUpdateJobs([updatedJob]);
    if (onSendNotification) {
      onSendNotification(
        'Crew Arrived On Site! 📍',
        `Employee GPS confirmed arrival at ${job.address}. Job is now ACTIVE.`,
        'check-in',
        job.id
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      {/* Mobile-first, scrollable vertically, non-white dark card */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-3 shrink-0">
          <div className="space-y-1.5 max-w-[85%]">
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge()}

              {job.paymentStatus === 'Disputed / Funds Held' && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Disputed / Funds Held
                </span>
              )}

              {job.inspectionStatus && (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Inspection: {job.inspectionStatus}
                </span>
              )}

              {job.isPromoted && (userRole === 'company' || userRole === 'manager') && (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Promoted ($5 Early Access)
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-black text-white leading-tight">
              {job.title}
            </h2>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{displayAddress}</span>
              {isCompanyViewingUnaccepted && (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                  <EyeOff className="w-3 h-3" /> Address Protected
                </span>
              )}
            </div>

            {/* Status changer for Company / Manager */}
            {(userRole === 'company' || userRole === 'manager') && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Status:</span>
                <select
                  value={job.status === 'in-progress' || (job.status as string) === 'active' ? 'in-progress' : job.status === 'completed' ? 'completed' : 'not-started'}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  className="bg-slate-950 text-xs border border-slate-700 rounded-lg px-2 py-1 text-white font-bold outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="not-started">RED: NOT STARTED</option>
                  <option value="in-progress">ORANGE: ACTIVE</option>
                  <option value="completed">GREEN: COMPLETED</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-300">
          
          {/* Key Metrics Banner (No white backgrounds) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Project Value</span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                ${(job.jobValue || job.offeredPrice || 18500).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Start Date</span>
              <div>
                {renderColoredJobDate(job.startDate || job.expectedStartDate || '2026-07-01')}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Customer</span>
              <span className="font-bold text-white truncate block">
                {job.clientName}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Company</span>
              <span className="font-bold text-white truncate block">
                {job.companyName || 'ProSite Partner'}
              </span>
            </div>
          </div>

          {/* AGENT ACCEPTED OPEN JOB SUCCESS POPUP BANNER */}
          {customerAcceptedSuccess && (
            <div className="p-4 bg-emerald-950/50 border border-emerald-600 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Job Accepted Successfully!
              </div>
              <p className="text-xs text-slate-200">
                "Thank you. Your job has been accepted by the company. The company will contact you prior to the scheduled job start date to confirm the information."
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                Exact address unlocked: <span className="text-white font-mono">{job.address}</span>. Job status will remain <span className="text-rose-400 font-bold">NOT STARTED</span> until employee arrival at the job site is confirmed.
              </div>
            </div>
          )}

          {/* OPEN JOB ACTION BAR FOR COMPANIES (ACCEPT or COUNTER OFFER) */}
          {isOpenJobUnaccepted && (userRole === 'company' || userRole === 'manager') && !customerAcceptedSuccess && (
            <div className="p-4 bg-slate-950/70 border border-blue-900/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">Open Job Bidding Action</span>
                  <span className="text-[11px] text-slate-400">Agent Offered Price: <strong className="text-emerald-400 font-mono">${(job.offeredPrice || job.jobValue || 2500).toLocaleString()}</strong></span>
                </div>

                {!job.isPromoted && (
                  <button
                    type="button"
                    onClick={handlePromoteJob}
                    disabled={isPromoting}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" /> {isPromoting ? 'Promoting...' : 'Promote Job ($5)'}
                  </button>
                )}
              </div>

              {showCounterForm ? (
                <div className="space-y-2.5 p-3 bg-slate-900 border border-slate-700 rounded-xl">
                  <span className="font-bold text-white text-xs block">Submit Counter Offer</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      value={counterPrice}
                      onChange={e => setCounterPrice(e.target.value)}
                      placeholder="Your counter price"
                      className="w-36 p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                    />
                  </div>
                  <textarea
                    value={counterComments}
                    onChange={e => setCounterComments(e.target.value)}
                    placeholder="Comments regarding materials, scope, or timeline adjustments..."
                    rows={2}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCounterForm(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCompanySubmitCounterOffer}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                    >
                      Submit Counter Offer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCompanyAcceptOpenJob}
                    className="w-full sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Accept Job (${(job.offeredPrice || job.jobValue || 2500).toLocaleString()})
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCounterForm(true)}
                    className="w-full sm:w-auto py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Counter Offer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GEOFENCE ARRIVAL / START WORKFLOW */}
          {job.status === 'not-started' && (userRole === 'worker' || userRole === 'employee' || userRole === 'company' || userRole === 'manager') && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-rose-300 text-xs block flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" /> Job Status: NOT STARTED (RED)
                </span>
                <span className="text-[11px] text-slate-400">
                  The job remains NOT STARTED until employee GPS/geofence arrival is confirmed on site.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSimulateGeofenceArrival}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition whitespace-nowrap shadow-xs cursor-pointer flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Confirm On-Site Arrival
              </button>
            </div>
          )}

          {/* INSPECTION SHORTCUT IF THIS IS AN INSPECTION */}
          {job.inspectionStatus && (
            <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-purple-300 text-xs block">Site Inspection Scheduled</span>
                <span className="text-[11px] text-slate-400">
                  {formatMDY(job.inspectionDate)} at {job.inspectionTime || '10:00 AM'} • Fee ${job.inspectionFee || 150} Paid
                </span>
              </div>
              {onOpenInspectionWorkspace && (
                <div className="flex items-center gap-1.5">
                  {(userRole === 'customer' || userRole === 'client' || userRole === 'agent') ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenInspectionWorkspace(job);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenInspectionWorkspace(job);
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 border border-slate-700"
                      >
                        <FileText className="w-3.5 h-3.5" /> Details
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenInspectionWorkspace(job);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Inspection Workspace
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <span className="font-bold text-white text-xs block">Project Scope & Description</span>
            <p className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-300 text-xs leading-relaxed">
              {job.description || 'Full exterior and interior inspection and remediation per client specifications.'}
            </p>
          </div>

          {/* Checklist / To-Do Tasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                <span>Project Checklist ({completedTasks}/{totalTasks})</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-400">{taskProgress}%</span>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${taskProgress}%` }}
              />
            </div>

            <div className="space-y-1 pt-1">
              {(job.checklist || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No checklist items defined yet.</p>
              ) : (
                job.checklist.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition ${
                      task.status === 'completed'
                        ? 'bg-slate-950/40 border-slate-800 text-slate-500 line-through'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => onToggleChecklistItem && onToggleChecklistItem(job.id, task.id)}
                        disabled={userRole === 'customer' || userRole === 'client' || userRole === 'agent'}
                        className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{task.title}</span>
                    </div>
                    {task.completedByWorkerName && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        by {task.completedByWorkerName}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Checklist Task */}
            {(userRole === 'company' || userRole === 'manager' || userRole === 'worker' || userRole === 'employee') && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklistTask(); }}
                  placeholder="Add a new checklist task..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistTask}
                  disabled={!newChecklistTitle.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            )}
          </div>

          {/* Assigned Crew */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1.5 font-bold text-white text-xs">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Assigned Personnel ({assignedWorkerProfiles.length})</span>
              </div>
              {(userRole === 'company' || userRole === 'manager') && (
                <button
                  type="button"
                  onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-mono underline cursor-pointer"
                >
                  {showAssignDropdown ? 'Hide Crew Selector' : '+ Manage Crew'}
                </button>
              )}
            </div>

            {/* Crew Selector for Company / Manager */}
            {showAssignDropdown && (userRole === 'company' || userRole === 'manager') && (
              <div className="p-2.5 bg-slate-950 rounded-xl border border-blue-500/30 space-y-1.5 animate-in fade-in">
                <p className="text-[10px] text-slate-400 font-mono">Click to toggle employee assignment on this job:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {workers.map(w => {
                    const isAssigned = (job.assignedWorkers || []).includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleToggleWorkerAssignment(w.id)}
                        className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition cursor-pointer ${
                          isAssigned
                            ? 'bg-blue-950/80 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img src={w.avatar} alt={w.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                          <span className="text-xs font-bold truncate">{w.name}</span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ${
                          isAssigned ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500'
                        }`}>
                          {isAssigned ? 'ASSIGNED' : '+ ADD'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {assignedWorkerProfiles.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No workers currently dispatched to this job.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {assignedWorkerProfiles.map(w => (
                  <div key={w.id} className="flex items-center gap-2.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <img src={w.avatar} alt={w.name} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                    <div className="truncate">
                      <span className="font-bold text-white block truncate">{w.name}</span>
                      <span className="text-[10px] text-blue-400 font-medium block truncate">
                        {w.position || w.jobRole || 'Field Specialist'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Before & After Photos Gallery Preview */}
          {job.beforeAfterPhotos && job.beforeAfterPhotos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Job Progress Photos ({job.beforeAfterPhotos.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {job.beforeAfterPhotos.map((photo, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-slate-800 aspect-video bg-slate-950">
                    <img
                      src={photo.afterImage || photo.beforeImage || (photo.afterImages && photo.afterImages[0]) || ''}
                      alt={photo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Job ID: <span className="font-mono text-slate-400">{job.id}</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMessage && (
              <button
                type="button"
                onClick={() => {
                  const isAgentRole = userRole === 'customer' || userRole === 'client' || userRole === 'agent';
                  onOpenMessage(job.id, isAgentRole ? (job.companyName || 'ABC Construction') : job.clientName);
                  onClose();
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
