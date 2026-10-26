import React, { useState, useRef, useEffect } from 'react';
import { WorkerProfile, Job, CompanyCard, ExpensePurchase, SubJob, BeforeAfterPhoto, AppNotification, CompanySettings } from '../types';
import BeforeAfterModal from './BeforeAfterModal';
import { UniversalJobDetailModal } from './UniversalJobDetailModal';
import { InspectionWorkspaceModal } from './InspectionWorkspaceModal';
import { 
  Briefcase, MapPin, CheckCircle, Clock, Upload, 
  DollarSign, Plus, CheckSquare, Square, CreditCard, 
  Camera, ChevronRight, UserCheck, MessageSquare, Eye,
  AlertCircle, Check, X, ShieldAlert, Image, Lock, Navigation, RefreshCw,
  Search, Filter
} from 'lucide-react';
import { formatDMY, renderColoredJobDate } from '../utils/dateFormatter';

interface WorkerDashboardProps {
  jobs: Job[];
  workers: WorkerProfile[];
  cards: CompanyCard[];
  expenses: ExpensePurchase[];
  companySettings?: CompanySettings;
  onUpdateWorkers: (updatedWorkers: WorkerProfile[]) => void;
  onUpdateJobs: (updatedJobs: Job[]) => void;
  onUpdateExpenses: (updatedExpenses: ExpensePurchase[]) => void;
  onUpdateCards: (updatedCards: CompanyCard[]) => void;
  onAnnotatePhoto: (jobId: string, photoId: string, isBefore: boolean) => void;
  onSendNotification: (title: string, message: string, type: any, jobId?: string, workerId?: string) => void;
  targetJobId?: string | null;
  onClearTarget?: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

export default function WorkerDashboard({
  jobs,
  workers,
  cards,
  expenses,
  companySettings,
  onUpdateWorkers,
  onUpdateJobs,
  onUpdateExpenses,
  onUpdateCards,
  onAnnotatePhoto,
  onSendNotification,
  targetJobId,
  onClearTarget,
  onNotificationClick
}: WorkerDashboardProps) {
  // Current simulating worker
  const [activeWorkerId, setActiveWorkerId] = useState<string>(workers[0]?.id || 'w1');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [assignedViewTab, setAssignedViewTab] = useState<'jobs' | 'inspections'>('jobs');

  // Popup Modal states (Requirement: ANY clickable job MUST open in a popup/modal)
  const [modalJob, setModalJob] = useState<Job | null>(null);
  const [inspectionModalJob, setInspectionModalJob] = useState<Job | null>(null);

  const handleOpenJobModal = (job: Job) => {
    setSelectedJobId(job.id);
    if (job.inspectionStatus || job.inspectionRequest || job.title.toLowerCase().includes('inspection')) {
      setInspectionModalJob(job);
    } else {
      setModalJob(job);
    }
  };

  useEffect(() => {
    if (targetJobId) {
      setSelectedJobId(targetJobId);
      const target = jobs.find(j => j.id === targetJobId);
      if (target) {
        handleOpenJobModal(target);
      }
      onClearTarget?.();
    }
  }, [targetJobId]);
  
  // Local form states
  const [costDesc, setCostDesc] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costType, setCostType] = useState<'Materials' | 'Other'>('Materials');
  const [costCardId, setCostCardId] = useState('');
  const [costReceipt, setCostReceipt] = useState<string | undefined>(undefined);
  const [showAddCostForm, setShowAddCostForm] = useState(false);

  // Before & After Modal
  const [showBeforeAfterModal, setShowBeforeAfterModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // Confirmation Pop-up: "Are all jobs/tasks completed?" [Yes / No]
  const [showAllTasksCompleteConfirm, setShowAllTasksCompleteConfirm] = useState(false);
  const [pendingJobIdToComplete, setPendingJobIdToComplete] = useState<string | null>(null);

  // Target task for attaching photo
  const [targetTaskIdForPhoto, setTargetTaskIdForPhoto] = useState<string | null>(null);
  const taskPhotoInputRef = useRef<HTMLInputElement>(null);

  // Selected entities
  const activeWorker = workers.find(w => w.id === activeWorkerId) || workers[0];
  const assignedJobs = jobs.filter(j => j.assignedWorkers.includes(activeWorkerId));
  
  // Choose initial job if none selected
  const activeJobId = selectedJobId || (assignedJobs[0]?.id || jobs[0]?.id || '');
  const activeJob = jobs.find(j => j.id === activeJobId) || jobs[0];

  // GPS Geofence Perimeter (Strictly locked to Company Account Settings)
  const geofenceRadius = companySettings?.geofenceRadiusMiles ?? 1.0;
  const [gpsDistance, setGpsDistance] = useState<number>(0.8);
  const [isVerifyingGps, setIsVerifyingGps] = useState<boolean>(false);

  // Sync GPS distance whenever active worker or job switches
  useEffect(() => {
    if (activeWorker && activeJob) {
      const isAtThisJob = Boolean(activeWorker.isAtJob && activeWorker.currentJobId === activeJob.id);
      setGpsDistance(isAtThisJob ? Math.min(0.3, Number((geofenceRadius * 0.3).toFixed(1))) : Number((geofenceRadius + 2.5).toFixed(1)));
    }
  }, [activeWorkerId, activeJobId, geofenceRadius]);

  // Tamper-Proof GPS Attendance Check-In / Check-Out (No employee slider permitted)
  const handleToggleAttendance = () => {
    if (!activeJob || !activeWorker) return;

    setIsVerifyingGps(true);

    const isCurrentlyCheckedIn = Boolean(activeWorker.isAtJob && activeWorker.currentJobId === activeJob.id);
    const willBeCheckedIn = !isCurrentlyCheckedIn;

    // Simulate GPS ping acquiring physical telemetry
    setTimeout(() => {
      setIsVerifyingGps(false);
      const newDistance = willBeCheckedIn 
        ? Math.min(0.3, Number((geofenceRadius * 0.3).toFixed(1))) 
        : Number((geofenceRadius + 2.5).toFixed(1));
      
      setGpsDistance(newDistance);

      const nowStr = new Date().toISOString();
      const todayStr = new Date().toLocaleDateString('en-CA');

      // 1. Update the Worker profile
      const updatedWorkers = workers.map(w => {
        if (w.id === activeWorkerId) {
          return {
            ...w,
            isAtJob: willBeCheckedIn,
            currentJobId: willBeCheckedIn ? activeJob.id : undefined,
            lastCheckInAt: willBeCheckedIn ? nowStr : w.lastCheckInAt
          };
        }
        return w;
      });
      onUpdateWorkers(updatedWorkers);

      // 2. Update Job's day calendar logs
      const updatedJobs = jobs.map(j => {
        if (j.id === activeJob.id) {
          const logs = { ...j.workDayLogs };
          
          if (willBeCheckedIn) {
            logs[todayStr] = {
              date: todayStr,
              worked: true,
              notes: `GPS Geofence check-in (${newDistance.toFixed(1)} mi <= company ${geofenceRadius.toFixed(1)} mi perimeter) at ${new Date().toLocaleTimeString()}`
            };
          }
          return { 
            ...j, 
            workDayLogs: logs,
            isActualStarted: true,
            hasInitialGeofenceArrival: true,
            actualStartedAt: j.actualStartedAt || nowStr
          };
        }
        return j;
      });
      onUpdateJobs(updatedJobs);

      // 3. Send automated GPS geofence notification
      if (willBeCheckedIn) {
        onSendNotification(
          'GPS Geofence: On-Site 📍',
          `${activeWorker.name} verified on-site at "${activeJob.address} — ${activeJob.clientName}" (${newDistance.toFixed(1)} miles <= company perimeter ${geofenceRadius.toFixed(1)} mi)`,
          'check-in',
          activeJob.id,
          activeWorker.id
        );
      } else {
        onSendNotification(
          'GPS Geofence: Off-Site 🛰️',
          `${activeWorker.name} departed site (${newDistance.toFixed(1)} miles from "${activeJob.address}")`,
          'check-out',
          activeJob.id,
          activeWorker.id
        );
      }
    }, 400);
  };

  // Toggle To-Do task in the field
  const handleToggleToDo = (subId: string) => {
    if (!activeJob) return;
    
    // If job is already employee-confirmed complete and locked, don't toggle unless confirmed
    if (activeJob.status === 'completed') {
      alert('This job is marked as Completed.');
      return;
    }

    let allCompletedAfterToggle = false;

    const updated = jobs.map(j => {
      if (j.id === activeJob.id) {
        const checklist = j.checklist.map(item => {
          if (item.id === subId) {
            const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
            return { ...item, status: nextStatus as any };
          }
          return item;
        });

        const pendingCount = checklist.filter(item => item.status !== 'completed').length;
        if (pendingCount === 0) {
          allCompletedAfterToggle = true;
        }

        return { ...j, checklist };
      }
      return j;
    });

    onUpdateJobs(updated);

    // If all tasks are now checked, trigger the confirmation pop-up
    if (allCompletedAfterToggle) {
      setPendingJobIdToComplete(activeJob.id);
      setShowAllTasksCompleteConfirm(true);
    }
  };

  // Confirmation actions for All Tasks Completed
  const handleConfirmAllTasksComplete = () => {
    if (!pendingJobIdToComplete) return;

    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const updated = jobs.map(j => {
      if (j.id === pendingJobIdToComplete) {
        return {
          ...j,
          employeeConfirmedComplete: true,
          completionConfirmationTimestamp: nowIso,
          customerConfirmationWindowExpiresAt: expiresIso,
          customerConfirmationStatus: 'pending_confirmation' as const,
          completionRecord: {
            confirmedByWorkerId: activeWorker.id,
            confirmedByWorkerName: activeWorker.name,
            confirmedAt: nowIso,
            finalChecklist: [...j.checklist]
          }
        };
      }
      return j;
    });

    onUpdateJobs(updated);
    setShowAllTasksCompleteConfirm(false);
    setPendingJobIdToComplete(null);

    // Clickable notifications to Customer, Company, and Manager
    onSendNotification(
      '🔔 All Tasks Completed — 24h Review Window Started',
      `${activeWorker.name} has completed and verified all To-Do tasks for "${activeJob?.address} — ${activeJob?.clientName}". Customer has 24 hours to confirm, request additional services, or report issues.`,
      'completion',
      pendingJobIdToComplete
    );
  };

  const handleDeclineAllTasksComplete = () => {
    if (!pendingJobIdToComplete) return;

    // Rule: "If NO -> uncheck all tasks, require manual re-check, do not mark complete"
    const updated = jobs.map(j => {
      if (j.id === pendingJobIdToComplete) {
        const resetChecklist = j.checklist.map(item => ({
          ...item,
          status: 'pending' as const
        }));
        return {
          ...j,
          checklist: resetChecklist
        };
      }
      return j;
    });

    onUpdateJobs(updated);
    setShowAllTasksCompleteConfirm(false);
    setPendingJobIdToComplete(null);
  };

  // Upload picture attached directly to a specific To-Do task
  const handleTaskPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJob || !targetTaskIdForPhoto) return;

    const targetTask = activeJob.checklist.find(t => t.id === targetTaskIdForPhoto);
    const taskTitle = targetTask?.title || 'General Task';

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;

      // Automatically add to Job's After Images with metadata:
      // Job -> To-Do Task -> Employee -> Photo -> Date/Time
      const timestamp = new Date().toLocaleString();
      const newPhotoEntry: BeforeAfterPhoto = {
        id: `photo-${Date.now()}`,
        title: `Task: ${taskTitle} (by ${activeWorker.name})`,
        afterImages: [base64],
        comments: [
          {
            id: `comm-${Date.now()}`,
            authorRole: 'worker',
            authorName: activeWorker.name,
            text: `Uploaded on ${timestamp} for task: "${taskTitle}"`,
            createdAt: new Date().toISOString()
          }
        ]
      };

      const updated = jobs.map(j => {
        if (j.id === activeJob.id) {
          return {
            ...j,
            beforeAfterPhotos: [...(j.beforeAfterPhotos || []), newPhotoEntry]
          };
        }
        return j;
      });

      onUpdateJobs(updated);
      setTargetTaskIdForPhoto(null);

      onSendNotification(
        'Task Progress Photo Uploaded 📸',
        `${activeWorker.name} added a photo for "${taskTitle}" at ${activeJob.address}.`,
        'comment',
        activeJob.id,
        activeWorker.id
      );
    };

    reader.readAsDataURL(file);
  };

  // Worker logs cost expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(costAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !activeJob) {
      alert('Please input a valid cost amount.');
      return;
    }

    const finalDesc = costType === 'Materials' ? 'Materials' : costDesc;
    if (costType === 'Other' && !finalDesc.trim()) {
      alert('Please type what was purchased.');
      return;
    }

    const finalCategory = costType === 'Materials' ? 'Materials' : 'Other';
    const selectedCard = cards.find(c => c.id === costCardId);

    const newExpense: ExpensePurchase = {
      id: `exp-${Date.now()}`,
      jobId: activeJob.id,
      description: finalDesc,
      amount: parsedAmount,
      category: finalCategory,
      workerId: activeWorkerId,
      workerName: activeWorker.name,
      cardUsedId: costCardId || undefined,
      date: new Date().toLocaleDateString('en-CA'),
      receiptImage: costReceipt
    };

    if (selectedCard) {
      const updatedCards = cards.map(c => {
        if (c.id === selectedCard.id) {
          return { ...c, spent: c.spent + parsedAmount };
        }
        return c;
      });
      onUpdateCards(updatedCards);
    }

    onUpdateExpenses([newExpense, ...expenses]);

    onSendNotification(
      'Field Expense Logged',
      `${activeWorker.name} logged $${parsedAmount} for "${finalDesc}" on "${activeJob.address} — ${activeJob.clientName}"`,
      'expense',
      activeJob.id
    );

    setCostDesc('');
    setCostAmount('');
    setCostReceipt(undefined);
    setShowAddCostForm(false);
  };

  // Worker posts general text message
  const handlePostMessage = () => {
    if (!chatMessage.trim() || !activeJob) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      authorRole: 'worker' as const,
      authorName: activeWorker.name,
      text: chatMessage,
      createdAt: new Date().toISOString()
    };

    const updated = jobs.map(j => {
      if (j.id === activeJob.id) {
        return { ...j, comments: [newComment, ...(j.comments || [])] };
      }
      return j;
    });
    onUpdateJobs(updated);
    setChatMessage('');

    onSendNotification(
      'Field Note Posted',
      `${activeWorker.name} posted a note on "${activeJob.address} — ${activeJob.clientName}"`,
      'comment',
      activeJob.id
    );
  };

  // Check geofence status for active job
  const isWorkerOnSite = activeWorker.isAtJob && activeWorker.currentJobId === activeJob?.id;

  return (
    <div className="space-y-6">
      
      {/* Simulation Worker Profile Selector */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <UserCheck className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Employee Simulation Handset</h3>
            <p className="text-xs text-slate-400">Select active employee profile to simulate on-site tasks & GPS:</p>
          </div>
        </div>

        <div className="flex gap-2">
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setActiveWorkerId(w.id);
                setSelectedJobId('');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
                activeWorkerId === w.id
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <img src={w.avatar} alt={w.name} className="w-5 h-5 rounded-full object-cover" />
              <span>{w.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Assigned Jobs & Inspections Roster */}
        <div className="space-y-4">
          {/* Sub-tabs: Jobs vs Inspections */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setAssignedViewTab('jobs')}
              className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition cursor-pointer ${
                assignedViewTab === 'jobs' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Jobs ({assignedJobs.filter(j => !j.inspectionStatus && !j.inspectionRequest && !j.title.toLowerCase().includes('inspection')).length})
            </button>
            <button
              onClick={() => setAssignedViewTab('inspections')}
              className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition cursor-pointer ${
                assignedViewTab === 'inspections' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Inspections ({jobs.filter(j => (j.assignedWorkers || []).includes(activeWorker.id) && (j.inspectionStatus || j.inspectionRequest || j.title.toLowerCase().includes('inspection'))).length})
            </button>
          </div>
          
          {assignedViewTab === 'jobs' ? (
            assignedJobs.filter(j => !j.inspectionStatus && !j.inspectionRequest && !j.title.toLowerCase().includes('inspection')).length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center text-xs text-slate-400 font-medium italic">
                No active jobs currently assigned to {activeWorker.name}.
              </div>
            ) : (
              <div className="space-y-3">
                {assignedJobs.filter(j => !j.inspectionStatus && !j.inspectionRequest && !j.title.toLowerCase().includes('inspection')).map((j) => {
                  const isActive = activeJobId === j.id;
                  const completedTasks = j.checklist.filter(sub => sub.status === 'completed').length;

                  return (
                    <button
                      key={j.id}
                      onClick={() => handleOpenJobModal(j)}
                      className={`w-full text-left p-4 rounded-2xl border transition space-y-2 cursor-pointer ${
                        isActive
                          ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        {/* Mandated Color Scheme: RED = NOT STARTED, ORANGE = ACTIVE, GREEN = COMPLETED */}
                        <div className="flex items-center gap-1.5">
                          {j.status === 'completed' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              COMPLETED
                            </span>
                          ) : j.status === 'in-progress' || (j.status as string) === 'active' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              NOT STARTED
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {renderColoredJobDate(j.startDate)}
                        </span>
                      </div>

                      <div>
                        {/* Universal Identifier: [Job Address] — [Customer Name] */}
                        <h4 className="font-black text-white text-sm line-clamp-1">
                          {j.address} — {j.clientName}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {j.title}
                        </p>
                      </div>

                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all" 
                          style={{ width: `${(completedTasks / (j.checklist.length || 1)) * 100}%` }}
                        />
                      </div>

                      <div className="text-[10px] text-amber-400 font-bold flex items-center justify-between pt-1">
                        <span>Click to open Job Details modal</span>
                        <span>→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            /* Mandated Inspections list for employee */
            <div className="space-y-3">
              {jobs.filter(j => (j.assignedWorkers || []).includes(activeWorker.id) && (j.inspectionStatus || j.inspectionRequest || j.title.toLowerCase().includes('inspection'))).length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center text-xs text-slate-400 font-medium italic">
                  No inspections currently assigned to {activeWorker.name}.
                </div>
              ) : (
                jobs.filter(j => (j.assignedWorkers || []).includes(activeWorker.id) && (j.inspectionStatus || j.inspectionRequest || j.title.toLowerCase().includes('inspection'))).map(j => (
                  <div
                    key={j.id}
                    onClick={() => handleOpenJobModal(j)}
                    className="p-4 bg-slate-900 border border-purple-500/40 hover:border-purple-500 hover:bg-slate-850 rounded-2xl transition space-y-2 cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30">
                        {j.inspectionScope?.status === 'submitted_to_company' ? 'SCOPE UNDER REVIEW' : 'INSPECTION'}
                      </span>
                      <strong className="text-emerald-400 font-mono text-xs">${j.inspectionFee || 150} Paid</strong>
                    </div>

                    <div>
                      <h4 className="font-black text-white text-sm line-clamp-1">{j.address} — {j.clientName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{j.title}</p>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Customer:</span>
                        <strong className="text-white">{j.clientName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Date & Time:</span>
                        <strong className="text-amber-400 font-mono">{j.inspectionDate || j.startDate} at {j.inspectionTime || '10:00 AM'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Company:</span>
                        <span className="text-slate-300 truncate max-w-[150px]">{j.companyName || 'Apex Structural Builders'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Assigned Employee:</span>
                        <strong className="text-blue-400">{activeWorker.name}</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-purple-400 font-bold flex items-center justify-between pt-1">
                      <span>Click to Start Inspection or Report Issue</span>
                      <span>→</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Active Job Site Handset Workspace */}
        {activeJob && (
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 shadow-sm">
              
              {/* Header with Universal Job ID and Geofence Tracker */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-5 flex-wrap gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    Active Field Sheet
                  </span>
                  {/* Universal Job Identifier */}
                  <h2 className="text-lg font-black text-white leading-snug">
                    {activeJob.address} — {activeJob.clientName}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {activeJob.title}
                  </p>
                  <div className="text-xs text-slate-400 font-mono pt-1">
                    Timeline: <span className="text-emerald-400 font-bold">{renderColoredJobDate(activeJob.startDate)}</span> → <span className="text-emerald-400 font-bold">{renderColoredJobDate(activeJob.endDate)}</span>
                  </div>
                </div>

                {/* Tamper-Proof GPS Geofence Status Box (Slider removed for employees; locked to Company Settings) */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 min-w-[260px] sm:min-w-[285px]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[11px] text-white font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      GPS Geofence
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      isWorkerOnSite
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isWorkerOnSite ? 'On Site' : 'Off Site'}
                    </span>
                  </div>
                  
                  {/* Read-Only Verified Distance & Locked Company Boundary */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[11px] p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Navigation className="w-3 h-3 text-amber-400" />
                        Distance to Site:
                      </span>
                      <span className="font-bold text-amber-400 font-mono text-xs">
                        {gpsDistance.toFixed(1)} miles
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] px-1 text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Company Boundary:
                      </span>
                      <span className="text-slate-300 font-bold">
                        {geofenceRadius.toFixed(1)} mi perimeter
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Banner */}
                  <div className="text-[10px] text-slate-300 leading-normal p-2 rounded bg-slate-900 border border-slate-800 font-mono">
                    {isWorkerOnSite ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        Within {geofenceRadius.toFixed(1)} mi zone. Auto-Attendance active.
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Outside {geofenceRadius.toFixed(1)} mi zone. Physical site arrival required.
                      </span>
                    )}
                  </div>

                  {/* Tamper-Proof GPS Attendance Action Button */}
                  <button
                    type="button"
                    onClick={handleToggleAttendance}
                    disabled={isVerifyingGps}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                      isWorkerOnSite
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    } disabled:opacity-50`}
                  >
                    {isVerifyingGps ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying GPS Coordinates...</span>
                      </>
                    ) : isWorkerOnSite ? (
                      <>
                        <Navigation className="w-3.5 h-3.5 text-slate-300" />
                        <span>Clock Out / Depart Site</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                        <span>Verify GPS & Check In</span>
                      </>
                    )}
                  </button>

                  <div className="text-[9px] text-slate-400 text-center font-mono flex items-center justify-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Geofence distance is locked to Company Account Settings</span>
                  </div>
                </div>
              </div>

              {/* 24-Hour Review Window & Completion State Alert for Field Workers */}
              {activeJob.customerConfirmationStatus === 'pending_confirmation' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>⏳ 24-Hour Customer Review Window Active</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    All tasks have been marked complete. Homeowner ({activeJob.clientName}) has been notified to verify deliverables. If no action is taken within 24 hours, the job will automatically finalize and payment will be released.
                  </p>
                </div>
              )}

              {activeJob.customerConfirmationStatus === 'additional_services_requested' && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/40 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-blue-400">
                    <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>💬 Additional Services Requested — 24-Hour Clock Paused</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    The customer has requested additional services or scope change. The 24-hour review timer is paused until the new scope is quoted and approved.
                  </p>
                </div>
              )}

              {activeJob.customerConfirmationStatus === 'problem_reported' && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/40 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>⚠️ Site Issue Reported — 24-Hour Clock Paused</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Homeowner reported an issue: <strong className="text-rose-300">{activeJob.reportedProblem?.category || 'Field concern'}</strong> — "{activeJob.reportedProblem?.description || 'Pending inspection'}". Check direct messages to coordinate and resolve.
                  </p>
                </div>
              )}

              {(activeJob.status === 'completed' || activeJob.customerConfirmationStatus === 'customer_confirmed' || activeJob.customerConfirmationStatus === 'auto_finalized') && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✅ Job Completed & Confirmed</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    This project has been verified and finalized. Escrow payment has been captured and released to the company.
                  </p>
                </div>
              )}

              {/* ==================== 1. JOB TO-DO LIST (With Add Picture directly to the right) ==================== */}
              <div className="space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase font-mono tracking-wider flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                    Job To-Do Tasks ({activeJob.checklist.filter(c => c.status === 'completed').length}/{activeJob.checklist.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Tap checkbox to complete • Tap camera to attach photo
                  </span>
                </div>

                {/* Hidden File Input for Task Photo */}
                <input
                  type="file"
                  ref={taskPhotoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleTaskPhotoUpload}
                />

                <div className="space-y-2">
                  {activeJob.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 transition gap-2"
                    >
                      {/* Checkbox and Task Title */}
                      <button
                        type="button"
                        onClick={() => handleToggleToDo(item.id)}
                        className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                      >
                        {item.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500 shrink-0" />
                        )}
                        <span className={`text-xs font-medium ${
                          item.status === 'completed' ? 'line-through text-slate-500 font-normal' : 'text-slate-200'
                        }`}>
                          {item.title}
                        </span>
                      </button>

                      {/* Optional Add Picture Button Directly to the Right of Each Task */}
                      <button
                        type="button"
                        onClick={() => {
                          setTargetTaskIdForPhoto(item.id);
                          taskPhotoInputRef.current?.click();
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 hover:border-amber-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                        title="Attach verification photo to this task"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Add Photo</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ==================== 2. BEFORE & AFTER PHOTOS (Clickable) ==================== */}
              <div>
                <div
                  onClick={() => setShowBeforeAfterModal(true)}
                  className="p-4 bg-slate-950 hover:border-amber-500/60 rounded-xl text-white shadow-md transition cursor-pointer border border-slate-800 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/30">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase font-mono">
                        Before & After Photos Gallery
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        View Before photos (top) & After photos (bottom)
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Open
                  </span>
                </div>
              </div>

              {/* ==================== 3. MATERIAL EXPENSE LOGGING ==================== */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase font-mono tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Field Material Expense
                  </h3>
                  <button
                    onClick={() => setShowAddCostForm(!showAddCostForm)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Purchase
                  </button>
                </div>

                {showAddCostForm && (
                  <form onSubmit={handleSaveExpense} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 animate-fade-in text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold">Purchase Type</label>
                        <select
                          value={costType}
                          onChange={(e: any) => setCostType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        >
                          <option value="Materials">Materials</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold">Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={costAmount}
                          onChange={(e) => setCostAmount(e.target.value)}
                          placeholder="e.g. 85.50"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    {costType === 'Other' && (
                      <div className="space-y-1">
                        <label className="text-slate-300 font-bold">Specify Item</label>
                        <input
                          type="text"
                          value={costDesc}
                          onChange={(e) => setCostDesc(e.target.value)}
                          placeholder="e.g. Parking fee, dump fee..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddCostForm(false)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                      >
                        Submit Expense
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* ==================== 4. LIVE LOG MESSAGES ==================== */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase font-mono tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Site Communications
                </h3>

                <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {(!activeJob.comments || activeJob.comments.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-2 text-center">No notes recorded yet.</p>
                  ) : (
                    activeJob.comments.map((cm) => (
                      <div key={cm.id} className="text-xs space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span className="font-bold text-white">{cm.authorName} ({cm.authorRole.toUpperCase()})</span>
                          <span>{new Date(cm.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-300">{cm.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Log a field update note..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePostMessage()}
                    className="bg-slate-950 text-xs border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 flex-1"
                  />
                  <button
                    onClick={handlePostMessage}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ==================== ALL TASKS COMPLETED CONFIRMATION MODAL ==================== */}
      {showAllTasksCompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Confirm Job Completion</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {companySettings?.jobCompletionPromptText || "Are all jobs/tasks completed?"}
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div>• Choosing <strong>Yes</strong> marks the job complete and notifies Customer, Company, and Manager.</div>
              <div>• Choosing <strong>No</strong> unchecks all tasks and requires manual re-checking.</div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeclineAllTasksComplete}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                No, Not Done
              </button>
              <button
                type="button"
                onClick={handleConfirmAllTasksComplete}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow cursor-pointer"
              >
                Yes, Complete Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Before & After Modal */}
      {showBeforeAfterModal && activeJob && (
        <BeforeAfterModal
          isOpen={showBeforeAfterModal}
          onClose={() => setShowBeforeAfterModal(false)}
          job={activeJob}
          onUpdateJob={(updatedJob) => {
            const nextJobs = jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
            onUpdateJobs(nextJobs);
          }}
          userRole="worker"
        />
      )}

      {/* Universal Job Detail Popup Modal */}
      {modalJob && (
        <UniversalJobDetailModal
          isOpen={Boolean(modalJob)}
          job={modalJob}
          onClose={() => setModalJob(null)}
          userRole="worker"
          workers={workers}
          onUpdateJobs={onUpdateJobs}
          onSendNotification={onSendNotification}
          onOpenInspectionWorkspace={(job) => {
            setModalJob(null);
            setInspectionModalJob(job);
          }}
        />
      )}

      {/* Inspection Workspace Modal */}
      {inspectionModalJob && (
        <InspectionWorkspaceModal
          isOpen={Boolean(inspectionModalJob)}
          job={inspectionModalJob}
          userRole="worker"
          workers={workers}
          onClose={() => setInspectionModalJob(null)}
          onUpdateJobs={onUpdateJobs}
          onSendNotification={onSendNotification}
        />
      )}

    </div>
  );
}
