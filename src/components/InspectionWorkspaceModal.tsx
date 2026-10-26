import React, { useState, useEffect } from 'react';
import { Job, Role, WorkerProfile, InspectionScope, InspectionScopeTask } from '../types';
import { 
  X, Calendar, Clock, DollarSign, User, MapPin, AlertTriangle, 
  CheckCircle, Plus, Trash2, Camera, Upload, Eye, FileText, 
  Phone, Check, ShieldAlert, ArrowRight, RefreshCw, Sparkles, ClipboardCheck
} from 'lucide-react';
import { formatMDY } from '../utils/dateFormatter';
import { isWithin2HoursOfStart, formatTo12Hour, getRescheduleBlockedMessage } from '../utils/schedulingRules';

interface InspectionWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  userRole: Role;
  workers: WorkerProfile[];
  onUpdateJobs: (updated: Job[]) => void;
  onSendNotification: (title: string, message: string, type: any, jobId?: string) => void;
}

export const InspectionWorkspaceModal: React.FC<InspectionWorkspaceModalProps> = ({
  isOpen,
  onClose,
  job,
  userRole,
  workers,
  onUpdateJobs,
  onSendNotification
}) => {
  if (!isOpen || !job) return null;

  const isCustomer = userRole === 'customer' || userRole === 'client' || userRole === 'agent';

  const [activeSubView, setActiveSubView] = useState<'details' | 'issue' | 'workspace' | 'company_review' | 'customer_approval'>(() => {
    if (job.inspectionScope?.status === 'company_approved' && isCustomer) {
      return 'customer_approval';
    }
    if (job.inspectionScope?.status === 'submitted_to_company' && (userRole === 'company' || userRole === 'manager')) {
      return 'company_review';
    }
    return 'details';
  });

  // Issue modal state
  const [issueComment, setIssueComment] = useState('');
  const [issuePhotos, setIssuePhotos] = useState<string[]>([]);
  const [requestReschedule, setRequestReschedule] = useState(false);

  // Reschedule options state (Company providing multiple options)
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleSlots, setRescheduleSlots] = useState<{ id: string; date: string; time: string }[]>([
    { id: '1', date: '2026-09-10', time: '09:00 AM' },
    { id: '2', date: '2026-09-11', time: '01:00 PM' }
  ]);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('10:00 AM');

  // Customer Reschedule State
  const [showCustomerReschedule, setShowCustomerReschedule] = useState(false);
  const [currentDate, setCurrentDate] = useState(job.inspectionDate || '');
  const [currentTime, setCurrentTime] = useState(job.inspectionTime || '10:00 AM');
  const [customerNewDate, setCustomerNewDate] = useState(() => {
    if (job.inspectionDate) return job.inspectionDate;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [customerNewTime, setCustomerNewTime] = useState(job.inspectionTime || '10:00 AM');
  const [customerRescheduleReason, setCustomerRescheduleReason] = useState('');
  const [rescheduleNotice, setRescheduleNotice] = useState<{ type: 'error' | 'success' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    setCurrentDate(job.inspectionDate || '');
    setCurrentTime(job.inspectionTime || '10:00 AM');
    if (job.inspectionDate) setCustomerNewDate(job.inspectionDate);
    if (job.inspectionTime) setCustomerNewTime(job.inspectionTime);
  }, [job.inspectionDate, job.inspectionTime]);

  // Inspector Task Builder State
  const initialTasks: InspectionScopeTask[] = job.inspectionScope?.tasks || [
    {
      id: 'task-1',
      description: 'Roof Structural Assessment',
      comment: 'Inspect shingles, flashing, and gutter attachments for moisture penetration.',
      photos: ['https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=400&q=80'],
      cost: 1200
    },
    {
      id: 'task-2',
      description: 'Subfloor Moisture & Water Damage',
      comment: 'Detected elevated humidity in master bath floor joists.',
      photos: [],
      cost: 850
    }
  ];

  const [tasks, setTasks] = useState<InspectionScopeTask[]>(initialTasks);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskComment, setNewTaskComment] = useState('');
  const [newTaskCost, setNewTaskCost] = useState('');
  const [newTaskPhotos, setNewTaskPhotos] = useState<string[]>([]);

  // Company revision state
  const [revisionNotes, setRevisionNotes] = useState('');

  // Customer reject confirmation modal state
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const runningTotalCost = tasks.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);
  const assignedWorker = workers.find(w => (job.assignedWorkers || []).includes(w.id));

  // 1. Inspector adds a task
  const handleAddTask = () => {
    if (!newTaskDesc.trim()) return;
    const costNum = parseFloat(newTaskCost) || 0;
    const item: InspectionScopeTask = {
      id: `task-${Date.now()}`,
      description: newTaskDesc.trim(),
      comment: newTaskComment.trim(),
      photos: newTaskPhotos.length > 0 ? [...newTaskPhotos] : ['https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=80'],
      cost: costNum
    };
    setTasks(prev => [...prev, item]);
    setNewTaskDesc('');
    setNewTaskComment('');
    setNewTaskCost('');
    setNewTaskPhotos([]);
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleUpdateTaskCost = (taskId: string, cost: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, cost } : t));
  };

  const handleUpdateTaskComment = (taskId: string, comment: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comment } : t));
  };

  // 2. Inspector submits scope -> goes to COMPANY REVIEW first
  const handleSubmitScopeToCompany = () => {
    const scopeData: InspectionScope = {
      id: `scope-${Date.now()}`,
      jobId: job.id,
      submittedByWorkerId: assignedWorker?.id || 'inspector-1',
      submittedByWorkerName: assignedWorker?.name || 'Assigned Inspector',
      submittedAt: new Date().toISOString(),
      tasks,
      totalCost: runningTotalCost,
      status: 'submitted_to_company'
    };

    const updatedJob: Job = {
      ...job,
      inspectionScope: scopeData,
      inspectionStatus: 'completed'
    };

    onUpdateJobs([updatedJob]);
    onSendNotification(
      'Inspection Scope Submitted for Company Review',
      `Inspector submitted scope with ${tasks.length} tasks ($${runningTotalCost.toLocaleString()} total) for ${job.address}. Review and approve or revise before sending to customer.`,
      'inspection',
      job.id
    );
    onClose();
  };

  // 3. Company approves scope -> sends to CUSTOMER
  const handleCompanyConfirmScope = () => {
    if (!job.inspectionScope) return;
    const updatedScope: InspectionScope = {
      ...job.inspectionScope,
      tasks,
      totalCost: runningTotalCost,
      status: 'company_approved',
      companyReviewedAt: new Date().toISOString(),
      companyReviewedBy: 'Company Management'
    };

    const updatedJob: Job = {
      ...job,
      inspectionScope: updatedScope
    };

    onUpdateJobs([updatedJob]);
    onSendNotification(
      'Inspection Scope & Estimate Ready for Customer Approval',
      `Company approved inspection scope ($${runningTotalCost.toLocaleString()}) for ${job.address}. Awaiting customer review and confirmation.`,
      'inspection',
      job.id
    );
    onClose();
  };

  // 4. Company revises scope
  const handleCompanyReviseScope = () => {
    if (!job.inspectionScope) return;
    const newRevision = {
      revisedAt: new Date().toISOString(),
      revisedBy: 'Company Management',
      tasks: [...tasks],
      totalCost: runningTotalCost,
      notes: revisionNotes
    };

    const updatedScope: InspectionScope = {
      ...job.inspectionScope,
      tasks,
      totalCost: runningTotalCost,
      status: 'company_approved',
      companyReviewedAt: new Date().toISOString(),
      companyReviewedBy: 'Company Management (Revised)',
      companyRevisions: [...(job.inspectionScope.companyRevisions || []), newRevision]
    };

    const updatedJob: Job = {
      ...job,
      inspectionScope: updatedScope
    };

    onUpdateJobs([updatedJob]);
    onSendNotification(
      'Revised Inspection Scope Sent to Customer',
      `Company revised scope tasks ($${runningTotalCost.toLocaleString()}) for ${job.address}. Sent to customer for final approval.`,
      'inspection',
      job.id
    );
    onClose();
  };

  // 5. Customer Approves Scope -> creates ACTIVE JOB
  const handleCustomerConfirmScope = () => {
    const fee = job.inspectionFee || 150;
    const total = job.inspectionScope?.totalCost || runningTotalCost;
    const netTotal = Math.max(0, total - fee);

    const updatedJob: Job = {
      ...job,
      status: 'not-started', // Remains NOT STARTED until employee GPS arrival!
      inspectionStatus: 'completed',
      inspectionFeePaid: true,
      inspectionFeeDeducted: true,
      inspectionFeeStatus: `Paid ($${fee}) — Deducted from Active Job Total`,
      jobValue: netTotal,
      originalJobValue: total,
      checklist: (job.inspectionScope?.tasks || tasks).map(t => ({
        id: `chk-${t.id}`,
        title: `${t.description} ($${t.cost.toLocaleString()})`,
        status: 'pending'
      })),
      inspectionScope: job.inspectionScope ? {
        ...job.inspectionScope,
        status: 'customer_approved',
        customerDecisionAt: new Date().toISOString()
      } : undefined,
      history: [
        ...(job.history || []),
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Scope Approved — Converted to Job',
          actor: 'Customer',
          details: `Customer approved scope total $${total.toLocaleString()}. $${fee} inspection fee deducted ($${netTotal.toLocaleString()} net). Job status: NOT STARTED (Awaiting geofence arrival).`
        }
      ]
    };

    onUpdateJobs([updatedJob]);
    onSendNotification(
      'Customer Confirmed Job Scope! 🏗️',
      `Customer approved inspection estimate ($${total.toLocaleString()}) for ${job.address}. Job is ready for employee assignment. Will become ACTIVE upon geofence arrival.`,
      'job',
      job.id
    );
    onClose();
  };

  // 6. Customer Rejects Scope -> cancels job in full
  const handleCustomerRejectScope = () => {
    const updatedJob: Job = {
      ...job,
      status: 'cancelled',
      inspectionStatus: 'cancelled',
      inspectionScope: job.inspectionScope ? {
        ...job.inspectionScope,
        status: 'customer_rejected',
        customerDecisionAt: new Date().toISOString(),
        rejectionReason: 'Customer rejected estimated job scope and cost.'
      } : undefined,
      history: [
        ...(job.history || []),
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Scope Rejected — Job Cancelled',
          actor: 'Customer',
          details: 'Customer rejected inspection scope and estimate. A new inspection is required to continue.'
        }
      ]
    };

    onUpdateJobs([updatedJob]);
    onSendNotification(
      'Inspection Scope Rejected by Customer',
      `Customer declined scope for ${job.address}. Job cancelled in full. A new inspection is required to continue.`,
      'inspection',
      job.id
    );
    setShowRejectConfirm(false);
    onClose();
  };

  // 7. Submit Issue
  const handleSubmitIssue = () => {
    const updatedJob: Job = {
      ...job,
      inspectionRequest: job.inspectionRequest ? {
        ...job.inspectionRequest,
        status: requestReschedule ? 'rescheduled' : job.inspectionRequest.status,
        issueReported: {
          reportedBy: userRole,
          comment: issueComment,
          photos: issuePhotos,
          reportedAt: new Date().toISOString(),
          type: requestReschedule ? 'reschedule_requested' : 'issue_noted'
        }
      } : undefined
    };

    onUpdateJobs([updatedJob]);
    onSendNotification(
      requestReschedule ? 'Inspection Reschedule Requested' : 'Inspection Issue Reported',
      `Issue noted: "${issueComment}". ${requestReschedule ? 'New date/time confirmation required.' : ''}`,
      'inspection',
      job.id
    );
    onClose();
  };

  // 8. Company sends multiple reschedule options
  const handleSendRescheduleOptions = () => {
    const updatedJob: Job = {
      ...job,
      inspectionRequest: job.inspectionRequest ? {
        ...job.inspectionRequest,
        status: 'rescheduled',
        rescheduleOptions: rescheduleSlots
      } : undefined
    };

    onUpdateJobs([updatedJob]);
    onSendNotification(
      'Inspection Reschedule Options Provided',
      `Company provided ${rescheduleSlots.length} date/time options for ${job.address}. Customer can select and confirm or request contact.`,
      'inspection',
      job.id
    );
    setShowRescheduleForm(false);
    onClose();
  };

  // 9. Customer chooses slot or requests contact
  const handleCustomerConfirmSlot = (slot: { date: string; time: string }) => {
    const formattedTime = formatTo12Hour(slot.time);
    const updatedJob: Job = {
      ...job,
      inspectionDate: slot.date,
      inspectionTime: formattedTime,
      inspectionStatus: 'scheduled',
      inspectionRequest: job.inspectionRequest ? {
        ...job.inspectionRequest,
        requestedDate: slot.date,
        requestedTime: formattedTime,
        status: 'confirmed',
        rescheduleOptions: undefined
      } : undefined,
      history: [
        ...(job.history || []),
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Inspection Rescheduled (Slot Confirmed)',
          actor: job.clientName || 'Customer',
          details: `Confirmed suggested slot for ${formatMDY(slot.date)} at ${formattedTime}.`
        }
      ]
    };

    onUpdateJobs([updatedJob]);
    setCurrentDate(slot.date);
    setCurrentTime(formattedTime);
    setRescheduleNotice({
      type: 'success',
      message: `Inspection confirmed for ${formatMDY(slot.date)} at ${formattedTime}.`
    });
    onSendNotification(
      'Inspection Rescheduled & Confirmed',
      `Customer confirmed inspection on ${formatMDY(slot.date)} at ${formattedTime} for ${job.address}. Added to calendars.`,
      'inspection',
      job.id
    );
  };

  // 10. Customer custom reschedule submission with 2-hour cutoff enforcement
  const handleCustomerRescheduleSubmit = () => {
    setRescheduleNotice(null);

    // Enforce 2-Hour Rescheduling Cutoff Rule
    if (isWithin2HoursOfStart(currentDate, currentTime)) {
      setRescheduleNotice({
        type: 'error',
        message: getRescheduleBlockedMessage(job.companyName || 'the contractor')
      });
      return;
    }

    if (!customerNewDate) {
      setRescheduleNotice({
        type: 'error',
        message: 'Please pick a new date for your inspection.'
      });
      return;
    }

    const formattedTime = formatTo12Hour(customerNewTime);

    const updatedJob: Job = {
      ...job,
      inspectionDate: customerNewDate,
      inspectionTime: formattedTime,
      inspectionStatus: 'scheduled',
      inspectionRequest: job.inspectionRequest ? {
        ...job.inspectionRequest,
        requestedDate: customerNewDate,
        requestedTime: formattedTime,
        status: 'rescheduled',
        rescheduleOptions: undefined,
        issueReported: undefined
      } : {
        id: `insp-req-${Date.now()}`,
        jobId: job.id,
        customerName: job.clientName || 'Customer',
        customerEmail: job.clientEmail || '',
        customerPhone: job.clientPhone || '',
        propertyAddress: job.address,
        requestedDate: customerNewDate,
        requestedTime: formattedTime,
        inspectionFee: job.inspectionFee || 150,
        feePaid: true,
        status: 'rescheduled'
      },
      history: [
        ...(job.history || []),
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Inspection Rescheduled by Customer',
          actor: job.clientName || 'Customer',
          details: `Inspection rescheduled to ${formatMDY(customerNewDate)} at ${formattedTime}.${customerRescheduleReason.trim() ? ` Reason: "${customerRescheduleReason.trim()}"` : ''}`
        }
      ]
    };

    onUpdateJobs([updatedJob]);
    setCurrentDate(customerNewDate);
    setCurrentTime(formattedTime);
    setShowCustomerReschedule(false);

    onSendNotification(
      'Inspection Rescheduled by Customer',
      `${job.clientName || 'Customer'} rescheduled the inspection for ${job.address} to ${formatMDY(customerNewDate)} at ${formattedTime}.${customerRescheduleReason.trim() ? ` Reason: "${customerRescheduleReason.trim()}"` : ''}`,
      'inspection',
      job.id
    );

    setRescheduleNotice({
      type: 'success',
      message: `Inspection successfully rescheduled to ${formatMDY(customerNewDate)} at ${formattedTime}. Your contractor has been notified.`
    });
  };

  const handleCustomerRequestContact = () => {
    const updatedJob: Job = {
      ...job,
      inspectionRequest: job.inspectionRequest ? {
        ...job.inspectionRequest,
        contactRequested: true
      } : undefined
    };

    onUpdateJobs([updatedJob]);
    onSendNotification(
      'Customer Requested Phone Contact for Inspection',
      `Customer for ${job.address} requested a call (${job.clientPhone || 'Contact details provided'}) before confirming inspection schedule.`,
      'inspection',
      job.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Inspection Workflow
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Fee: ${job.inspectionFee || 150} Paid
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white leading-tight">
              {job.title}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{job.address}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs if relevant */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubView('details')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              activeSubView === 'details' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Inspection Details
          </button>
          
          {(userRole === 'worker' || userRole === 'employee' || userRole === 'company' || userRole === 'manager') && (
            <button
              type="button"
              onClick={() => setActiveSubView('workspace')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeSubView === 'workspace' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Scope Workspace ({tasks.length})
            </button>
          )}

          {(userRole === 'company' || userRole === 'manager') && job.inspectionScope?.status === 'submitted_to_company' && (
            <button
              type="button"
              onClick={() => setActiveSubView('company_review')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeSubView === 'company_review' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Company Review Required
            </button>
          )}

          {(userRole === 'customer' || userRole === 'client') && job.inspectionScope?.status === 'company_approved' && (
            <button
              type="button"
              onClick={() => setActiveSubView('customer_approval')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeSubView === 'customer_approval' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Customer Scope Approval
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          
          {/* SUBVIEW 1: DETAILS */}
          {activeSubView === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Agent</span>
                  <span className="font-bold text-white block truncate">{job.clientName}</span>
                  {job.inspectionRequest?.contactRequested && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="w-3 h-3" /> Call Requested
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Date & Time</span>
                  <span className="font-mono text-white block">
                    {formatMDY(currentDate || job.inspectionDate)} • {formatTo12Hour(currentTime || job.inspectionTime || '10:00 AM')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Company</span>
                  <span className="font-bold text-white block truncate">{job.companyName || 'ProSite Partner'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Assigned Inspector</span>
                  <span className="font-bold text-purple-400 block truncate">
                    {assignedWorker?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Multiple Reschedule Options Banner if available */}
              {job.inspectionRequest?.rescheduleOptions && job.inspectionRequest.rescheduleOptions.length > 0 && (
                <div className="p-3.5 bg-amber-950/30 border border-amber-600/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" /> Reschedule Options Available
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-2 py-0.5 rounded">Action Required</span>
                  </div>
                  <p className="text-slate-300">
                    The company proposed the following alternative inspection slots:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {job.inspectionRequest.rescheduleOptions.map((opt) => (
                      <div key={opt.id} className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-white block">{formatMDY(opt.date)}</span>
                          <span className="text-slate-400 text-[11px] font-mono">{opt.time}</span>
                        </div>
                        {(userRole === 'customer' || userRole === 'client') && (
                          <button
                            type="button"
                            onClick={() => handleCustomerConfirmSlot(opt)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(userRole === 'customer' || userRole === 'client') && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCustomerRequestContact}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-400" /> Request Contact Instead
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons: START INSPECTION & ISSUE (Only for Inspectors / Company / Managers - REMOVED for Customer accounts) */}
              {!isCustomer && (
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-300">Inspector & Scheduling Actions</div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveSubView('workspace')}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" /> Start Inspection
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSubView('issue')}
                      className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-700/50 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-400" /> Issue
                    </button>

                    {(userRole === 'company' || userRole === 'manager') && (
                      <button
                        type="button"
                        onClick={() => setShowRescheduleForm(prev => !prev)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition border border-slate-700 cursor-pointer"
                      >
                        Provide Reschedule Options
                      </button>
                    )}
                  </div>

                  {/* Company Multi-slot Reschedule Form */}
                  {showRescheduleForm && (
                    <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-3 mt-3">
                      <span className="font-bold text-slate-200 block">Offer Reschedule Slots to Customer</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={newSlotDate}
                          onChange={e => setNewSlotDate(e.target.value)}
                          className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                        />
                        <input
                          type="text"
                          value={newSlotTime}
                          onChange={e => setNewSlotTime(e.target.value)}
                          placeholder="e.g. 10:00 AM"
                          className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs w-28"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newSlotDate) return;
                            setRescheduleSlots(prev => [...prev, { id: String(Date.now()), date: newSlotDate, time: newSlotTime }]);
                            setNewSlotDate('');
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          + Add Slot
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {rescheduleSlots.map(s => (
                          <div key={s.id} className="flex items-center justify-between text-xs p-1.5 bg-slate-950 rounded border border-slate-800">
                            <span className="font-mono text-slate-300">{formatMDY(s.date)} at {s.time}</span>
                            <button
                              type="button"
                              onClick={() => setRescheduleSlots(prev => prev.filter(x => x.id !== s.id))}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleSendRescheduleOptions}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Send {rescheduleSlots.length} Reschedule Options to Customer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Customer View: Actions & Rescheduling (Replaces Start Inspection for Customer accounts) */}
              {isCustomer && (
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3.5">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-purple-400" /> Inspection Status & Schedule
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-bold">
                      {job.inspectionScope?.status === 'company_approved'
                        ? 'Scope Ready for Review'
                        : job.inspectionScope?.status === 'submitted_to_company'
                        ? 'Pending Company Review'
                        : 'Inspection Scheduled'}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    {job.inspectionScope?.status === 'company_approved' ? (
                      <span className="text-emerald-300 font-medium">
                        The property inspection was completed and approved by {job.companyName || 'the contractor'}. The final scope of work and estimate are ready for your review.
                      </span>
                    ) : job.inspectionScope?.status === 'submitted_to_company' ? (
                      <span className="text-amber-300 font-medium">
                        The assigned inspector has completed the on-site assessment. The company is currently reviewing the scope and finalizing the estimate.
                      </span>
                    ) : (
                      <span>
                        Your inspection is booked for <strong>{formatMDY(currentDate || job.inspectionDate)} at {formatTo12Hour(currentTime || job.inspectionTime || '10:00 AM')}</strong>. A certified inspector from <strong>{job.companyName || 'the contractor team'}</strong> will perform the on-site assessment.
                      </span>
                    )}
                  </p>

                  {/* Customer Actions: Replaces Start Inspection with Reschedule Inspection */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      id="customer-reschedule-inspection-btn"
                      onClick={() => {
                        setRescheduleNotice(null);
                        const isCutoff = isWithin2HoursOfStart(currentDate, currentTime);
                        if (isCutoff) {
                          setRescheduleNotice({
                            type: 'error',
                            message: getRescheduleBlockedMessage(job.companyName || 'the contractor')
                          });
                          setShowCustomerReschedule(true);
                        } else {
                          setShowCustomerReschedule(prev => !prev);
                        }
                      }}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" /> {showCustomerReschedule ? 'Cancel Reschedule' : 'Reschedule Inspection'}
                    </button>

                    {job.inspectionScope?.status === 'company_approved' && (
                      <button
                        type="button"
                        onClick={() => setActiveSubView('customer_approval')}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" /> Review Final Scope & Cost
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCustomerRequestContact}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-400" /> Request Contractor Call
                    </button>
                  </div>

                  {/* Reschedule Notifications Banner */}
                  {rescheduleNotice && (
                    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      rescheduleNotice.type === 'error'
                        ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                        : rescheduleNotice.type === 'warning'
                        ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                        : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                    }`}>
                      {rescheduleNotice.type === 'error' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      ) : rescheduleNotice.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold leading-relaxed">{rescheduleNotice.message}</p>
                        {rescheduleNotice.type === 'error' && (
                          <div className="pt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCustomerRequestContact}
                              className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-white font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Phone className="w-3 h-3" /> Request Urgent Contractor Contact
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Customer Reschedule Interactive Form */}
                  {showCustomerReschedule && (
                    <div className="p-3.5 bg-slate-900 border border-slate-700 rounded-xl space-y-3.5 mt-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" /> Select New Inspection Date & Time
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Currently: {formatMDY(currentDate)} at {formatTo12Hour(currentTime)}
                        </span>
                      </div>

                      {/* Date & Time Selectors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                            New Inspection Date
                          </label>
                          <input
                            type="date"
                            value={customerNewDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setCustomerNewDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                            New Start Time (8:00 AM – 5:00 PM)
                          </label>
                          <input
                            type="text"
                            value={customerNewTime}
                            onChange={e => setCustomerNewTime(e.target.value)}
                            placeholder="e.g. 10:00 AM"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Quick Standard 12-Hour Time Slots */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1.5 font-medium">
                          Quick Select Standard Time Slots:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'].map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setCustomerNewTime(slot)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer ${
                                customerNewTime === slot
                                  ? 'bg-blue-600 text-white shadow'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Contractor Provided Reschedule Slots If Available */}
                      {job.inspectionRequest?.rescheduleOptions && job.inspectionRequest.rescheduleOptions.length > 0 && (
                        <div className="p-2.5 bg-purple-950/30 border border-purple-800/40 rounded-lg space-y-2">
                          <span className="text-[11px] font-bold text-purple-300 block">
                            Contractor Suggested Slots (One-Click Select):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {job.inspectionRequest.rescheduleOptions.map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setCustomerNewDate(opt.date);
                                  setCustomerNewTime(formatTo12Hour(opt.time));
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-purple-900/60 text-slate-200 border border-slate-700 rounded text-[11px] font-mono font-semibold cursor-pointer"
                              >
                                {formatMDY(opt.date)} at {formatTo12Hour(opt.time)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Optional Notes */}
                      <div>
                        <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                          Reason for Rescheduling / Access Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={customerRescheduleReason}
                          onChange={e => setCustomerRescheduleReason(e.target.value)}
                          placeholder="e.g. Gate code updated, conflict with morning schedule..."
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Form Actions */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomerReschedule(false);
                            setRescheduleNotice(null);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCustomerRescheduleSubmit}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirm Reschedule
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SUBVIEW 2: ISSUE MODAL (Inspector Only) */}
          {activeSubView === 'issue' && !isCustomer && (
            <div className="space-y-4 p-4 bg-slate-950/60 rounded-xl border border-rose-900/40">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" /> Report Inspection Issue
              </div>
              <p className="text-slate-300 text-xs">
                Log an on-site issue, gate access problem, hazard, or request an inspection reschedule.
              </p>

              <div>
                <label className="block text-slate-400 text-[11px] font-bold uppercase mb-1">Comment</label>
                <textarea
                  value={issueComment}
                  onChange={e => setIssueComment(e.target.value)}
                  placeholder="Describe the issue encountered at the property..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reqResched"
                  checked={requestReschedule}
                  onChange={e => setRequestReschedule(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-rose-600 cursor-pointer"
                />
                <label htmlFor="reqResched" className="text-xs text-slate-200 cursor-pointer font-bold">
                  Request Reschedule (Restarts date/time confirmation, keeps under Inspections)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSubView('details')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitIssue}
                  disabled={!issueComment.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Submit Issue
                </button>
              </div>
            </div>
          )}

          {/* SUBVIEW 3: INSPECTION WORKSPACE (TASK BUILDER & ESTIMATE - Inspector / Company Only) */}
          {activeSubView === 'workspace' && !isCustomer && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">Inspection Scope Builder</span>
                  <span className="text-[11px] text-purple-300">Create individual tasks with photos, comments & costs</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Estimated Job Cost</span>
                  <span className="text-base font-mono font-black text-emerald-400">
                    ${runningTotalCost.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-2.5">
                {tasks.map((t, idx) => (
                  <div key={t.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-purple-400 font-bold uppercase block">Task {idx + 1}</span>
                        <h4 className="font-bold text-white text-xs">{t.description}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <input
                            type="number"
                            value={t.cost}
                            onChange={e => handleUpdateTaskCost(t.id, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-transparent text-right font-mono font-bold text-emerald-400 text-xs focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(t.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={t.comment}
                      onChange={e => handleUpdateTaskComment(t.id, e.target.value)}
                      placeholder="Inspection notes / findings..."
                      rows={2}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300"
                    />

                    {t.photos && t.photos.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pt-1">
                        {t.photos.map((p, pIdx) => (
                          <img key={pIdx} src={p} alt="Finding" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Task Card */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 border-dashed rounded-xl space-y-2.5">
                <span className="text-xs font-bold text-purple-300 block">+ Add Inspection Task</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Task description (e.g. Roof damage)"
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    className="sm:col-span-2 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                    <input
                      type="number"
                      placeholder="Cost"
                      value={newTaskCost}
                      onChange={e => setNewTaskCost(e.target.value)}
                      className="w-full bg-transparent text-right font-mono font-bold text-emerald-400 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <textarea
                  placeholder="Inspector comments / recommendations..."
                  value={newTaskComment}
                  onChange={e => setNewTaskComment(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
                />

                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!newTaskDesc.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task to Scope
                </button>
              </div>

              {/* Inspector Submission Rule: Send to Company First */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  Total Scope: <span className="font-mono text-emerald-400 font-bold">${runningTotalCost.toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitScopeToCompany}
                  disabled={tasks.length === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" /> Submit Job Scope and Estimate
                </button>
              </div>
            </div>
          )}

          {/* SUBVIEW 4: COMPANY REVIEW & REVISION */}
          {activeSubView === 'company_review' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-950/40 border border-amber-600/40 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-amber-300 font-bold text-xs">
                  <span>Company Review of Inspector Submission</span>
                  <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">Action Required</span>
                </div>
                <p className="text-xs text-slate-300">
                  Inspectors NEVER send directly to the Customer. You must confirm or revise the tasks and pricing below before presenting to the client.
                </p>
              </div>

              {/* Tasks with editable costs */}
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-xs">{t.description}</h4>
                      <p className="text-slate-400 text-[11px]">{t.comment}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <input
                        type="number"
                        value={t.cost}
                        onChange={e => handleUpdateTaskCost(t.id, parseFloat(e.target.value) || 0)}
                        className="w-20 bg-transparent text-right font-mono font-bold text-emerald-400 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-bold uppercase mb-1">Company Revision Notes (Optional)</label>
                <input
                  type="text"
                  value={revisionNotes}
                  onChange={e => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Adjusted labor rates for hazardous attic entry..."
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono font-bold">
                <span className="text-slate-300 text-xs">Revised Total Estimate:</span>
                <span className="text-emerald-400 text-base">${runningTotalCost.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCompanyReviseScope}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition border border-slate-600 cursor-pointer"
                >
                  Save Revisions & Send to Customer
                </button>
                <button
                  type="button"
                  onClick={handleCompanyConfirmScope}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Confirm & Send to Customer
                </button>
              </div>
            </div>
          )}

          {/* SUBVIEW 5: CUSTOMER APPROVAL OR REJECTION */}
          {activeSubView === 'customer_approval' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-600/40 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-emerald-300 font-bold text-xs">
                  <span>Inspection Estimate & Scope of Work</span>
                  <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded">Awaiting Approval</span>
                </div>
                <p className="text-xs text-slate-300">
                  Review the inspection findings, individual task breakdown, and final estimated cost. Confirm to initiate the project or reject to cancel.
                </p>
              </div>

              <div className="space-y-2">
                {tasks.map((t, idx) => (
                  <div key={t.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{idx + 1}. {t.description}</span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">${t.cost.toLocaleString()}</span>
                    </div>
                    {t.comment && <p className="text-slate-400 text-[11px]">{t.comment}</p>}
                    {t.photos && t.photos.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {t.photos.map((img, i) => (
                          <img key={i} src={img} alt="Inspection proof" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Scope Subtotal:</span>
                  <span className="font-mono">${runningTotalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-purple-400">
                  <span>Inspection Fee Credit:</span>
                  <span className="font-mono">-${job.inspectionFee || 150}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-800">
                  <span>Final Job Total (Net):</span>
                  <span className="font-mono text-emerald-400">${Math.max(0, runningTotalCost - (job.inspectionFee || 150)).toLocaleString()}</span>
                </div>
              </div>

              {/* Warning dialog modal if Reject is clicked */}
              {showRejectConfirm ? (
                <div className="p-4 bg-rose-950/60 border border-rose-600 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-300 font-black text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Mandatory Warning: Job Cancellation
                  </div>
                  <p className="text-xs text-rose-200 font-medium leading-relaxed">
                    "Rejecting this job scope will cancel this job in full. A new inspection will be required to continue."
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRejectConfirm(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCustomerRejectScope}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-lg cursor-pointer shadow-md"
                    >
                      Confirm Rejection & Cancel Job
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCustomerConfirmScope}
                    className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm & Convert to Active Job
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectConfirm(true)}
                    className="w-full sm:w-auto py-3 px-5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/60 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Reject Scope
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>Job ID: <span className="font-mono text-slate-400">{job.id}</span></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
