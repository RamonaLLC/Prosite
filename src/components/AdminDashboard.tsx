import React, { useState, useEffect } from 'react';
import { WorkerProfile, CompanyCard, Job, ExpensePurchase, SubJob, BeforeAfterPhoto, AppNotification, Role, CompanySettings } from '../types';
import ReportingAnalytics from './ReportingAnalytics';
import BeforeAfterModal from './BeforeAfterModal';
import TotalJobValueModal from './TotalJobValueModal';
import EmployeeManagementModal from './EmployeeManagementModal';
import JobSiteHoursSection from './JobSiteHoursSection';
import { JobSiteMapView } from './JobSiteMapView';
import { SmartScheduleMatrix } from './SmartScheduleMatrix';
import { TravelTimeConflictModal } from './TravelTimeConflictModal';
import { EmployeeDispatchHub } from './EmployeeDispatchHub';
import { UnifiedJobsHub } from './UnifiedJobsHub';
import { UniversalJobDetailModal } from './UniversalJobDetailModal';
import { InspectionWorkspaceModal } from './InspectionWorkspaceModal';
import { AdminJobsHub } from './AdminJobsHub';
import { 
  Building, Calendar, CreditCard, ChevronRight, Users, MapPin, 
  Plus, Upload, ShieldCheck, DollarSign, Clock, CheckSquare, 
  Square, RefreshCw, MessageSquare, Star, Trash2, AlertCircle,
  User, X, Camera, Eye, ArrowUp, ArrowDown, Edit3, Check, Settings,
  TrendingUp, HardHat, FileText, ChevronUp, ChevronDown, UserX, UserPlus,
  Car, ShieldAlert, AlertTriangle, Sparkles, EyeOff, Search, Filter
} from 'lucide-react';
import { formatDMY, renderColoredJobDate } from '../utils/dateFormatter';
import { 
  validateJobScheduleMultiWorker, 
  checkEmployeeSlotConflicts, 
  getEstimatedTravelTime, 
  formatTime12Hour 
} from '../services/travelTimeService';
import { SchedulingConflict } from '../types';

interface AdminDashboardProps {
  userRole: 'company' | 'manager' | 'admin';
  jobs: Job[];
  workers: WorkerProfile[];
  cards: CompanyCard[];
  expenses: ExpensePurchase[];
  notifications: AppNotification[];
  companySettings?: CompanySettings;
  onUpdateJobs: (updatedJobs: Job[]) => void;
  onUpdateWorkers?: (updatedWorkers: WorkerProfile[]) => void;
  onUpdateExpenses: (updatedExpenses: ExpensePurchase[]) => void;
  onUpdateCards: (updatedCards: CompanyCard[]) => void;
  onAnnotatePhoto: (jobId: string, photoId: string, isBefore: boolean) => void;
  onSendNotification: (title: string, message: string, type: any, jobId?: string, workerId?: string) => void;
  onOpenSettings?: () => void;
  onOpenMessages?: () => void;
  onOpenInvitations?: () => void;
  onSendInvite?: (email: string, role: 'manager' | 'employee', managerCode?: string) => void;
  targetTab?: 'overview' | 'dispatch' | 'jobs' | 'finances' | 'analytics' | null;
  targetJobId?: string | null;
  onClearTarget?: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

export default function AdminDashboard({
  userRole,
  jobs,
  workers,
  cards,
  expenses,
  notifications,
  companySettings,
  onUpdateJobs,
  onUpdateWorkers,
  onUpdateExpenses,
  onUpdateCards,
  onAnnotatePhoto,
  onSendNotification,
  onOpenSettings,
  onOpenMessages,
  onOpenInvitations,
  onSendInvite,
  targetTab,
  targetJobId,
  onClearTarget,
  onNotificationClick
}: AdminDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'dispatch' | 'jobs' | 'finances' | 'analytics'>('overview');
  const [useUnifiedJobsHub, setUseUnifiedJobsHub] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Global Modal Popup states (Requirement: ANY clickable job MUST open in a popup/modal, never expand on page)
  const [modalJob, setModalJob] = useState<Job | null>(null);
  const [inspectionModalJob, setInspectionModalJob] = useState<Job | null>(null);
  const [jobsSubFilter, setJobsSubFilter] = useState<'all' | 'active' | 'inspections' | 'open_jobs' | 'open_bids' | 'completed'>('all');
  const [jobSearchQuery, setJobSearchQuery] = useState('');

  const handleOpenJobModal = (job: Job) => {
    setSelectedJobId(job.id);
    if (job.inspectionStatus || job.inspectionRequest || job.title.toLowerCase().includes('inspection')) {
      setInspectionModalJob(job);
    } else {
      setModalJob(job);
    }
  };

  // Sync navigation requests from clicked notifications
  useEffect(() => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
    if (targetJobId) {
      setSelectedJobId(targetJobId);
      const target = jobs.find(j => j.id === targetJobId);
      if (target) {
        handleOpenJobModal(target);
      }
    }
    if (targetTab || targetJobId) {
      onClearTarget?.();
    }
  }, [targetTab, targetJobId]);

  // New Job Creation
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobClient, setNewJobClient] = useState('');
  const [newJobEmail, setNewJobEmail] = useState('DevinJJenkins90@gmail.com');
  const [newJobAddress, setNewJobAddress] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobStart, setNewJobStart] = useState('2026-06-22');
  const [newJobEnd, setNewJobEnd] = useState('2026-06-24');
  const [newJobStartTime, setNewJobStartTime] = useState('09:00');
  const [newJobEndTime, setNewJobEndTime] = useState('12:00');
  const [newJobEstimatedDuration, setNewJobEstimatedDuration] = useState('3 Weeks');
  const [newJobWorkers, setNewJobWorkers] = useState<string[]>([]);
  const [newJobChecklist, setNewJobChecklist] = useState<string>('Site preparation\nMaterial delivery\nCore construction\nClean up');

  // Travel Conflict State
  const [activeConflictForSchedule, setActiveConflictForSchedule] = useState<SchedulingConflict | null>(null);
  const [pendingJobCreationData, setPendingJobCreationData] = useState<any>(null);

  // New Expense state (Company only)
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<'Materials' | 'Fuel' | 'Tools' | 'Permits' | 'Other'>('Materials');
  const [expWorker, setExpWorker] = useState(workers[0]?.id || '');
  const [expCard, setExpCard] = useState(cards[0]?.id || '');
  const [expReceipt, setExpReceipt] = useState<string | undefined>(undefined);

  // To-Do Task Management State
  const [newToDoText, setNewToDoText] = useState('');
  const [editingToDoId, setEditingToDoId] = useState<string | null>(null);
  const [editingToDoText, setEditingToDoText] = useState('');

  // Confirmation dialogs for employee assignment
  const [workerToConfirmAssign, setWorkerToConfirmAssign] = useState<WorkerProfile | null>(null);
  const [workerToConfirmRemove, setWorkerToConfirmRemove] = useState<WorkerProfile | null>(null);

  // Comments
  const [commentText, setCommentText] = useState('');
  
  // Interactive Modals
  const [showActiveJobsModal, setShowActiveJobsModal] = useState(false);
  const [showTotalJobValueModal, setShowTotalJobValueModal] = useState(false);
  const [showEmployeeManagementModal, setShowEmployeeManagementModal] = useState(false);
  const [showClientDetailsModal, setShowClientDetailsModal] = useState<any>(null);
  const [showBeforeAfterModal, setShowBeforeAfterModal] = useState(false);

  // Selected job computed values
  const selectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0];

  // Calculate calendar days for a job
  const getJobDaysArray = (job: Job) => {
    if (!job) return [];
    const start = new Date(job.startDate + 'T00:00:00');
    const end = new Date(job.endDate + 'T00:00:00');
    const days: string[] = [];
    const timeDiff = end.getTime() - start.getTime();
    const daySpan = Math.min(30, Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1));

    for (let i = 0; i < daySpan; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      days.push(`${year}-${month}-${day}`);
    }
    return days;
  };

  // Convert uploaded receipt/picture
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExpReceipt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const finalizeJobCreation = (customStartTime?: string) => {
    const checklistItemStrings = newJobChecklist.split('\n').filter(Boolean);
    const subJobs: SubJob[] = checklistItemStrings.map((item, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      title: item.trim(),
      status: 'pending'
    }));

    const initialDayLogs: Record<string, { date: string; worked: boolean }> = {};
    const days = getJobDaysArray({
      startDate: newJobStart,
      endDate: newJobEnd
    } as any);
    days.forEach(d => {
      initialDayLogs[d] = { date: d, worked: false };
    });

    const sTime = customStartTime || newJobStartTime || '09:00';

    const newJob: Job = {
      id: `job-${Date.now()}`,
      title: newJobTitle || `${newJobAddress} Remodel`,
      clientName: newJobClient,
      clientEmail: newJobEmail,
      address: newJobAddress,
      description: newJobDesc || 'Standard construction and remodeling scope.',
      startDate: newJobStart,
      endDate: newJobEnd,
      estimatedDuration: newJobEstimatedDuration || 'To Be Complete',
      status: 'planning',
      jobValue: 22000,
      assignedWorkers: newJobWorkers,
      checklist: subJobs,
      beforeAfterPhotos: [],
      workDayLogs: initialDayLogs,
      comments: [],
      inspectionDate: newJobStart,
      inspectionTime: sTime,
      startTime: sTime,
      endTime: newJobEndTime || '12:00'
    } as any;

    onUpdateJobs([newJob, ...jobs]);
    onSendNotification(
      'New Job Created',
      `New project created: ${newJob.address} — ${newJob.clientName} with ${newJobWorkers.length} assigned worker(s).`,
      'system',
      newJob.id
    );

    // Reset states
    setNewJobTitle('');
    setNewJobClient('');
    setNewJobAddress('');
    setNewJobDesc('');
    setNewJobWorkers([]);
    setNewJobChecklist('Site preparation\nMaterial delivery\nCore construction\nClean up');
    setShowAddJobModal(false);
    setActiveConflictForSchedule(null);
  };

  // Handle building new job with Smart Travel & 30-min buffer validation
  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobClient || !newJobAddress || !newJobStart || !newJobEnd) {
      alert('Please fill in address and client metadata.');
      return;
    }

    // Validate travel times and 30-min buffers for assigned workers
    if (newJobWorkers.length > 0) {
      const validation = validateJobScheduleMultiWorker(
        newJobWorkers,
        {
          jobId: `job-new`,
          jobTitle: newJobTitle || `${newJobAddress} Remodel`,
          address: newJobAddress,
          date: newJobStart,
          startTime: newJobStartTime || '09:00',
          endTime: newJobEndTime || '12:00'
        },
        jobs,
        workers,
        companySettings
      );

      if (!validation.isValid) {
        // Pop conflict warning modal
        setActiveConflictForSchedule(validation.allConflicts[0]);
        return;
      }
    }

    finalizeJobCreation();
  };

  // Handle recording new material expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expAmount);
    if (!expDesc || isNaN(amountNum) || amountNum <= 0) {
      alert('Fill in valid cost amount.');
      return;
    }

    const currentWorker = workers.find(w => w.id === expWorker);
    const selectedCard = cards.find(c => c.id === expCard);

    const newExp: ExpensePurchase = {
      id: `exp-${Date.now()}`,
      jobId: selectedJobId,
      description: expDesc,
      amount: amountNum,
      category: expCategory,
      workerId: expWorker,
      workerName: currentWorker?.name || 'Administrator',
      cardUsedId: expCard || undefined,
      date: new Date().toLocaleDateString('en-CA'),
      receiptImage: expReceipt
    };

    if (selectedCard) {
      const updatedCards = cards.map(c => {
        if (c.id === selectedCard.id) {
          return { ...c, spent: c.spent + amountNum };
        }
        return c;
      });
      onUpdateCards(updatedCards);
    }

    onUpdateExpenses([newExp, ...expenses]);

    onSendNotification(
      'Budget Expense Record',
      `Expense recorded for "${selectedJob.address} — ${selectedJob.clientName}": $${amountNum} (${expCategory}).`,
      'expense',
      selectedJobId
    );

    setExpDesc('');
    setExpAmount('');
    setExpReceipt(undefined);
    setShowAddExpense(false);
  };

  // To-Do Item Actions: Add, Edit, Delete, Reorder, Toggle
  const handleAddToDo = () => {
    if (!newToDoText.trim() || !selectedJob) return;
    const newTask: SubJob = {
      id: `sub-${Date.now()}`,
      title: newToDoText.trim(),
      status: 'pending'
    };

    const updated = jobs.map(j => {
      if (j.id === selectedJob.id) {
        return { ...j, checklist: [...j.checklist, newTask] };
      }
      return j;
    });

    onUpdateJobs(updated);
    setNewToDoText('');
  };

  const handleSaveEditToDo = (taskId: string) => {
    if (!editingToDoText.trim() || !selectedJob) return;
    const updated = jobs.map(j => {
      if (j.id === selectedJob.id) {
        const updatedList = j.checklist.map(t => t.id === taskId ? { ...t, title: editingToDoText.trim() } : t);
        return { ...j, checklist: updatedList };
      }
      return j;
    });

    onUpdateJobs(updated);
    setEditingToDoId(null);
    setEditingToDoText('');
  };

  const handleDeleteToDo = (taskId: string) => {
    if (!selectedJob) return;
    const updated = jobs.map(j => {
      if (j.id === selectedJob.id) {
        return { ...j, checklist: j.checklist.filter(t => t.id !== taskId) };
      }
      return j;
    });
    onUpdateJobs(updated);
  };

  const handleMoveToDo = (index: number, direction: 'up' | 'down') => {
    if (!selectedJob) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedJob.checklist.length) return;

    const newChecklist = [...selectedJob.checklist];
    const temp = newChecklist[index];
    newChecklist[index] = newChecklist[targetIndex];
    newChecklist[targetIndex] = temp;

    const updated = jobs.map(j => {
      if (j.id === selectedJob.id) {
        return { ...j, checklist: newChecklist };
      }
      return j;
    });
    onUpdateJobs(updated);
  };

  const handleToggleSubJob = (jobId: string, subId: string) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        const itemCheck = j.checklist.map(item => {
          if (item.id === subId) {
            const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
            return { ...item, status: nextStatus as any };
          }
          return item;
        });
        return { ...j, checklist: itemCheck };
      }
      return j;
    });
    onUpdateJobs(updated);
  };

  // Handle Post Comment
  const handlePostComment = () => {
    if (!commentText.trim() || !selectedJob) return;
    const newComment = {
      id: `comment-${Date.now()}`,
      authorRole: userRole,
      authorName: userRole === 'manager' ? 'Site Manager' : (companySettings?.companyName || 'ABC Construction HQ'),
      text: commentText,
      createdAt: new Date().toISOString()
    };

    const updated = jobs.map(j => {
      if (j.id === selectedJob.id) {
        return { ...j, comments: [newComment, ...(j.comments || [])] };
      }
      return j;
    });
    onUpdateJobs(updated);
    setCommentText('');

    onSendNotification(
      'Job Feed Updated',
      `${userRole.toUpperCase()} posted an update on "${selectedJob.address} — ${selectedJob.clientName}"`,
      'comment',
      selectedJob.id
    );
  };

  // Complete/Change overall job status
  const handleSetJobStatus = (jobId: string, nextStatus: 'planning' | 'in-progress' | 'completed') => {
    const targetJob = jobs.find(j => j.id === jobId);
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return { 
          ...j, 
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? new Date().toISOString().split('T')[0] : j.completedAt
        };
      }
      return j;
    });
    onUpdateJobs(updated);
    
    onSendNotification(
      'Project Status Update',
      `"${targetJob?.address || 'Site'} — ${targetJob?.clientName}" is now [${nextStatus.toUpperCase()}]`,
      'system',
      jobId
    );
  };

  // Metrics
  const activeJobsCount = jobs.filter(j => j.status === 'in-progress' || j.status === 'planning').length;
  const completedJobsCount = jobs.filter(j => j.status === 'completed').length;
  const checkedInWorkersCount = workers.filter(w => w.isAtJob && !w.isIdle).length;
  const monthlyJobCount = completedJobsCount + 7; // Seed cycle of 31 days

  const totalOngoingValue = jobs
    .filter(j => j.status !== 'completed')
    .reduce((sum, j) => sum + (j.jobValue || 18500), 0);

  return (
    <div className="space-y-6">
      
      {/* 4 Summary Action Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Active Jobs (Clickable -> Opens Active Jobs list) */}
        <button
          id="admin-active-jobs-btn"
          onClick={() => setShowActiveJobsModal(true)}
          className="p-4 bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition text-left cursor-pointer group focus:outline-none"
        >
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Building className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
            Active Jobs
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {activeJobsCount} <span className="text-sm font-normal text-slate-400">/ {jobs.length}</span>
          </div>
          <p className="text-[11px] text-blue-400 font-bold mt-1 flex items-center gap-1">
            View active roster →
          </p>
        </button>
        
        {/* 2. Checked In / Active Employees (Clickable -> Opens Employee Management) */}
        <button
          id="admin-employee-mgmt-btn"
          onClick={() => setShowEmployeeManagementModal(true)}
          className="p-4 bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-2xl shadow-sm hover:shadow-md transition text-left cursor-pointer group focus:outline-none"
        >
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            Active Employees
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {checkedInWorkersCount} <span className="text-sm font-normal text-emerald-400">On Site</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-bold mt-1">
            Manage crew & check-ins →
          </p>
        </button>

        {/* 3. Monthly Job Count (Replaces Company Spending) */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Monthly Job Count
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {monthlyJobCount} <span className="text-sm font-normal text-slate-400">completed</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Current 31-day cycle</p>
        </div>

        {/* 4. Total Job Value (Clickable -> Opens TotalJobValueModal with 4 categories) */}
        <button
          id="admin-total-job-value-btn"
          onClick={() => setShowTotalJobValueModal(true)}
          className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-2xl shadow-sm hover:shadow-md transition text-left cursor-pointer group focus:outline-none"
        >
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <DollarSign className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            Total Job Value
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            ${totalOngoingValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-amber-400 font-bold mt-1">
            View Value & History →
          </p>
        </button>

      </div>

      {/* Navigation Sub-tabs Bar */}
      <div className="flex border-b border-slate-800 text-xs font-bold gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-4 tracking-tight transition-all rounded-t-xl cursor-pointer ${
            activeTab === 'overview' 
              ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-900/60 font-black' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Status
        </button>

        <button
          onClick={() => setActiveTab('dispatch')}
          className={`pb-2.5 px-4 tracking-tight transition-all rounded-t-xl cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'dispatch' 
              ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-900/60 font-black' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardHat className="w-3.5 h-3.5 text-amber-400" />
          Employee and Job Site Dispatch
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-2.5 px-4 tracking-tight transition-all rounded-t-xl cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'jobs' 
              ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-900/60 font-black' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          Jobs & Day Logs
        </button>

        {/* Finances & Budgets: STRICTLY COMPANY ONLY */}
        {userRole === 'company' && (
          <button
            onClick={() => setActiveTab('finances')}
            className={`pb-2.5 px-4 tracking-tight transition-all rounded-t-xl cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'finances' 
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-900/60 font-black' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Company Cards & Budgets
          </button>
        )}

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-2.5 px-4 tracking-tight transition-all rounded-t-xl cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'analytics' 
              ? 'text-purple-400 border-b-2 border-purple-500 bg-slate-900/60 font-black' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Reports & Analytics
        </button>
      </div>

      {/* ==================== TAB 1: OVERVIEW & STATUS ==================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Worker GPS Tracking blueprint (Clickable to open Dispatch & Map) */}
            <div 
              onClick={() => setActiveTab('dispatch')}
              className="p-5 bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-2xl space-y-4 shadow-sm cursor-pointer transition group"
              title="Click to open Employee and Job Site Dispatch & Live Google Maps"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 group-hover:text-amber-400 transition">
                    <MapPin className="w-5 h-5 text-blue-400 animate-pulse" />
                    Live Operations & Worker GPS Location
                  </h3>
                  <p className="text-xs text-slate-400">Real-time coordinates verification of field crews • Click to open dispatch & live map</p>
                </div>
                <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                  Open Dispatch Map →
                </span>
              </div>

              {/* Vector Blueprint Mock Map */}
              <div className="h-72 w-full rounded-xl border border-slate-800 relative overflow-hidden bg-slate-950 flex items-center justify-center p-4 shadow-inner">
                <svg className="absolute inset-0 w-full h-full opacity-20 stroke-blue-500" strokeWidth="1" fill="none">
                  <defs>
                    <pattern id="grid-dark" width="40" height="40" patternUnits="userSpaceOnUse">
                      <rect width="40" height="40" fill="none" />
                      <path d="M 40 0 L 0 0 0 40" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-dark)" />
                  <circle cx="300" cy="150" r="100" />
                  <path d="M0 100 L 600 300 M 0 250 L 600 50" />
                </svg>

                {/* Simulated Regions */}
                <div className="absolute inset-x-8 top-12 bottom-12 border border-slate-800 rounded-xl flex items-center justify-around text-[10px] text-slate-500 font-mono pointer-events-none">
                  <span>Golden Gate Area</span>
                  <span>Financial District</span>
                  <span>Mission Base</span>
                </div>

                {/* Live Worker pins displayed on Map */}
                {workers.map((w, idx) => {
                  const mapCoordinates = [
                    { x: '35%', y: '40%' },
                    { x: '65%', y: '25%' },
                    { x: '50%', y: '70%' },
                  ];
                  const coord = mapCoordinates[idx] || { x: '50%', y: '50%' };

                  return (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWorkerId(w.id)}
                      className="absolute group cursor-pointer transition transform hover:scale-110 flex flex-col items-center"
                      style={{ left: coord.x, top: coord.y }}
                    >
                      <div className="relative">
                        {w.isAtJob && !w.isIdle && (
                          <span className="absolute -inset-1.5 rounded-full bg-emerald-500/40 animate-ping" />
                        )}
                        <img 
                          src={w.avatar} 
                          alt={w.name} 
                          className={`w-10 h-10 rounded-full border-2 object-cover relative bg-slate-800 ${
                            w.isAtJob && !w.isIdle ? 'border-emerald-400' : 'border-slate-600'
                          }`}
                        />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                          w.isAtJob && !w.isIdle ? 'bg-emerald-400' : 'bg-slate-500'
                        }`} />
                      </div>
                      <div className="mt-1 bg-slate-950 text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow-md whitespace-nowrap border border-slate-800">
                        {w.name}
                      </div>
                    </button>
                  );
                })}

                <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 font-mono space-y-1 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> At Active Site (Checked In)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Idle / Off Clock
                  </div>
                </div>
              </div>
            </div>

            {/* Check-in Logs & Alerts */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Latest Site Check-In Logs & Alerts
              </h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onNotificationClick?.(n)}
                    className="p-3 bg-slate-950 hover:bg-slate-900/90 rounded-xl border border-slate-800 hover:border-blue-500/50 flex items-start justify-between text-xs cursor-pointer transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          n.type === 'check-in' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          n.type === 'completion' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {n.type.toUpperCase()}
                        </span>
                        <span className="font-bold text-white group-hover:text-blue-300 transition-colors">{n.title}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-blue-400 font-mono font-semibold flex items-center gap-1 pt-0.5 opacity-80 group-hover:opacity-100">
                        View destination &rarr;
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Crew Member Roster side panel */}
          <div className="space-y-6">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white">Crew Member Details</h3>
                  <p className="text-xs text-slate-400">Click a member to audit assignments</p>
                </div>
                <button
                  onClick={() => setShowEmployeeManagementModal(true)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition text-xs flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Manage
                </button>
              </div>

              <div className="space-y-3">
                {workers.map((w) => {
                  const isSelected = selectedWorkerId === w.id;
                  const assignedJobs = jobs.filter(j => j.assignedWorkers.includes(w.id));

                  return (
                    <div 
                      key={w.id}
                      onClick={() => setSelectedWorkerId(isSelected ? null : w.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-950/60 border-blue-500 shadow-sm' 
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={w.avatar} alt={w.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white text-xs">{w.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                              w.isAtJob && !w.isIdle 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {w.isAtJob && !w.isIdle ? 'ON SITE' : 'IDLE'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{w.position}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Phone:</span>
                              <span className="text-white">{w.phone || '+1 (555) 019-2831'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Address:</span>
                              <span className="text-white truncate max-w-[150px]">{w.address || 'San Francisco, CA'}</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-400 font-bold block mb-1">Allocated Jobs:</span>
                            {assignedJobs.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic">No current assignments.</p>
                            ) : (
                              <div className="space-y-1">
                                {assignedJobs.map(j => (
                                  <div 
                                    key={j.id} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenJobModal(j);
                                    }}
                                    className="p-1.5 bg-slate-900 border border-slate-800 hover:border-blue-500 rounded text-xs text-white flex justify-between items-center cursor-pointer transition group/job"
                                    title="Click to open job details in modal"
                                  >
                                    <span className="truncate max-w-[160px] font-medium group-hover/job:text-blue-400 underline decoration-dotted">{j.address} — {j.clientName}</span>
                                    <span className="text-[9px] font-mono text-emerald-400 font-bold">ACTIVE</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB: GOOGLE MAPS DISPATCH ==================== */}
      {/* ==================== TAB: EMPLOYEE AND JOB SITE DISPATCH ==================== */}
      {activeTab === 'dispatch' && (
        <EmployeeDispatchHub
          jobs={jobs}
          workers={workers}
          companySettings={companySettings || { companyName: 'Apex Structural Builders LLC', phone: '', email: '' }}
          activeRole={userRole}
          onUpdateJobs={onUpdateJobs}
          onUpdateWorkers={onUpdateWorkers || (() => {})}
          onUpdateCompanySettings={() => {}}
          onSelectJob={(id) => {
            setSelectedJobId(id);
            const target = jobs.find(j => j.id === id);
            if (target) handleOpenJobModal(target);
          }}
          onSendNotification={onSendNotification}
        />
      )}

      {/* ==================== TAB 2: JOBS & INSPECTIONS HUB ==================== */}
      {activeTab === 'jobs' && (
        <AdminJobsHub
          jobs={jobs}
          workers={workers}
          onSelectJob={handleOpenJobModal}
          onOpenAddJob={() => setShowAddJobModal(true)}
          companySettings={companySettings}
          userRole={userRole}
        />
      )}

      {/* ==================== TAB: FINANCES (COMPANY ONLY) ==================== */}
      {activeTab === 'finances' && userRole === 'company' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Company Cards Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase font-mono tracking-wider">
              Company Credit Cards
            </h3>

            <div className="space-y-3">
              {cards.map((card) => {
                const percentage = Math.min(100, Math.round((card.spent / card.limit) * 100));

                return (
                  <div key={card.id} className={`${card.color} p-5 rounded-2xl shadow-xl border border-white/10 space-y-4 text-white`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-300">Corporate Card</span>
                        <h4 className="font-bold text-sm text-white">{card.cardHolder}</h4>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-black/40 rounded border border-white/20">{card.cardType}</span>
                    </div>

                    <div className="font-mono text-base tracking-wider">{card.cardNumber}</div>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs my-1 font-mono text-slate-200">
                        <span>Used: ${card.spent.toLocaleString()}</span>
                        <span>Limit: ${card.limit.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            percentage > 85 ? 'bg-rose-500' : percentage > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expenses & Purchases */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase font-mono tracking-wider">
                Materials & Budget Transactions
              </h3>
              <button
                onClick={() => setShowAddExpense(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Record Expense
              </button>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2">Authorized By</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-850 transition">
                        <td className="py-2.5 text-slate-400">{exp.date}</td>
                        <td className="py-2.5 font-bold text-amber-400">{exp.category}</td>
                        <td className="py-2.5 text-white font-sans">{exp.description}</td>
                        <td className="py-2.5 text-slate-300 font-sans">{exp.workerName}</td>
                        <td className="py-2.5 text-right font-black text-emerald-400">${exp.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB: REPORTS & ANALYTICS ==================== */}
      {activeTab === 'analytics' && (
        <ReportingAnalytics
          jobs={jobs}
          expenses={expenses}
          workers={workers}
          notifications={notifications}
          userRole={userRole}
          onSelectJob={handleOpenJobModal}
        />
      )}

      {/* ==================== MODALS ==================== */}
      
      {/* 1. Active Jobs Roster Modal */}
      {showActiveJobsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-400" /> Active Jobs Roster
              </h3>
              <button onClick={() => setShowActiveJobsModal(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              {jobs.map(j => (
                <div 
                  key={j.id} 
                  onClick={() => {
                    setShowActiveJobsModal(false);
                    handleOpenJobModal(j);
                  }}
                  className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl flex justify-between items-center cursor-pointer transition"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{j.address} — {j.clientName}</h4>
                    <p className="text-xs text-slate-400">{j.title}</p>
                    <span className="text-[10px] font-mono text-emerald-400">{renderColoredJobDate(j.startDate)} → {renderColoredJobDate(j.endDate)}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-xs font-bold">
                    {j.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Total Job Value & History Modal */}
      <TotalJobValueModal
        isOpen={showTotalJobValueModal}
        onClose={() => setShowTotalJobValueModal(false)}
        jobs={jobs}
        userRole={userRole}
        onSelectJob={(id) => {
          setSelectedJobId(id);
          const found = jobs.find(j => j.id === id);
          if (found) handleOpenJobModal(found);
        }}
      />

      {/* 3. Employee Management Modal */}
      <EmployeeManagementModal
        isOpen={showEmployeeManagementModal}
        onClose={() => setShowEmployeeManagementModal(false)}
        workers={workers}
        jobs={jobs}
        onUpdateWorkers={onUpdateWorkers || (() => {})}
        onUpdateJobs={onUpdateJobs}
        onSendInvite={onSendInvite || (() => {})}
        onSendNotification={onSendNotification}
        userRole={userRole}
      />

      {/* 4. Before & After Photo Gallery Modal */}
      {showBeforeAfterModal && (
        <BeforeAfterModal
          isOpen={showBeforeAfterModal}
          onClose={() => setShowBeforeAfterModal(false)}
          job={selectedJob}
          onUpdateJob={(updatedJob) => {
            const nextJobs = jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
            onUpdateJobs(nextJobs);
          }}
          userRole={userRole}
        />
      )}

      {/* 5. Book New Job Modal */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-black text-white">Book New Project Dispatch</h3>
              <button onClick={() => setShowAddJobModal(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveJob} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newJobClient}
                    onChange={(e) => setNewJobClient(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Job Address *</label>
                  <input
                    type="text"
                    required
                    value={newJobAddress}
                    onChange={(e) => setNewJobAddress(e.target.value)}
                    placeholder="e.g. 425 Grandview Dr, San Francisco"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Project Title</label>
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="e.g. Kitchen Remodel & Custom Cabinetry"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Job Description</label>
                <textarea
                  rows={2}
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  placeholder="Complete project scope and specifications..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newJobStart}
                    onChange={(e) => setNewJobStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Start Time</label>
                  <input
                    type="time"
                    value={newJobStartTime}
                    onChange={(e) => setNewJobStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">End Time</label>
                  <input
                    type="time"
                    value={newJobEndTime}
                    onChange={(e) => setNewJobEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">End Date</label>
                  <input
                    type="date"
                    value={newJobEnd}
                    onChange={(e) => setNewJobEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Estimated Duration</label>
                  <input
                    type="text"
                    value={newJobEstimatedDuration}
                    onChange={(e) => setNewJobEstimatedDuration(e.target.value)}
                    placeholder="e.g. 3 Weeks"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Assign Workers with instant conflict validation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Assign Employees</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {newJobWorkers.length} selected
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {workers.map((w) => {
                    const isSelected = newJobWorkers.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewJobWorkers(newJobWorkers.filter(id => id !== w.id));
                          } else {
                            setNewJobWorkers([...newJobWorkers, w.id]);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left text-xs transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-blue-950 border-blue-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <img src={w.avatar} alt={w.name} className="w-6 h-6 rounded-full object-cover" />
                        <span className="truncate text-[11px]">{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Initial Job To-Do Tasks (One per line)</label>
                <textarea
                  rows={3}
                  value={newJobChecklist}
                  onChange={(e) => setNewJobChecklist(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow cursor-pointer"
                >
                  Create & Book Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Record Expense Modal (Company only) */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-black text-white">Record Material Expense</h3>
              <button onClick={() => setShowAddExpense(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Description</label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="e.g. Red Oak Cabinet Boards & Fasteners"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="345.50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e: any) => setExpCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="Materials">Materials</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Tools">Tools</option>
                    <option value="Permits">Permits</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Travel Time Conflict Modal */}
      {activeConflictForSchedule && (
        <TravelTimeConflictModal
          isOpen={Boolean(activeConflictForSchedule)}
          onClose={() => setActiveConflictForSchedule(null)}
          conflict={activeConflictForSchedule}
          workers={workers}
          onAdjustTime={(newStart) => {
            setNewJobStartTime(newStart);
            finalizeJobCreation(newStart);
          }}
          onContinueAnyway={() => {
            finalizeJobCreation();
          }}
          onOpenReassignWorker={(workerId) => {
            setActiveConflictForSchedule(null);
            setNewJobWorkers(newJobWorkers.filter((id) => id !== workerId));
          }}
        />
      )}

      {/* 8. Global Universal Job Detail Popup Modal */}
      {modalJob && (
        <UniversalJobDetailModal
          isOpen={Boolean(modalJob)}
          job={modalJob}
          onClose={() => setModalJob(null)}
          userRole={userRole}
          workers={workers}
          onUpdateJobs={onUpdateJobs}
          onSendNotification={onSendNotification}
          onOpenInspectionWorkspace={(job) => {
            setModalJob(null);
            setInspectionModalJob(job);
          }}
          onOpenMessage={() => {
            if (onOpenMessages) onOpenMessages();
          }}
        />
      )}

      {/* 9. Global Inspection Workspace Modal */}
      {inspectionModalJob && (
        <InspectionWorkspaceModal
          isOpen={Boolean(inspectionModalJob)}
          job={inspectionModalJob}
          userRole={userRole}
          workers={workers}
          onClose={() => setInspectionModalJob(null)}
          onUpdateJobs={onUpdateJobs}
          onSendNotification={onSendNotification}
        />
      )}

    </div>
  );
}
