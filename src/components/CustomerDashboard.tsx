import React, { useState, useEffect } from 'react';
import { Job, WorkerProfile, ExpensePurchase, CustomerReview, BeforeAfterPhoto, AppNotification, JobComment } from '../types';
import { BUILDER_COMPANIES, CompanyProfile } from '../data/companiesData';
import { formatMDY, renderColoredJobDate, renderColoredDayLogDate } from '../utils/dateFormatter';
import BeforeAfterModal from './BeforeAfterModal';
import { UniversalJobDetailModal } from './UniversalJobDetailModal';
import { InspectionWorkspaceModal } from './InspectionWorkspaceModal';
import { stripeService } from '../services/stripeService';
import { 
  Home, MapPin, CheckCircle, Clock, Star, 
  MessageSquare, Sparkles, DollarSign, ListTodo, 
  Camera, ChevronRight, ChevronLeft, FileText, Palette, Bell,
  Building, Plus, Lock, Check, Send, AlertCircle, 
  FolderOpen, Settings, Phone, Mail, FileCheck, Share2, Eye,
  ZoomIn, X, Maximize2, AlertTriangle, ShieldAlert, CreditCard,
  CheckSquare, Zap, RefreshCw
} from 'lucide-react';

export const JOB_CATEGORIES = [
  'General Construction',
  'Home Inspection',
  'General Handyman Services',
  'Renovation / Remodeling',
  'Framing',
  'Foundation Repair',
  'Roofing',
  'Siding',
  'Deck Construction',
  'Fence Installation',
  'Window Installation',
  'Door Installation',
  'Concrete Work',
  'Electrical Repair',
  'Electrical Installation',
  'Panel Upgrade',
  'Lighting Installation',
  'Outlet / Wiring Work',
  'Plumbing Repair',
  'Plumbing Installation',
  'Pipe Replacement',
  'Water Heater Installation',
  'Drain Cleaning',
  'HVAC Repair',
  'HVAC Installation',
  'HVAC Maintenance',
  'Ductwork Service',
  'Thermostat Installation',
  'Drywall Installation / Repair',
  'Painting (Interior)',
  'Flooring Installation',
  'Tile Installation',
  'Carpentry',
  'Insulation',
  'Appliance Installation',
  'Landscaping',
  'Gutter Installation / Cleaning',
  'Driveway Repair',
  'Exterior Painting',
  'Tree Removal / Trimming',
  'Pest Control/Mitigation/Repairs',
  'Mold/Mildew/Growth Treatment',
  'Crawl Space repairs',
  'Crawl Space Mitigation',
  'Crawl Space Inspection',
  'Other'
];

interface CustomerDashboardProps {
  jobs: Job[];
  workers: WorkerProfile[];
  expenses: ExpensePurchase[];
  notifications: AppNotification[];
  onUpdateJobs: (updatedJobs: Job[]) => void;
  onAnnotatePhoto: (jobId: string, photoId: string, isBefore: boolean) => void;
  onSendNotification: (title: string, message: string, type: any, jobId?: string) => void;
  targetJobId?: string | null;
  targetView?: 'confirm_completion' | 'messages' | 'bids' | 'adjustments' | null;
  onClearTarget?: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

export default function CustomerDashboard({
  jobs,
  workers,
  expenses,
  notifications,
  onUpdateJobs,
  onAnnotatePhoto,
  onSendNotification,
  targetJobId,
  targetView,
  onClearTarget,
  onNotificationClick
}: CustomerDashboardProps) {
  // Main Navigation tab section
  const [activeTab, setActiveTab] = useState<'profile' | 'browse_companies' | 'post_open_work' | 'my_requests'>('my_requests');
  
  // Outer profile / Client Information states
  const [clientName, setClientName] = useState('Sarah Jenkins');
  const [clientEmail, setClientEmail] = useState('DevinJJenkins90@gmail.com');
  const [clientPhone, setClientPhone] = useState('(415) 555-0199');
  const [clientAddress, setClientAddress] = useState('425 Grandview Dr, San Francisco');
  const [preferredContact, setPreferredContact] = useState<'In-App' | 'SMS' | 'Call' | 'Email'>('In-App');
  const [showProfileEditToast, setShowProfileEditToast] = useState(false);
  const [showAgentSettingsModal, setShowAgentSettingsModal] = useState(false);

  // Browse Companies states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [inspectionDate, setInspectionDate] = useState('2026-06-25');
  const [inspectionTime, setInspectionTime] = useState('10:00');
  const [inspectBookingMessage, setInspectBookingMessage] = useState('');

  // Post Open Work Form states
  const [openWorkCategory, setOpenWorkCategory] = useState('General Construction');
  const [openWorkDesc, setOpenWorkDesc] = useState('');
  const [openWorkLocation, setOpenWorkLocation] = useState('425 Grandview Dr, SF');
  const [openWorkTimeline, setOpenWorkTimeline] = useState('3 days');
  const [scopeAgreement, setScopeAgreement] = useState(false);
  const [openWorkSuccess, setOpenWorkSuccess] = useState(false);

  // Sub-tabs state inside Option 3 (Job panel context)
  const [jobSubTab, setJobSubTab] = useState<'progress' | 'messages' | 'estimates' | 'services' | 'documents'>('progress');

  // Messaging sub-tab states
  const [chatMessage, setChatMessage] = useState('');
  const [isCrewReplying, setIsCrewReplying] = useState(false);

  // Estimates negotiation states
  const [counterPriceInput, setCounterPriceInput] = useState('');
  const [counterNotesInput, setCounterNotesInput] = useState('');
  const [showCounterModal, setShowCounterModal] = useState(false);

  // File uploading states in Documents sub-tab
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [uploadedDocBase64, setUploadedDocBase64] = useState<string | undefined>(undefined);
  const [docList, setDocList] = useState<{ name: string; date: string; category: string }[]>([
    { name: 'Kitchen Floor Timber Blueprint.dwg', date: '2026-06-18', category: 'Blueprint Plans' },
    { name: 'Homeowners Insurance Declaration.pdf', date: '2026-06-20', category: 'Compliance' },
    { name: 'ProSite Safety Framework Certificate.pdf', date: '2026-06-21', category: 'Permits' }
  ]);

  // Ratings for completed review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // 24-Hour Review Window & Options Modals
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAdditionalServicesModal, setShowAdditionalServicesModal] = useState(false);
  const [showReportProblemModal, setShowReportProblemModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Additional services form inputs
  const [extraServiceTitle, setExtraServiceTitle] = useState('');
  const [extraServiceDesc, setExtraServiceDesc] = useState('');
  const [extraServiceBudget, setExtraServiceBudget] = useState('');

  // Report problem form inputs
  const [problemCategory, setProblemCategory] = useState('Unfinished To-Do tasks');
  const [problemDescription, setProblemDescription] = useState('');

  // Live timer tick for 24-hour review countdown
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Filtering Sarah's jobs
  const myCompletedJobs = jobs.filter(j => j.clientEmail === clientEmail && j.status === 'completed');
  const myActiveJobs = jobs.filter(j => j.clientEmail === clientEmail && j.status !== 'completed');

  // Currently selected Job state
  const [activeJobId, setActiveJobId] = useState<string>('');
  const [showBeforeAfterModal, setShowBeforeAfterModal] = useState(false);

  // Global Popup Modals (Rule 35: ANY clickable job MUST open in a popup/modal)
  const [modalJob, setModalJob] = useState<Job | null>(null);
  const [inspectionModalJob, setInspectionModalJob] = useState<Job | null>(null);

  const handleOpenJobModal = (job: Job) => {
    setActiveJobId(job.id);
    if (job.inspectionStatus || job.inspectionRequest || job.title.toLowerCase().includes('inspection')) {
      setInspectionModalJob(job);
    } else {
      setModalJob(job);
    }
  };

  // Enlarged Lightbox Photo Viewer state
  const [enlargedLightbox, setEnlargedLightbox] = useState<{
    images: { url: string; label: string; caption?: string }[];
    currentIndex: number;
    title: string;
  } | null>(null);

  // Keyboard navigation for enlarged lightbox
  useEffect(() => {
    if (!enlargedLightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEnlargedLightbox(null);
      } else if (e.key === 'ArrowLeft') {
        setEnlargedLightbox(prev => {
          if (!prev) return null;
          const newIdx = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1;
          return { ...prev, currentIndex: newIdx };
        });
      } else if (e.key === 'ArrowRight') {
        setEnlargedLightbox(prev => {
          if (!prev) return null;
          const newIdx = prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0;
          return { ...prev, currentIndex: newIdx };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enlargedLightbox]);

  // Set default job if empty
  useEffect(() => {
    if (!activeJobId) {
      const defaultJob = myActiveJobs[0] || myCompletedJobs[0];
      if (defaultJob) {
        setActiveJobId(defaultJob.id);
      }
    }
  }, [jobs, activeJobId, myActiveJobs, myCompletedJobs]);

  // Deep-linking navigation from clicked notifications
  useEffect(() => {
    if (targetJobId) {
      setActiveJobId(targetJobId);
      const targetJob = jobs.find(j => j.id === targetJobId);
      if (targetJob) {
        handleOpenJobModal(targetJob);
      }
      if (targetView === 'confirm_completion') {
        setActiveTab('my_requests');
        setShowReviewModal(true);
        const targetJob = jobs.find(j => j.id === targetJobId);
        if (targetJob && targetJob.customerConfirmationStatus !== 'customer_confirmed') {
          if (targetJob.customerConfirmationStatus !== 'pending_confirmation') {
            const updated = jobs.map(j => j.id === targetJobId ? {
              ...j,
              customerConfirmationStatus: 'pending_confirmation' as const,
              workerAllTasksCompleted: true,
              workerCompletedAt: j.workerCompletedAt || new Date().toISOString()
            } : j);
            onUpdateJobs(updated);
          }
        }
        setTimeout(() => {
          const el = document.getElementById('customer-job-completion-confirm-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else if (targetView === 'adjustments') {
        setActiveTab('my_requests');
        setShowAdditionalServicesModal(true);
      } else if (targetView === 'bids') {
        setActiveTab('my_requests');
        setJobSubTab('estimates');
      } else if (targetView === 'messages') {
        setActiveTab('my_requests');
        setJobSubTab('messages');
      } else {
        setActiveTab('my_requests');
      }
      onClearTarget?.();
    }
  }, [targetJobId, targetView]);

  const currentJob = jobs.find(j => j.id === activeJobId) || myActiveJobs[0] || myCompletedJobs[0];

  // Grouped Job lists depending on operational state
  const myPendingInspections = jobs.filter(
    j => j.clientEmail === clientEmail && j.title.toLowerCase().includes('inspection') && j.status !== 'completed'
  );
  
  const myInspectionHistory = jobs.filter(
    j => j.clientEmail === clientEmail && j.title.toLowerCase().includes('inspection') && j.status === 'completed'
  );

  const myEstJobs = jobs.filter(
    j => j.clientEmail === clientEmail && j.status === 'planning' && !j.title.toLowerCase().includes('inspection')
  );

  // Fetch company info for the selected builders
  const selectedCompany = BUILDER_COMPANIES.find(c => c.id === selectedCompanyId);

  // Check if customer has a completed inspection with a specific company
  const hasCompletedInspection = (companyName: string) => {
    return jobs.some(
      j => j.clientEmail === clientEmail && 
           j.title.toLowerCase().includes('inspection') && 
           j.title.toLowerCase().includes(companyName.toLowerCase()) && 
           j.status === 'completed'
    );
  };

  // Profile save action
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setShowProfileEditToast(true);
    setTimeout(() => setShowProfileEditToast(false), 3500);

    onSendNotification(
      'Profile Metadata Updated',
      `Sarah Jenkins saved client coordinates contact preferences successfully.`,
      'system'
    );
  };

  // Convert estimate timeline to days array
  const getJobDaysArray = (job: Job) => {
    if (!job) return [];
    const start = new Date(job.startDate + 'T00:00:00');
    const end = new Date(job.endDate + 'T00:00:00');
    const days: string[] = [];

    const timeDiff = end.getTime() - start.getTime();
    const daySpan = Math.min(30, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);

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

  // Helper: Calculate remaining time in 24-hour review window
  const getRemainingReviewTime = (job: Job) => {
    if (!job.customerConfirmationWindowExpiresAt) return null;
    const expiresMs = new Date(job.customerConfirmationWindowExpiresAt).getTime();
    const diff = expiresMs - currentTimeMs;
    if (diff <= 0) return { hours: 0, minutes: 0, expired: true, text: '0h 0m' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, expired: false, text: `${hours}h ${minutes}m` };
  };

  // Option 1: Confirm All Tasks Completed & Release Escrow Payment (100% to company)
  const handleConfirmJobComplete = async (jobId: string, rating: number, comment: string) => {
    setIsProcessingPayment(true);
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) {
      setIsProcessingPayment(false);
      return;
    }

    try {
      // Release payment to company (100% to company, $0 platform fee)
      await stripeService.releaseJobPaymentToCompany(
        targetJob.id,
        targetJob.companyId || 'comp-1',
        targetJob.jobValue || 18500
      );
    } catch (err) {
      console.warn('Payment release warning:', err);
    }

    const now = new Date().toISOString();
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          status: 'completed' as const,
          completedAt: new Date().toLocaleDateString('en-CA'),
          customerConfirmationStatus: 'customer_confirmed' as const,
          customerConfirmationResolvedAt: now,
          isJobLockedAfterCompletion: true,
          paymentStatus: 'released' as const,
          paymentReleasedAt: now,
          review: {
            rating,
            comment: comment || 'Work verified and approved. Exceptional craftsmanship!',
            createdAt: now
          },
          comments: [
            ...(j.comments || []),
            {
              id: `c-conf-${Date.now()}`,
              authorRole: 'client' as const,
              authorName: `${clientName} (Homeowner)`,
              text: `✅ Verified All Tasks Completed! Rated: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}. "${comment || 'Exceptional craftsmanship!'}"`,
              createdAt: now
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs(updated);
    setIsProcessingPayment(false);
    setShowReviewModal(false);

    onSendNotification(
      '🎉 Job Verified & Payment Released',
      `${clientName} approved completion for "${targetJob.address} — ${targetJob.clientName}". Rated ${rating}/5 stars. 100% of payment released to company ($0 platform cut).`,
      'system',
      targetJob.id
    );
  };

  // Option 2: Request Additional Services Needed (Pauses 24-Hour Clock)
  const handleRequestAdditionalServices = (jobId: string) => {
    if (!extraServiceTitle.trim() || !extraServiceDesc.trim()) {
      alert('Please enter a title and description of the additional services needed.');
      return;
    }

    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) return;

    const now = new Date().toISOString();
    const newServiceReq: any = {
      id: `svc-req-${Date.now()}`,
      title: extraServiceTitle,
      description: extraServiceTitle,
      details: extraServiceDesc,
      requestedAt: now,
      createdAt: now,
      status: 'pending_company_quote',
      estimatedBudget: extraServiceBudget ? parseFloat(extraServiceBudget) : undefined
    };

    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          customerConfirmationStatus: 'additional_services_requested' as const,
          customerConfirmationResolvedAt: now,
          additionalServicesRequests: [...(j.additionalServicesRequests || []), newServiceReq],
          comments: [
            ...(j.comments || []),
            {
              id: `c-svc-${Date.now()}`,
              authorRole: 'client' as const,
              authorName: `${clientName} (Homeowner)`,
              text: `💬 Additional Services Requested: "${extraServiceTitle}". ${extraServiceDesc} (24-Hour Review Window Paused)`,
              createdAt: now
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs(updated);
    setShowAdditionalServicesModal(false);
    setExtraServiceTitle('');
    setExtraServiceDesc('');
    setExtraServiceBudget('');
    setJobSubTab('services'); // Automatically switch to Scope Changes tab

    onSendNotification(
      '💬 Additional Services Requested',
      `${clientName} requested extra scope for "${targetJob.title}". 24-hour review clock paused.`,
      'system',
      targetJob.id
    );
  };

  // Option 3: Report Problem / Incomplete Work (Pauses 24-Hour Clock Immediately)
  const handleReportProblem = (jobId: string) => {
    if (!problemDescription.trim()) {
      alert('Please describe the issue or unfinished items in detail.');
      return;
    }

    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) return;

    const now = new Date().toISOString();
    const problemRecord: any = {
      id: `prob-${Date.now()}`,
      category: problemCategory,
      description: problemDescription,
      status: 'open',
      reportedAt: now,
      resolved: false,
      attemptCount: 1
    };

    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          customerConfirmationStatus: 'problem_reported' as const,
          customerConfirmationResolvedAt: now,
          reportedProblem: problemRecord,
          comments: [
            ...(j.comments || []),
            {
              id: `c-prob-${Date.now()}`,
              authorRole: 'client' as const,
              authorName: `${clientName} (Homeowner)`,
              text: `⚠️ Problem Reported: [${problemCategory}] ${problemDescription}. (24-Hour Review Window Paused)`,
              createdAt: now
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs(updated);
    setShowReportProblemModal(false);
    setProblemDescription('');
    setJobSubTab('messages'); // Open direct chat to coordinate

    onSendNotification(
      '⚠️ Site Issue Reported by Customer',
      `${clientName} reported an issue on "${targetJob.address} — ${targetJob.clientName}": [${problemCategory}]. 24-hour review clock paused.`,
      'alert',
      targetJob.id
    );
  };

  // Simulate 24-Hour Expiration (Auto-completion & Release Payment)
  const handleSimulate24HourExpiration = async (jobId: string) => {
    setIsProcessingPayment(true);
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) {
      setIsProcessingPayment(false);
      return;
    }

    try {
      await stripeService.releaseJobPaymentToCompany(
        targetJob.id,
        targetJob.companyId || 'comp-1',
        targetJob.jobValue || 18500
      );
    } catch (e) {
      console.warn('Simulation release warning:', e);
    }

    const now = new Date().toISOString();
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          status: 'completed' as const,
          completedAt: new Date().toLocaleDateString('en-CA'),
          customerConfirmationStatus: 'auto_finalized' as const,
          customerConfirmationResolvedAt: now,
          isJobLockedAfterCompletion: true,
          paymentStatus: 'released' as const,
          paymentReleasedAt: now,
          comments: [
            ...(j.comments || []),
            {
              id: `c-autofin-${Date.now()}`,
              authorRole: 'admin' as const,
              authorName: 'System Audit',
              text: `⚡ 24-Hour Review Window expired without dispute. Job marked completed and payment released automatically ($0 platform cut).`,
              createdAt: now
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs(updated);
    setIsProcessingPayment(false);

    onSendNotification(
      '⚡ Job Auto-Finalized (24-Hr Expiration)',
      `The 24-hour customer review window expired for "${targetJob.address} — ${targetJob.clientName}". Job marked complete and payment released automatically.`,
      'system',
      targetJob.id
    );
  };

  // Resume 24-Hour Review Window if previously paused
  const handleResumeReviewWindow = (jobId: string) => {
    const expiresIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const now = new Date().toISOString();
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          customerConfirmationStatus: 'pending_confirmation' as const,
          customerConfirmationWindowExpiresAt: expiresIso,
          comments: [
            ...(j.comments || []),
            {
              id: `c-res-${Date.now()}`,
              authorRole: 'client' as const,
              authorName: `${clientName} (Homeowner)`,
              text: `🔄 24-Hour Review Window resumed. Countdown reset to 24 hours.`,
              createdAt: now
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs(updated);
    onSendNotification(
      '🔄 24-Hour Review Window Resumed',
      `Customer resumed the 24-hour review period for job #${jobId}.`,
      'system',
      jobId
    );
  };

  // Handle booking an inspection (Option 1)
  const handleBookInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    const inspectionFee = selectedCompany.inspectionFee;
    const inspectJobId = `inspect-job-${Date.now()}`;

    // Authorize payment via Stripe (100% to company, $0 platform fee)
    stripeService.authorizeInspectionFee({
      customerEmail: clientEmail,
      customerName: clientName,
      companyId: selectedCompany.id,
      companyName: selectedCompany.name,
      inspectionId: `ins-${Date.now()}`,
      jobId: inspectJobId,
      feeAmount: inspectionFee,
      paymentMethodId: 'pm_1Nv459821809214'
    }).catch(err => console.warn('Stripe inspection authorization warning:', err));

    // Create inspection "Job" to hold state persistently
    const inspectJob: Job = {
      id: inspectJobId,
      title: `Site Inspection by ${selectedCompany.name}`,
      clientName: clientName,
      clientEmail: clientEmail,
      address: clientAddress,
      description: `Structural site evaluation requested on ${inspectionDate} at ${inspectionTime}. Notes: "${inspectBookingMessage || 'None.'}"`,
      startDate: inspectionDate,
      endDate: inspectionDate,
      status: 'planning', // Uncompleted
      assignedWorkers: ['w3'], // Default assign Devin Jenkins
      checklist: [
        { id: `ins-chk-1`, title: 'Analyze subfloor moisture levels', status: 'pending' },
        { id: `ins-chk-2`, title: 'Verify framing structural ledger load limits', status: 'pending' }
      ],
      beforeAfterPhotos: [],
      workDayLogs: {},
      comments: [
        {
          id: `ins-c-1`,
          authorRole: 'admin',
          authorName: `${selectedCompany.name} Dispatch`,
          text: `Booking requested! Inspection fee $${inspectionFee} authorized via Stripe (100% directly to company, $0 platform fee). Assigned Devin Jenkins.`,
          createdAt: new Date().toISOString()
        }
      ],
      inspectionDate,
      inspectionTime,
      inspectionFee,
      companyId: selectedCompany.id,
      companyName: selectedCompany.name,
      inspectionStatus: 'proposed',
      paymentAmount: inspectionFee,
      paymentStatus: 'authorized'
    };

    onUpdateJobs([inspectJob, ...jobs]);
    setActiveJobId(inspectJob.id);
    setInspectBookingMessage('');
    setSelectedCompanyId(null);
    setActiveTab('my_requests');
    setJobSubTab('progress');

    onSendNotification(
      '📝 Site Inspection Booked & Authorized',
      `Sarah booked an Inspection with ${selectedCompany.name} on ${inspectionDate} for $${inspectionFee}. 100% goes directly to company ($0 platform cut).`,
      'system',
      inspectJob.id
    );
  };

  // Option 2: Submit Open Work Campaign
  const handlePostOpenWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopeAgreement) {
      alert('You must accept the Scope Accuracy Agreement checkbox to proceed!');
      return;
    }

    // Spawn open work project with bids
    const openJobId = `job-open-${Date.now()}`;
    const openJob: Job = {
      id: openJobId,
      title: `[OPEN WORK] ${openWorkCategory}`,
      clientName: clientName,
      clientEmail: clientEmail,
      address: openWorkLocation,
      description: openWorkDesc,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 3*24*3600*1000).toISOString().split('T')[0], // 3 days timeline
      status: 'planning',
      assignedWorkers: [],
      isOpenWork: true,
      scopeAccuracyAgreement: true,
      checklist: [
        { id: `open-sub-1`, title: 'Formulate structural plan outline', status: 'pending' },
        { id: `open-sub-2`, title: 'Anchor basic ledger framing studs', status: 'pending' }
      ],
      beforeAfterPhotos: [],
      workDayLogs: {},
      comments: [],
      bids: [
        {
          id: `bid-${Date.now()}-1`,
          companyName: 'ProSite Contractors',
          companyRating: 4.9,
          amount: 3500,
          proposedDurationDays: 3,
          message: 'Sarah, we reviewed your posted backyard photos and descriptions. We can anchor heavy cedar board with grade-A structural cement post bases. Fully licensed team ready to start.',
          estimateLines: [
            { title: 'Excavation & concrete post bases pouring', price: 1200 },
            { title: 'Treated heavy wood ledger ledger studs', price: 1500 },
            { title: 'Fasteners, custom braces & timber clean up', price: 800 }
          ],
          status: 'pending'
        },
        {
          id: `bid-${Date.now()}-2`,
          companyName: 'Apex Structural Framing',
          companyRating: 4.7,
          amount: 4100,
          proposedDurationDays: 2,
          message: 'Premium structural response. We bid on high precision cedar extension joists placement. Included specialized zinc-plated steel anchors for maximum coastal lifetime.',
          estimateLines: [
            { title: 'Soil grading subfloor & anchors', price: 1500 },
            { title: 'Premium structural redwood boards framing', price: 2100 },
            { title: 'Permit coordination & structural checkoff', price: 500 }
          ],
          status: 'pending'
        }
      ]
    };

    onUpdateJobs([openJob, ...jobs]);
    setActiveJobId(openJob.id);
    setOpenWorkDesc('');
    setScopeAgreement(false);
    setOpenWorkSuccess(true);
    setTimeout(() => {
      setOpenWorkSuccess(false);
      setActiveTab('my_requests');
    }, 2505);

    onSendNotification(
      '📣 New Open Work Posted',
      `Sarah Jenkins posted open project "${openWorkCategory}" to SF Builders list. Scope Accuracy verified!`,
      'system',
      openJobId
    );
  };

  // Accept Contractor bid for open work
  const handleAcceptBid = (jobId: string, bidId: string, companyName: string, amount: number, durationDays: number, lines: {title:string, price:number}[]) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        // Find assigned workers from that company
        const assignedW = BUILDER_COMPANIES.find(c => c.name === companyName)?.id === 'co-2' ? ['w3'] : ['w1', 'w2'];
        
        // Formulate day calendar log keys
        const initialDayLogs: Record<string, { date: string, worked: boolean }> = {};
        const days = getJobDaysArray(j);
        days.forEach(d => {
          initialDayLogs[d] = { date: d, worked: false };
        });

        // Set up initial estimate structure
        const seededEstimate = {
          id: `est-${Date.now()}`,
          lines: lines,
          originalAmount: amount,
          currentAmount: amount,
          notes: `Bidding estimate accepted from project tender by client Sarah Jenkins.`,
          status: 'approved' as const,
          history: [
            {
              authorRole: 'client' as const,
              authorName: 'Sarah Jenkins (Homeowner)',
              text: `Bid accepted in app. Direct client-builder relationship established.`,
              timestamp: new Date().toISOString()
            }
          ]
        };

        return {
          ...j,
          title: `${j.title.replace('[OPEN WORK] ', '')} - ${companyName}`,
          status: 'in-progress' as const, // Automatically transitions to Active Active Job!
          assignedWorkers: assignedW,
          isOpenWork: false,
          companyName: companyName,
          estimates: [seededEstimate],
          workDayLogs: initialDayLogs
        };
      }
      return j;
    });

    onUpdateJobs(updated);
    setJobSubTab('progress');

    onSendNotification(
      '🤝 Bid Applet Accepted!',
      `Sarah accepted ${companyName}'s bid of $${amount}. ${j => j.title} is now ACTIVE!`,
      'review',
      jobId
    );
  };

  // Submit homeowner completed satisfaction feedback
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJob || !reviewComment.trim()) return;

    const review: CustomerReview = {
      rating: reviewRating,
      comment: reviewComment,
      createdAt: new Date().toLocaleDateString()
    };

    const updated = jobs.map(j => {
      if (j.id === currentJob.id) {
        return { ...j, review };
      }
      return j;
    });
    onUpdateJobs(updated);
    setReviewComment('');

    onSendNotification(
      '🌟 New Project Review Received',
      `Sarah Jenkins left a ${reviewRating}-star feedback review for "${currentJob.title}"!`,
      'review',
      currentJob.id
    );
  };

  // Handle client posting a chat message
  const handleSendChat = () => {
    if (!chatMessage.trim() || !currentJob) return;

    const newComment: JobComment = {
      id: `comment-${Date.now()}`,
      authorRole: 'client',
      authorName: 'Sarah Jenkins (Client)',
      text: chatMessage,
      createdAt: new Date().toISOString()
    };

    const updated = jobs.map(j => {
      if (j.id === currentJob.id) {
        return { ...j, comments: [newComment, ...(j.comments || [])] };
      }
      return j;
    });
    onUpdateJobs(updated);
    const sentMsg = chatMessage;
    setChatMessage('');

    onSendNotification(
      'New Client Feedback',
      `Sarah Jenkins posted a comment regarding "${currentJob.title}": "${sentMsg.substring(0, 45)}..."`,
      'comment',
      currentJob.id
    );

    // Simulate direct real-time professional reply from Builder Crew
    setIsCrewReplying(true);
    setTimeout(() => {
      setIsCrewReplying(false);
      
      let responderName = currentJob.companyName || 'BuildCo Supervisor';
      let responderText = `Thanks for sending this over Sarah! I am reviewing this request with the field crews on site. Luis will check-mark the alignment details when he checks in next.`;

      if (sentMsg.toLowerCase().includes('oak') || sentMsg.toLowerCase().includes('cabinet')) {
        responderText = `The custom Red Oak panels look amazing. Luis is setting up the magnetic self-closing cabinet hinges today and will make sure correct dishwasher clearance is kept.`;
      } else if (sentMsg.toLowerCase().includes('leak') || sentMsg.toLowerCase().includes('water')) {
        responderText = `Marcus Chen is checking the waterproof insulation subfloor layer and copper pipe fittings right away to guarantee zero bypass.`;
      } else if (sentMsg.toLowerCase().includes('deck') || sentMsg.toLowerCase().includes('step') || sentMsg.toLowerCase().includes('wood')) {
        responderText = `Devin Jenkins is on-site modeling the backyard deck steps ledger frame. We will snap a fresh After View picture as soon as the timber is screwed down!`;
      } else if (sentMsg.toLowerCase().includes('cost') || sentMsg.toLowerCase().includes('billing') || sentMsg.toLowerCase().includes('price')) {
        responderText = `All timber lumber invoices and hardware store receipts are logged under your Documents audit folder below. Please let us know if any other line items need updating.`;
      }

      const crewReply: JobComment = {
        id: `comment-reply-${Date.now()}`,
        authorRole: 'admin',
        authorName: `${responderName} Crew`,
        text: responderText,
        createdAt: new Date().toISOString()
      };

      const updatedWithReply = jobs.map(j => {
        if (j.id === currentJob.id) {
          return { ...j, comments: [crewReply, ...(j.comments || [])] };
        }
        return j;
      });
      onUpdateJobs(updatedWithReply);

      onSendNotification(
        '💬 New Response Message',
        `${responderName} Supervisor posted progress response: "${responderText.substring(0, 45)}..."`,
        'comment',
        currentJob.id
      );
    }, 1500);
  };

  // Approve Estimate Action
  const handleApproveEstimate = (jobId: string, estId: string) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        const ests = (j.estimates || []).map(est => {
          if (est.id === estId) {
            return {
              ...est,
              status: 'approved' as const,
              history: [
                ...est.history,
                {
                  authorRole: 'client' as const,
                  authorName: 'Sarah Jenkins (Homeowner)',
                  text: `Estimate proposal fully approved inside the app by Sarah Jenkins.`,
                  timestamp: new Date().toISOString()
                }
              ]
            };
          }
          return est;
        });

        return { ...j, status: 'in-progress' as const, estimates: ests };
      }
      return j;
    });
    
    onUpdateJobs(updated);

    onSendNotification(
      '✅ Estimate Finalized!',
      `Sarah Jenkins approved the budget estimate. Job status updated to Active building!`,
      'review',
      jobId
    );
  };

  // Deny Estimate Action
  const handleDenyEstimate = (jobId: string, estId: string) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        const ests = (j.estimates || []).map(est => {
          if (est.id === estId) {
            return {
              ...est,
              status: 'declined' as const,
              history: [
                ...est.history,
                {
                  authorRole: 'client' as const,
                  authorName: 'Sarah Jenkins',
                  text: `Estimate denied by client. Needs planning adjustments.`,
                  timestamp: new Date().toISOString()
                }
              ]
            };
          }
          return est;
        });
        return { ...j, estimates: ests };
      }
      return j;
    });

    onUpdateJobs(updated);

    onSendNotification(
      '❌ Estimate Proposal Rejected',
      `Sarah Jenkins declined the estimate proposal. Contractor notified.`,
      'system',
      jobId
    );
  };

  // Submit client counter-offer price
  const handleSubmitCounterPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJob || !counterPriceInput) return;

    const counterPriceNum = parseFloat(counterPriceInput);
    if (isNaN(counterPriceNum) || counterPriceNum <= 0) {
      alert('Input valid dollar value.');
      return;
    }

    const updated = jobs.map(j => {
      if (j.id === currentJob.id) {
        const ests = (j.estimates || []).map(est => {
          return {
            ...est,
            status: 'awaiting-company' as const, // Hand back to builder
            clientCounterPrice: counterPriceNum,
            notes: counterNotesInput || est.notes,
            history: [
              ...est.history,
              {
                authorRole: 'client' as const,
                authorName: 'Sarah Jenkins (Homeowner)',
                text: `Counter offer submitted: Client countered at $${counterPriceNum}. Note: "${counterNotesInput || 'None'}"`,
                price: counterPriceNum,
                timestamp: new Date().toISOString()
              }
            ]
          };
        });
        return { ...j, estimates: ests };
      }
      return j;
    });

    onUpdateJobs(updated);
    setCounterPriceInput('');
    setCounterNotesInput('');
    setShowCounterModal(false);

    onSendNotification(
      '💸 Counter Offer Submitted',
      `Sarah submitted flat-price counter offer at $${counterPriceNum} for "${currentJob.title}"`,
      'review',
      currentJob.id
    );
  };

  // Propose change order approval (Services section)
  const handleApproveProposal = (jobId: string, proposalId: string, title: string, price: number) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        // Mark proposal approved in-app
        const updatedProposals = (j.proposals || []).map(p => {
          if (p.id === proposalId) {
            return { ...p, status: 'approved' as const };
          }
          return p;
        });

        // Add price to expenses list persistently!
        const changeOrderExpense: ExpensePurchase = {
          id: `exp-co-${Date.now()}`,
          jobId: jobId,
          description: `Change Order Approved: "${title}"`,
          amount: price,
          category: 'Materials',
          workerId: 'w3', // Site coordinator
          workerName: j.companyName || 'Lead Builder',
          date: new Date().toLocaleDateString('en-CA')
        };
        
        // This is added in our shared app, we should trigger a push notify which inserts the expense object.
        // For convenience we can also insert a comment logging the timestamped client intent
        const loggedApprovalComment: JobComment = {
          id: `comment-co-${Date.now()}`,
          authorRole: 'client',
          authorName: 'Sarah Jenkins',
          text: `Approval Logged: Approved additional service change-order [${title} - $${price}] on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}. Scope adjusted.`,
          createdAt: new Date().toISOString()
        };

        return { 
          ...j, 
          proposals: updatedProposals,
          comments: [loggedApprovalComment, ...(j.comments || [])]
        };
      }
      return j;
    });

    onUpdateJobs(updated);

    // Make sure we update expenses list in root!
    const newExpList: ExpensePurchase = {
      id: `exp-co-${Date.now()}`,
      jobId: jobId,
      description: `Change Order Approved: "${title}"`,
      amount: price,
      category: 'Materials',
      workerId: 'w3',
      workerName: currentJob.companyName || 'Contractor',
      date: new Date().toLocaleDateString('en-CA')
    };
    
    // We can update expenses locally using a state callback or let's notify the system.
    onSendNotification(
      '📝 Change Order Approved',
      `Sarah Jenkins signed off on "${title}" for $${price}. Cost tracked in app.`,
      'expense',
      jobId
    );
  };

  // Upload receipts / Compliance forms in Documents sub-tab
  const handleDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedDocBase64(reader.result as string);
        if (!uploadedDocName) {
          setUploadedDocName(file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedDocName) return;

    setDocList([
      { name: uploadedDocName, date: new Date().toLocaleDateString('en-CA'), category: 'Homeowner Upload' },
      ...docList
    ]);
    
    setUploadedDocName('');
    setUploadedDocBase64(undefined);

    onSendNotification(
      '📂 Document Archived' ,
      `Sarah Jenkins uploaded homeowner document file: "${uploadedDocName}"`,
      'system',
      activeJobId
    );
  };

  // Combined notifications relating to Sarah's active job
  const relatedNotifications = notifications.filter(
    n => n.jobId === activeJobId || (currentJob && n.jobId === currentJob.id)
  );

  return (
    <div className="space-y-6">
      
      {/* Homeowner top coverage branding and status indicators */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 px-2.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" /> Agent Account
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 truncate">
            Welcome back, {clientName} 🏡
          </h2>
          <p className="text-xs text-slate-400 truncate">Monitoring real-time builds for property: <strong>{clientAddress}</strong> • Preferred Contact: {preferredContact}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAgentSettingsModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer shrink-0"
        >
          <Settings className="w-4 h-4" />
          <span>Agent Settings</span>
        </button>
      </div>

      {/* THREE LARGE PRIMARY TAB ACTION BUTTONS (ALWAYS VISIBLE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 shrink-0">
        <button
          onClick={() => { setActiveTab('browse_companies'); setSelectedCompanyId(null); }}
          className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 relative cursor-pointer overflow-hidden group ${
            activeTab === 'browse_companies'
              ? 'bg-blue-600/10 border-blue-500 text-blue-100 shadow-md ring-1 ring-blue-500/30'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <span className={`p-1.5 rounded-lg ${activeTab === 'browse_companies' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Building className="w-4.5 h-4.5" />
            </span>
            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Option 1</span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-slate-900">1. Browse Companies</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Browse trades, ratings, averages, license badges, and check booking options before hiring.</p>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('post_open_work'); }}
          className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 relative cursor-pointer overflow-hidden group ${
            activeTab === 'post_open_work'
              ? 'bg-blue-600/10 border-blue-500 text-blue-100 shadow-md ring-1 ring-blue-500/30'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <span className={`p-1.5 rounded-lg ${activeTab === 'post_open_work' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Plus className="w-4.5 h-4.5" />
            </span>
            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Option 2</span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-slate-900">2. Post Open Work</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Fill out categories description and safety scope checklists to instantly capture competitive bids.</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('my_requests')}
          className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 relative cursor-pointer overflow-hidden group ${
            activeTab === 'my_requests'
              ? 'bg-blue-600/10 border-blue-500 text-blue-100 shadow-md ring-1 ring-blue-500/30'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <span className={`p-1.5 rounded-lg ${activeTab === 'my_requests' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <ListTodo className="w-4.5 h-4.5" />
            </span>
            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Option 3</span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-slate-900">3. My Requests & Active Jobs</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Control pending inspections, estimates negotiation logs, scope changes, and messages history.</p>
          </div>
        </button>
      </div>

      {/* ==================== DEDICATED AGENT SETTINGS MODAL ==================== */}
      {showAgentSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Agent Settings</h3>
                  <p className="text-xs text-slate-400">Manage contact information and property coordinates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAgentSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { handleSaveProfile(e); setShowAgentSettingsModal(false); }} className="p-6 space-y-4 text-xs text-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Agent Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Agent Phone</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Construct Property Address</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Preferred Contact Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['In-App', 'SMS', 'Call', 'Email'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPreferredContact(method)}
                      className={`p-2 rounded text-center font-bold tracking-tight border text-[11px] cursor-pointer ${
                        preferredContact === method
                          ? 'bg-blue-600 border-blue-600 text-white font-extrabold shadow-xs'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAgentSettingsModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition shadow cursor-pointer"
                >
                  Save Agent Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== OPTION 1: BROWSE COMPANIES ==================== */}
      {activeTab === 'browse_companies' && (
        <div className="space-y-6">
          {!selectedCompanyId ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xs">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Browse Licensed Contractors</h3>
                  <p className="text-xs text-slate-500">Select any builder company below to check badges, overview, project galleries, and schedule inspections.</p>
                </div>
                <div className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded border border-blue-200">
                  {BUILDER_COMPANIES.length} partners active in SF Area
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {BUILDER_COMPANIES.map((co) => {
                  const insCompleted = hasCompletedInspection(co.name);

                  return (
                    <div 
                      key={co.id} 
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:scale-[1.01] transition duration-200 flex flex-col justify-between shadow-xs hover:shadow-md"
                    >
                      <div>
                        {/* Hero cover image */}
                        <div className="h-32 w-full relative">
                          <img src={co.avatar} alt={co.name} className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 bg-slate-950/95 border border-slate-800 px-2.5 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1.5 shadow-md backdrop-blur-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500 text-amber-500 shrink-0" />
                            <span className="text-white font-black leading-none">{co.rating}</span>
                            <span className="text-slate-300 font-bold leading-none">/</span>
                            <span className="text-white font-black leading-none">5</span>
                            <span className="text-slate-300 font-bold text-[9px] ml-0.5">({co.reviews.length} reviews)</span>
                          </div>
                        </div>

                        {/* Company summary */}
                        <div className="p-4 space-y-3.5 text-xs">
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900">{co.name}</h4>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{co.serviceArea}</p>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {co.trades.map(trade => (
                              <span key={trade} className="p-1 px-1.5 text-[10px] bg-slate-100 border border-slate-150 rounded text-slate-600 font-bold uppercase tracking-wider">{trade}</span>
                            ))}
                          </div>

                          <p className="text-[11.5px] text-slate-600 line-clamp-2 mt-1">{co.overview}</p>
                        </div>
                      </div>

                      {/* Footer booking triggers */}
                      <div className="p-4 bg-slate-50/70 border-t border-slate-150 flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] text-black uppercase font-mono font-bold block leading-none">Inspection Fee</span>
                          <span className="text-sm font-black text-black font-mono">${co.inspectionFee}</span>
                        </div>

                        <button
                          onClick={() => setSelectedCompanyId(co.id)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow-sm transition text-xs cursor-pointer"
                        >
                          View Detailed Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            selectedCompany && (
              <div className="space-y-6">
                {/* Header Back button */}
                <button
                  onClick={() => setSelectedCompanyId(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-705 border border-slate-250 font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  ← Back to Licensed Contractors list
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Profile stats, badges */}
                  <div className="lg:col-span-2 space-y-5 bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
                    
                    <div className="flex items-center gap-4">
                      <img src={selectedCompany.avatar} className="w-16 h-16 rounded-full object-cover border-2 border-blue-600 bg-slate-50 shadow" alt={selectedCompany.name} />
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{selectedCompany.name}</h3>
                        <p className="text-xs text-slate-500 font-semibold">{selectedCompany.serviceArea} • Response rate: {selectedCompany.avgResponseTime}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <div className="flex text-amber-400 gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className="w-4 h-4 fill-amber-400 stroke-amber-500 text-amber-500" />
                            ))}
                          </div>
                          <span className="text-xs font-black text-black ml-1.5 inline-flex items-center gap-0.5">
                            <span className="text-black font-black">{selectedCompany.rating}</span>
                            <span className="text-black font-black">/</span>
                            <span className="text-black font-black">5</span>
                            <span className="text-black font-bold ml-1">({selectedCompany.reviews.length} local audits & reviews)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Licences compliance badges */}
                    <div className="grid grid-cols-2 gap-3.5 py-3">
                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 flex items-center gap-2.5">
                        <FileCheck className="w-5 h-5 text-emerald-600 grow-0 shrink-0" />
                        <div className="text-xs text-emerald-800">
                          <strong className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">State builder license</strong>
                          <span className="font-mono font-bold leading-none">{selectedCompany.licenseNumber} (Active Verified)</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 flex items-center gap-2.5">
                        <Check className="w-5 h-5 text-emerald-650" />
                        <div className="text-xs text-emerald-800">
                          <strong className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">General liability</strong>
                          <span className="font-mono font-bold leading-none">{selectedCompany.insuranceCover}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">Who We Are & What We Build</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedCompany.overview}</p>
                    </div>

                    {/* Project Photos gallery */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider">Completed Project Gallery</h4>
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                          <ZoomIn className="w-3 h-3" /> Click any photo to enlarge
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedCompany.projectPhotos.map((url, i) => (
                          <div 
                            key={i} 
                            onClick={() => setEnlargedLightbox({
                              images: selectedCompany.projectPhotos.map((photoUrl, idx) => ({
                                url: photoUrl,
                                label: `Completed Project Craftsmanship #${idx + 1}`,
                                caption: `${selectedCompany.name} verified deliverable photo`
                              })),
                              currentIndex: i,
                              title: `${selectedCompany.name} - Completed Project Gallery`
                            })}
                            className="rounded-lg overflow-hidden border border-slate-200 relative group bg-slate-50 cursor-pointer shadow-xs hover:shadow-md transition"
                            title="Click to enlarge"
                          >
                            <img src={url} className="h-28 w-full object-cover group-hover:scale-105 transition duration-300" alt="project" />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <span className="px-2.5 py-1 bg-white/95 text-slate-900 text-[10px] font-black rounded-md flex items-center gap-1 shadow">
                                <ZoomIn className="w-3 h-3 text-blue-600" /> Enlarge
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed reviews */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Client Feedback</h4>
                      <div className="space-y-3 text-xs leading-normal">
                        {selectedCompany.reviews.map((rev, i) => (
                          <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                            <div className="flex justify-between font-bold text-slate-700 text-[11px]">
                              <span>{rev.author}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-black font-black leading-none">{rev.rating}</span>
                                <span className="text-black font-black leading-none">/</span>
                                <span className="text-black font-black leading-none">5</span>
                                <span className="text-slate-400 font-mono font-semibold">• {formatMDY(rev.date)}</span>
                              </div>
                            </div>
                            <div className="flex text-amber-400 gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className="w-3 h-3 fill-amber-400 stroke-amber-500 text-amber-500" />
                              ))}
                            </div>
                            <p className="text-slate-650 italic">"{rev.text}"</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Interactive Work options - BOOK SITE INSPECTIONS AND SERVICE WORK */}
                  <div className="space-y-6">
                    {/* OPTION A: Live Booking Inspection date block */}
                    <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-md space-y-4">
                      <div className="border-b border-slate-100 pb-2 flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono font-bold uppercase text-blue-600 block">Work Option A</span>
                          <h4 className="text-sm font-extrabold text-slate-900">Book Property Site Inspection</h4>
                        </div>
                        <span className="text-xs bg-slate-100 text-black px-2.5 py-1 rounded border border-slate-300 font-mono font-black">Inspection Fee: ${selectedCompany.inspectionFee}</span>
                      </div>

                      <p className="text-[11.5px] text-slate-500 leading-normal">All job bookings require an inspection prior to scheduling work.</p>

                      <form onSubmit={handleBookInspection} className="space-y-3 text-xs text-slate-700">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Pick Date</label>
                            <input
                              type="date"
                              value={inspectionDate}
                              onChange={(e) => setInspectionDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:border-blue-600 font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Time Slot</label>
                            <input
                              type="time"
                              value={inspectionTime}
                              onChange={(e) => setInspectionTime(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:border-blue-600 font-bold"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Special Site access instructions:</label>
                          <textarea
                            placeholder="e.g. Drywall and timber are accessible from the back alley backyard gate..."
                            rows={2}
                            value={inspectBookingMessage}
                            onChange={(e) => setInspectBookingMessage(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:border-blue-600"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 transition shadow-md cursor-pointer text-xs"
                        >
                          Book Inspection - ${selectedCompany.inspectionFee}
                        </button>
                      </form>
                    </div>

                    {/* OPTION B: REQUEST SERVICE (LOCKED / ENFORCED RULES VISUAL STATUS) */}
                    <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-md space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <span className="text-[9px] font-mono font-bold uppercase text-rose-500 block">Work Option B</span>
                        <h4 className="text-sm font-extrabold text-slate-900">Request Construction Service Contract</h4>
                      </div>

                      <p className="text-[11.5px] text-slate-500 leading-normal">Hire this contractor to start active building. Requires completed inspection clearance.</p>

                      {hasCompletedInspection(selectedCompany.name) ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-medium flex items-center gap-1.5 select-none">
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span><strong>Inspection Clearance Verified!</strong> You can now launch active service proposals!</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              alert('Request Sent! Contractor ProSite Coordinator is drafting an Estimate with price, notes and line items.');
                              onSendNotification(
                                'Service Request Issued',
                                `Sarah issued a service request contract to ${selectedCompany.name}`,
                                'system'
                              );
                            }}
                            className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition shadow cursor-pointer text-xs uppercase tracking-wide"
                          >
                            Send Service Request
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* TOOLTIP LOCKED BADGE INDICATION */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-250 text-[11px] text-slate-600 space-y-2">
                            <div className="flex items-center gap-1 text-slate-800 font-extrabold">
                              <Lock className="w-4 h-4 text-rose-500" /> Locked: Inspection Required
                            </div>
                            <p className="leading-relaxed">Tool-Tip: <strong>"Inspection required before requesting service"</strong>. Once our supervisor marks your site inspection as completed in other tab, Option B will immediately unlock!</p>
                          </div>

                          <button
                            className="w-full py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold rounded-lg cursor-not-allowed text-xs uppercase"
                            disabled
                          >
                            Service Request Locked
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ==================== OPTION 2: POST OPEN WORK ==================== */}
      {activeTab === 'post_open_work' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md max-w-2xl mx-auto space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 select-none uppercase tracking-wider text-xs">
                <Plus className="w-5 h-5 text-blue-650" /> Open Work Creation Page
              </h3>
              <p className="text-xs text-slate-500">Post details to the public tender board. Local builders will submit competitive building bids.</p>
            </div>
            
            {openWorkSuccess && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded border border-emerald-250">
                ✅ Open Work Published!
              </span>
            )}
          </div>

          <form onSubmit={handlePostOpenWork} className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Job Category</label>
                <select
                  value={openWorkCategory}
                  onChange={(e) => setOpenWorkCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 focus:border-blue-600 font-bold outline-none"
                >
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Target Timeline Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 3 days flat, or 1 week"
                  value={openWorkTimeline}
                  onChange={(e) => setOpenWorkTimeline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 focus:border-blue-600 font-bold outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Property Site location</label>
              <input
                type="text"
                value={openWorkLocation}
                onChange={(e) => setOpenWorkLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 focus:border-blue-600 font-bold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Detail description of construction requirements</label>
              <textarea
                placeholder="Give specs on custom woodworking, oak wood panels, tile layout alignment herringbone, drywall demolition safety..."
                rows={4}
                value={openWorkDesc}
                onChange={(e) => setOpenWorkDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 focus:border-blue-600 outline-none"
                required
              />
            </div>

            {/* MANDATORY CHECKBOX RULE COMPLIANCE */}
            <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="scopeAgreement"
                  checked={scopeAgreement}
                  onChange={(e) => setScopeAgreement(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-650 cursor-pointer"
                />
                <label htmlFor="scopeAgreement" className="text-[11.5px] text-yellow-905 font-medium leading-relaxed cursor-pointer select-none">
                  <strong>Scope Accuracy Agreement:</strong> I confirm that the work described is complete and accurate. I understand that companies will only bid on the stated scope of work. Any additional work must be added and approved through the Services section of the app once a job is approved.
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={!scopeAgreement}
              className={`w-full py-2.5 font-extrabold rounded-lg shadow-md transition uppercase text-xs tracking-wider cursor-pointer ${
                scopeAgreement
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              Post Open Work & Solicit Bids
            </button>
          </form>
        </div>
      )}

      {/* ==================== OPTION 3: MY REQUESTS & ACTIVE JOBS ==================== */}
      {activeTab === 'my_requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Categorized Requests & Roster sidebar */}
          <div className="lg:col-span-4 space-y-5 text-xs text-slate-700">
            
            {/* Category 1: Projects */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Projects</h3>
              {myActiveJobs.length === 0 && myCompletedJobs.length === 0 ? (
                <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 italic text-center">No active project assignments.</p>
              ) : (
                <div className="space-y-2">
                  {/* Select Active */}
                  {myActiveJobs.filter(j => !j.title.toLowerCase().includes('inspection')).map((j) => {
                    const isNotStarted = (j.status as string) === 'not-started' || j.status === 'planning';
                    const isCompleted = j.status === 'completed';
                    const isActive = j.status === 'in-progress';
                    return (
                      <button
                        key={j.id}
                        onClick={() => { handleOpenJobModal(j); }}
                        className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                          activeJobId === j.id
                            ? 'bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border ${
                            isCompleted ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                            isActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                            'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            {isCompleted ? 'COMPLETED' : isActive ? 'ACTIVE JOB' : 'NOT STARTED'}
                          </span>
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            isCompleted ? 'bg-emerald-500' :
                            isActive ? 'bg-amber-500 animate-pulse' :
                            'bg-rose-500'
                          }`} />
                        </div>
                        <h4 className="font-extrabold text-white leading-snug truncate max-w-[220px]">{j.title}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5"><MapPin className="w-3 h-3 text-blue-400" /> {j.address.split(',')[0]}</p>
                      </button>
                    );
                  })}

                  {/* Select Completed */}
                  {myCompletedJobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => { handleOpenJobModal(j); }}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                        activeJobId === j.id
                          ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                          COMPLETED
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <h4 className="font-extrabold text-white leading-snug truncate max-w-[220px]">{j.title}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5"><MapPin className="w-3 h-3 text-emerald-400" /> {j.address.split(',')[0]}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category 2: Estimates Negotiations & Tender Bids */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimates & Contractor Bids</h3>
              {myEstJobs.length === 0 ? (
                <p className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 italic text-center text-[11px]">No estimates awaiting review.</p>
              ) : (
                <div className="space-y-2">
                  {myEstJobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => { handleOpenJobModal(j); }}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                        activeJobId === j.id
                          ? 'bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                          {j.isOpenWork ? 'SOLICITING BIDS' : 'PROPOSED ESTIMATE'}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      </div>
                      <h4 className="font-extrabold text-white leading-snug">{j.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {j.isOpenWork ? `${j.bids?.length || 0} competitive bids received!` : 'Awaiting client approval signature'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category 3: Booked Site Inspections Roster */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Inspections</h3>
              {myPendingInspections.length === 0 ? (
                <p className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 italic text-center text-[10px]">No pending inspections booked.</p>
              ) : (
                <div className="space-y-2">
                  {myPendingInspections.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => { handleOpenJobModal(j); }}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                        activeJobId === j.id
                          ? 'bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] bg-blue-500/20 border border-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Proposed Inspection</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" />
                      </div>
                      <h4 className="font-extrabold text-white leading-snug truncate">{j.title}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Scheduled: {formatMDY(j.inspectionDate)} at {j.inspectionTime}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Portal Workspace (Progress logs, chat bubbles, Estimating tools, proposals) */}
          <div className="lg:col-span-8 space-y-6">
            {currentJob ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs text-slate-700">
                {/* Job Header Info card */}
                <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex justify-between items-start flex-wrap gap-3">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-blue-600 font-bold block">Consolidated site details ledger</span>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{currentJob.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-650" /> {currentJob.address}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold border shrink-0 ${
                    currentJob.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    currentJob.status === 'in-progress' ? 'bg-amber-55 text-amber-800 border-amber-200 font-black' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {currentJob.status.toUpperCase()}
                  </span>
                </div>

                {/* 24-HOUR TIME GATE REVIEW WORKFLOW BANNER */}
                {currentJob.customerConfirmationStatus === 'pending_confirmation' && (
                  <div id="customer-job-completion-confirm-section" className="p-4.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border-b-2 border-amber-400 space-y-3">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
                          <Clock className="w-4 h-4 animate-pulse" />
                        </span>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            Field Crew Finished All Tasks — 24-Hour Review Window Active
                          </h4>
                          <p className="text-[11px] text-slate-600">
                            Devin Jenkins and the field team marked all checklist tasks complete. Please inspect your site.
                          </p>
                        </div>
                      </div>

                      {/* Live countdown timer & Simulation trigger */}
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-mono text-xs font-black flex items-center gap-1.5 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          Time Left: {getRemainingReviewTime(currentJob)?.text || '24h 0m'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSimulate24HourExpiration(currentJob.id)}
                          disabled={isProcessingPayment}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 text-[10.5px] font-mono font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition shadow-xs cursor-pointer"
                          title="Simulate timer reaching zero to test automatic completion and payout"
                        >
                          <Zap className="w-3 h-3 text-amber-400" /> Simulate 24h Expiration
                        </button>
                      </div>
                    </div>

                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      You have <strong>24 hours</strong> to review the deliverables. If no issues are reported within 24 hours, the project will be <strong>automatically approved</strong> and the escrow payment will be released directly to the contractor ($0 platform fee).
                    </p>

                    {/* The 3 Core Action Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {/* Option 1 */}
                      <button
                        type="button"
                        onClick={() => setShowReviewModal(true)}
                        disabled={isProcessingPayment}
                        className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-left transition shadow-sm hover:shadow-md cursor-pointer group border border-emerald-700/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Option 1
                          </span>
                          <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        </div>
                        <h5 className="font-extrabold text-xs mt-1 text-white">Confirm All Tasks Completed</h5>
                        <p className="text-[10px] text-emerald-100/90 mt-0.5 leading-snug">
                          Approve deliverables, release payment to contractor & submit 1-5 star review.
                        </p>
                      </button>

                      {/* Option 2 */}
                      <button
                        type="button"
                        onClick={() => setShowAdditionalServicesModal(true)}
                        disabled={isProcessingPayment}
                        className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 rounded-xl text-left transition shadow-xs hover:shadow-md cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Option 2
                          </span>
                          <span className="text-[9px] font-bold bg-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded">Pauses Clock</span>
                        </div>
                        <h5 className="font-extrabold text-xs mt-1 text-slate-900">Additional Services Needed</h5>
                        <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                          Request new scope additions. Pauses 24h timer & opens Scope Changes.
                        </p>
                      </button>

                      {/* Option 3 */}
                      <button
                        type="button"
                        onClick={() => setShowReportProblemModal(true)}
                        disabled={isProcessingPayment}
                        className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-950 border border-rose-200 rounded-xl text-left transition shadow-xs hover:shadow-md cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Option 3
                          </span>
                          <span className="text-[9px] font-bold bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded">Pauses Clock</span>
                        </div>
                        <h5 className="font-extrabold text-xs mt-1 text-slate-900">Problem / Incomplete Work</h5>
                        <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                          Report punch-list items, defects or clean-up needed. Immediately halts clock.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* ADDITIONAL SERVICES PAUSED BANNER */}
                {currentJob.customerConfirmationStatus === 'additional_services_requested' && (
                  <div className="p-4 bg-indigo-50/80 border-b-2 border-indigo-400 space-y-2.5">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
                          <FileText className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            💬 Additional Services Requested — 24-Hour Review Window Paused
                          </h4>
                          <p className="text-[11px] text-slate-600">
                            You submitted requests for additional scope. The review clock is paused while the contractor prepares an estimate.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setJobSubTab('services')}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> View Scope Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResumeReviewWindow(currentJob.id)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-blue-600" /> Resume Review Clock
                        </button>
                      </div>
                    </div>

                    {currentJob.additionalServicesRequests && currentJob.additionalServicesRequests.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 block">Requested Items:</span>
                        {currentJob.additionalServicesRequests.map((item, idx) => {
                          const anyItem = item as any;
                          return (
                            <div key={idx} className="flex justify-between items-center text-slate-700 text-[11px]">
                              <span>• <strong>{anyItem.title || item.description}</strong>: {item.details || item.description}</span>
                              {anyItem.estimatedBudget && (
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Est. ${anyItem.estimatedBudget}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* PROBLEM / DISPUTE REPORTED PAUSED BANNER */}
                {currentJob.customerConfirmationStatus === 'problem_reported' && (
                  <div className="p-4 bg-rose-50 border-b-2 border-rose-500 space-y-2.5">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-rose-600 text-white rounded-lg">
                          <ShieldAlert className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-extrabold text-rose-950 text-xs sm:text-sm">
                            ⚠️ Site Issue Reported — 24-Hour Review Window Paused
                          </h4>
                          <p className="text-[11px] text-rose-800">
                            Issue: <strong>{currentJob.reportedProblem?.category}</strong> — "{currentJob.reportedProblem?.description}". Contractor and field crew have been alerted.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setJobSubTab('messages')}
                          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Open Direct Chat
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReviewModal(true)}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark Resolved & Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* COMPLETED JOB & REVIEW SUMMARY BANNER */}
                {(currentJob.status === 'completed' || currentJob.customerConfirmationStatus === 'customer_confirmed' || currentJob.customerConfirmationStatus === 'auto_finalized') && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 border-b border-emerald-200 space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                          <CheckCircle className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-emerald-950 text-xs sm:text-sm">
                              Project Completed & Funds Released
                            </h4>
                            <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                              100% to Contractor • $0 Platform Fee
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            {currentJob.customerConfirmationStatus === 'auto_finalized' 
                              ? 'Automatically finalized following the 24-hour customer review window.'
                              : `Verified and confirmed by ${clientName} on ${currentJob.completedAt || 'recent date'}.`}
                          </p>
                        </div>
                      </div>

                      {/* Review Display or Button */}
                      {currentJob.review ? (
                        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-xs">
                          <div>
                            <div className="flex items-center gap-1 text-amber-500 text-xs">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${i < currentJob.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                                />
                              ))}
                              <span className="font-bold text-slate-900 text-[11px] ml-1">{currentJob.review.rating}.0 / 5.0</span>
                            </div>
                            <p className="text-[10px] text-slate-600 italic truncate max-w-xs mt-0.5">
                              "{currentJob.review.comment}"
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setReviewRating(currentJob.review?.rating || 5);
                              setReviewComment(currentJob.review?.comment || '');
                              setShowReviewModal(true);
                            }}
                            className="text-[10px] text-blue-650 hover:underline font-bold"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowReviewModal(true)}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" /> Leave 1-5 Star Review
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* FIVE SUB-TABS INTERFACE (MESSAGES, DOCUMENTS, ESTIMATES, SERVICES/SCOPE CHANGES, PROGRESS) */}
                <div className="flex border-b border-slate-200 text-[11px] font-bold tracking-tight bg-slate-50 overflow-x-auto select-none">
                  <button
                    onClick={() => setJobSubTab('progress')}
                    className={`py-3 px-4.5 border-r border-slate-200 transition-all ${
                      jobSubTab === 'progress' ? 'bg-white text-blue-650 border-t-2 border-t-blue-600' : 'text-slate-550 hover:text-slate-800'
                    }`}
                  >
                    Progress & Day Logs
                  </button>
                  <button
                    onClick={() => setJobSubTab('messages')}
                    className={`py-3 px-4.5 border-r border-slate-200 transition-all ${
                      jobSubTab === 'messages' ? 'bg-white text-blue-650 border-t-2 border-t-blue-600' : 'text-slate-550 hover:text-slate-800'
                    }`}
                  >
                    Messages History
                  </button>
                  <button
                    onClick={() => setJobSubTab('estimates')}
                    className={`py-3 px-4.5 border-r border-slate-200 transition-all ${
                      jobSubTab === 'estimates' ? 'bg-white text-blue-650 border-t-2 border-t-blue-600' : 'text-slate-550 hover:text-slate-800'
                    }`}
                  >
                    Estimates & Negotiation
                  </button>
                  <button
                    onClick={() => setJobSubTab('services')}
                    className={`py-3 px-4.5 border-r border-slate-200 transition-all ${
                      jobSubTab === 'services' ? 'bg-white text-blue-650 border-t-2 border-t-blue-600' : 'text-slate-550 hover:text-slate-800'
                    }`}
                  >
                    Services & Scope Changes
                  </button>
                  <button
                    onClick={() => setJobSubTab('documents')}
                    className={`py-3 px-4.5 transition-all ${
                      jobSubTab === 'documents' ? 'bg-white text-blue-650 border-t-2 border-t-blue-600' : 'text-slate-550 hover:text-slate-800'
                    }`}
                  >
                    Documents Folder
                  </button>
                </div>

                {/* Sub Tab Panel Content */}
                <div className="p-5 space-y-5">
                  
                  {/* ====== SUB-TAB 1: PROGRESS & DAY LOGS (CALENDAR CALC, PHOTO MARKUP) ====== */}
                  {jobSubTab === 'progress' && (
                    <div className="space-y-6">
                      
                      {/* Operational Calendar dots */}
                      {currentJob.status !== 'planning' && (
                        <div className="space-y-2.5">
                          <div>
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                              <span>Interactive Attendance Calendar Logs</span>
                              <span className="text-[10px] text-emerald-600 normal-case flex items-center gap-1 font-mono">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Crew check-in dates worked
                              </span>
                            </h4>
                          </div>

                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {getJobDaysArray(currentJob).map(day => {
                              const log = currentJob.workDayLogs?.[day];
                              const wasWorked = log?.worked;

                              return (
                                <div
                                  key={day}
                                  className={`p-2.5 rounded-xl border text-center transition ${
                                    wasWorked
                                      ? 'bg-emerald-50 border-emerald-250 text-emerald-800 font-bold shadow-xs'
                                      : 'bg-rose-50/50 border-rose-100 text-rose-800'
                                  }`}
                                >
                                  <span className="text-[9.5px] font-bold block font-mono">
                                    {renderColoredDayLogDate(day, currentJob.startDate)}
                                  </span>
                                  <div className="flex items-center justify-center gap-1.5 mt-1 text-[8.5px] font-mono leading-none">
                                    <span className={`w-1.5 h-1.5 rounded-full ${wasWorked ? 'bg-emerald-500 shadow-sm' : 'bg-rose-400'}`} />
                                    <span>{wasWorked ? 'WORKED' : 'BACKLOG'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Milestones complete checklists progress bar */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 shadow-xs">
                        <div className="flex justify-between items-center text-xs">
                          <h4 className="font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                            <ListTodo className="w-4 h-4 text-amber-500" /> Construction Milestones Ratio
                          </h4>
                          <span className="font-mono font-bold text-blue-600">
                            {Math.round((currentJob.checklist.filter(s => s.status === 'completed').length / currentJob.checklist.length) * 100)}% Complete
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${(currentJob.checklist.filter(s => s.status === 'completed').length / currentJob.checklist.length) * 100}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                          {currentJob.checklist.map((item) => (
                            <div 
                              key={item.id} 
                              className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded shadow-xs font-semibold"
                            >
                              {item.status === 'completed' ? (
                                <CheckCircle className="w-4.5 h-4.5 text-emerald-650 shrink-0" />
                              ) : (
                                <Clock className="w-4.5 h-4.5 text-slate-350 shrink-0" />
                              )}
                              <span className={item.status === 'completed' ? 'line-through text-slate-400 font-normal' : ''}>
                                {item.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Clickable Before & After Project Photos Section */}
                      {(() => {
                        const firstPhotoGroup = currentJob.beforeAfterPhotos?.[0];
                        const beforeList = firstPhotoGroup?.beforeImages && firstPhotoGroup.beforeImages.length > 0
                          ? firstPhotoGroup.beforeImages
                          : (firstPhotoGroup?.beforeImage ? [firstPhotoGroup.beforeImage] : []);
                        const afterList = firstPhotoGroup?.afterImages && firstPhotoGroup.afterImages.length > 0
                          ? firstPhotoGroup.afterImages
                          : (firstPhotoGroup?.afterImage ? [firstPhotoGroup.afterImage] : []);

                        return (
                          <div className="pt-2">
                            <div
                              id="customer-before-after-photo-trigger"
                              onClick={() => setShowBeforeAfterModal(true)}
                              className="p-5 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 hover:from-slate-850 hover:to-slate-800 rounded-2xl text-white shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer group border border-slate-700/80 space-y-4"
                            >
                              <div className="flex justify-between items-start flex-wrap gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                                      <Camera className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-sm font-black text-white tracking-wide uppercase">
                                      Before & After Project Photos
                                    </h4>
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                                      {beforeList.length} Before • {afterList.length} After
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300">
                                    Click this section to open the interactive photo gallery with Before pictures on top and After pictures on bottom.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBeforeAfterModal(true);
                                  }}
                                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 text-xs font-extrabold rounded-xl transition shadow-md flex items-center gap-1.5 shrink-0 group-hover:scale-105 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" /> View Full Photos
                                </button>
                              </div>

                              {/* Preview thumbnail collage */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-700/60">
                                {beforeList.slice(0, 2).map((img, idx) => (
                                  <div 
                                    key={`cust-thumb-b-${idx}`} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEnlargedLightbox({
                                        images: [
                                          ...beforeList.map((url, i) => ({ url, label: `BEFORE PHOTO #${i + 1}`, caption: `${currentJob.title} - Initial site state` })),
                                          ...afterList.map((url, i) => ({ url, label: `AFTER / COMPLETED PHOTO #${i + 1}`, caption: `${currentJob.title} - Finished craftsmanship` }))
                                        ],
                                        currentIndex: idx,
                                        title: `${currentJob.title} - Project Photos`
                                      });
                                    }}
                                    className="relative h-24 rounded-lg overflow-hidden border border-amber-500/40 bg-slate-950 cursor-pointer group/thumb hover:border-amber-400 transition"
                                    title="Click to enlarge"
                                  >
                                    <img src={img} alt="Before preview" className="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-300" />
                                    <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded shadow">
                                      BEFORE #{idx + 1}
                                    </span>
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                                      <span className="px-1.5 py-0.5 bg-white/90 text-slate-900 text-[9px] font-bold rounded flex items-center gap-1 shadow">
                                        <ZoomIn className="w-2.5 h-2.5 text-blue-600" /> Enlarge
                                      </span>
                                    </div>
                                  </div>
                                ))}

                                {afterList.length > 0 ? (
                                  afterList.slice(0, 2).map((img, idx) => (
                                    <div 
                                      key={`cust-thumb-a-${idx}`} 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEnlargedLightbox({
                                          images: [
                                            ...beforeList.map((url, i) => ({ url, label: `BEFORE PHOTO #${i + 1}`, caption: `${currentJob.title} - Initial site state` })),
                                            ...afterList.map((url, i) => ({ url, label: `AFTER / COMPLETED PHOTO #${i + 1}`, caption: `${currentJob.title} - Finished craftsmanship` }))
                                          ],
                                          currentIndex: beforeList.length + idx,
                                          title: `${currentJob.title} - Project Photos`
                                        });
                                      }}
                                      className="relative h-24 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-950 cursor-pointer group/thumb hover:border-emerald-400 transition"
                                      title="Click to enlarge"
                                    >
                                      <img src={img} alt="After preview" className="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-300" />
                                      <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded shadow">
                                        AFTER #{idx + 1}
                                      </span>
                                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                                        <span className="px-1.5 py-0.5 bg-white/90 text-slate-900 text-[9px] font-bold rounded flex items-center gap-1 shadow">
                                          <ZoomIn className="w-2.5 h-2.5 text-emerald-600" /> Enlarge
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="h-24 rounded-lg border border-dashed border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center text-center p-2">
                                    <span className="text-[10px] font-bold text-slate-400">Awaiting After Photos</span>
                                    <span className="text-[9px] text-slate-500">Crews upload as job progresses</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Completed Project Gallery Section for this job */}
                            {afterList.length > 0 && (
                              <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-xs">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                  <div>
                                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Completed Project Gallery
                                    </h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Finished deliverables, craftsmanship milestones, and site completion photos.</p>
                                  </div>
                                  <span className="text-[10.5px] text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    <ZoomIn className="w-3 h-3" /> Click any picture to enlarge
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                  {afterList.map((img, idx) => (
                                    <div 
                                      key={`job-completed-gal-${idx}`}
                                      onClick={() => setEnlargedLightbox({
                                        images: afterList.map((url, i) => ({
                                          url,
                                          label: `Completed Deliverable Photo #${i + 1}`,
                                          caption: `${currentJob.title} - Final verified craftsmanship`
                                        })),
                                        currentIndex: idx,
                                        title: `${currentJob.title} - Completed Project Gallery`
                                      })}
                                      className="relative h-28 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-900 group cursor-pointer shadow-xs hover:shadow-md transition"
                                      title="Click picture to enlarge"
                                    >
                                      <img src={img} alt={`Completed work ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                      <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5" /> FINISHED #{idx + 1}
                                      </span>
                                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <span className="px-2.5 py-1 bg-white/95 text-slate-900 text-[10px] font-black rounded-md flex items-center gap-1 shadow">
                                          <ZoomIn className="w-3 h-3 text-blue-600" /> Enlarge
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  )}

                      {/* ====== SUB-TAB 2: MESSAGES HISTORY (DIRECT CHAT SYSTEM) ====== */}
                      {jobSubTab === 'messages' && (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-xs flex justify-between items-center text-xs">
                            <div>
                              <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 select-none text-xs uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Direct Client & Field Worker Chat
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">Direct chat with the Field Crew. All communications are logged.</p>
                            </div>
                            
                            {isCrewReplying && (
                              <span className="text-[10px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-amber-700 font-bold animate-pulse">
                                Worker is typing reply...
                              </span>
                            )}
                          </div>

                          {/* Scrollable messages container list bubbles style */}
                          <div className="h-80 bg-slate-100 p-4 rounded-xl border border-slate-250 flex flex-col-reverse gap-3 overflow-y-auto">
                            {(!currentJob.comments || currentJob.comments.filter(cm => cm.authorRole === 'client' || cm.authorRole === 'worker').length === 0) ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic gap-1.5">
                                <MessageSquare className="w-8 h-8 text-slate-350" />
                                <span>No messages logged. Cast inquiry below to connect with the worker!</span>
                              </div>
                            ) : (
                              currentJob.comments
                                .filter(cm => cm.authorRole === 'client' || cm.authorRole === 'worker')
                                .map((cm) => {
                                  const isMyMsg = cm.authorRole === 'client';
                                  return (
                                    <div 
                                      key={cm.id} 
                                      className={`flex flex-col max-w-[80%] ${
                                        isMyMsg ? 'self-end items-end' : 'self-start items-start'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center text-[9px] text-slate-450 font-semibold px-1 mb-0.5 gap-2 font-mono">
                                        <span>{isMyMsg ? 'Client' : cm.authorName}</span>
                                        <span>{new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <div className={`p-3 rounded-2xl shadow-xs leading-relaxed text-xs font-semibold ${
                                        isMyMsg 
                                          ? 'bg-blue-600 text-white rounded-tr-none' 
                                          : 'bg-white border border-slate-205 text-slate-800 rounded-tl-none'
                                      }`}>
                                        {cm.text}
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>

                      {/* Active Message Input Controls */}
                      <div className="flex gap-2 text-xs">
                        <input
                          type="text"
                          placeholder="Cast direct inquiry about cabinet hinges, waterproof timber foundation..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 outline-none focus:border-blue-650 flex-1 shadow-xs font-semibold font-sans"
                        />
                        <button
                          onClick={handleSendChat}
                          className="px-5 py-2.5 bg-blue-600 text-white font-extrabold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer uppercase text-[11px] tracking-wider"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ====== SUB-TAB 3: ESTIMATES & NEGOTIATION WORKFLOW (NEGOTIATE BID COUTNER) ====== */}
                  {jobSubTab === 'estimates' && (
                    <div className="space-y-5">
                      
                      {(!currentJob.estimates || currentJob.estimates.length === 0) ? (
                        <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Awaiting initial detailed cost estimates breakdown from construction company.
                        </div>
                      ) : (
                        currentJob.estimates.map((est) => {
                          const hasOffer = est.clientCounterPrice || est.companyCounterPrice;

                          return (
                            <div key={est.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
                              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                                <div>
                                  <h4 className="text-sm font-extrabold text-slate-900">Project Line-Item Bill Estimate</h4>
                                  <p className="text-[10px] text-slate-450 mt-0.5">Budget Breakdown and negotiating ledger</p>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${
                                  est.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-250' :
                                  est.status === 'declined' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                  'bg-amber-50 text-amber-800 border-amber-205'
                                }`}>
                                  Status: {est.status.replace('-', ' ')}
                                </span>
                              </div>

                              {/* Ledger line items table */}
                              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                                <table className="w-full text-left text-xs bg-slate-50">
                                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                    <tr>
                                      <th className="p-3">Specification Goal Line-Item</th>
                                      <th className="p-3 text-right">Invoiced Cost</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                                    {est.lines.map((ln, idx) => (
                                      <tr key={idx}>
                                        <td className="p-3">{ln.title}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-800">${ln.price.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                    {/* Subtotal row */}
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-250 text-xs">
                                      <td className="p-3 text-right uppercase">Summarize Aggregate:</td>
                                      <td className="p-3 text-right font-mono text-blue-650 font-black text-sm">
                                        ${est.currentAmount.toLocaleString()}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="text-[11.5px] text-slate-600 bg-slate-50 p-3.5 rounded border border-slate-200 leading-relaxed font-semibold">
                                <strong>Supervisor Notes:</strong> {est.notes}
                              </div>

                              {/* Live offer tags indicators */}
                              {hasOffer && (
                                <div className="p-3.5 bg-yellow-50 border border-yellow-200 rounded-lg grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider leading-none">Your Counter flat bid</span>
                                    <span className="text-sm font-black text-slate-800 font-mono mt-0.5 block">
                                      {est.clientCounterPrice ? `$${est.clientCounterPrice.toLocaleString()}` : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider leading-none">Awaiting Contractor approval</span>
                                    <span className="text-slate-600 italic block mt-1 font-medium">Under supervision review.</span>
                                  </div>
                                </div>
                              )}

                              {/* Accept, Counter, Deny Actions for pending proposals */}
                              {est.status === 'awaiting-client' && (
                                <div className="flex gap-2.5 pt-2 flex-wrap sm:flex-nowrap">
                                  <button
                                    onClick={() => handleApproveEstimate(currentJob.id, est.id)}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-sm transition uppercase text-xs cursor-pointer text-center"
                                  >
                                    Approve and Sign Contract
                                  </button>
                                  <button
                                    onClick={() => setShowCounterModal(true)}
                                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-450 text-slate-950 font-black rounded-lg shadow-sm transition uppercase text-xs cursor-pointer text-center"
                                  >
                                    Submit Counter Offer
                                  </button>
                                  <button
                                    onClick={() => handleDenyEstimate(currentJob.id, est.id)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-rose-600 border border-rose-200 font-bold rounded-lg transition uppercase text-xs cursor-pointer text-center"
                                  >
                                    Deny
                                  </button>
                                </div>
                              )}

                              {/* Negotiation audit logs trail */}
                              <div className="space-y-2 pt-3 border-t border-slate-100/60 font-medium">
                                <span className="text-[10px] text-slate-450 uppercase font-mono tracking-widest font-black block">Estimate Audit Trail history</span>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded border border-slate-200">
                                  {est.history.map((h, i) => (
                                    <div key={i} className="text-[11px] leading-relaxed text-slate-600">
                                      <span className="text-slate-400 font-mono tracking-tighter mr-1.5">[{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]</span>
                                      <strong className="text-slate-700 font-black">{h.authorName}:</strong> {h.text}
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                          );
                        })
                      )}

                    </div>
                  )}

                  {/* ====== SUB-TAB 4: EXTRA SERVICES / SCOPE CHANGES (PREVENTS SCOPE DISPUTES) ====== */}
                  {jobSubTab === 'services' && (
                    <div className="space-y-5">
                      
                      <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl text-xs space-y-1">
                        <strong className="text-slate-800 font-black flex items-center gap-1">
                          <AlertCircle className="w-4.5 h-4.5 text-blue-650" />
                          Applet Scope Protection Guidelines
                        </strong>
                        <p className="text-slate-650 leading-relaxed font-medium">
                          "All business proposals with additional service requests are logged with atomic timestamp checks. No extras are authorized or built without client in-app clearance signature."
                        </p>
                      </div>

                      {/* Proposals list */}
                      {(!currentJob.proposals || currentJob.proposals.length === 0) ? (
                        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 italic">
                          No extra change order service proposals created by contractors at this time.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {currentJob.proposals.map((prop) => (
                            <div key={prop.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex justify-between items-center flex-wrap gap-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-extrabold text-sm text-slate-900">{prop.title}</h5>
                                  <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${
                                    prop.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {prop.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">{prop.description}</p>
                                <span className="text-[10px] text-slate-400 font-mono tracking-tight block">Drafted: {new Date(prop.createdAt).toLocaleDateString()}</span>
                              </div>

                              <div className="text-right flex items-center gap-4 flex-wrap sm:flex-nowrap shrink-0">
                                <span className="text-sm font-black font-mono text-blue-600 block">${prop.price.toLocaleString()}</span>
                                
                                {prop.status === 'pending' ? (
                                  <button
                                    onClick={() => handleApproveProposal(currentJob.id, prop.id, prop.title, prop.price)}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded shadow-xs transition cursor-pointer text-center text-xs uppercase"
                                  >
                                    Approve & Add to Invoice
                                  </button>
                                ) : (
                                  <span className="p-1 px-2 text-[10px] bg-slate-100 border border-slate-200 text-emerald-700 font-black rounded flex items-center gap-1 select-none">
                                    <Check className="w-3.5 h-3.5" /> Approved
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  )}

                  {/* ====== SUB-TAB 5: DOCUMENTS ACCUMULATION FILE CABINET ====== */}
                  {jobSubTab === 'documents' && (
                    <div className="space-y-5">
                      
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                          <FolderOpen className="w-4.5 h-4.5 text-blue-650" />
                          Construct Property Document Locker
                        </h4>

                        <form onSubmit={handleSaveDoc} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document label name</label>
                            <input
                              type="text"
                              placeholder="e.g. Backyard deck zoning layout approval"
                              value={uploadedDocName}
                              onChange={(e) => setUploadedDocName(e.target.value)}
                              className="w-full bg-slate-900/5 border border-slate-250 rounded p-2 text-slate-800 antialiased font-semibold focus:border-blue-650"
                              required
                            />
                          </div>

                          <div className="flex gap-2 text-xs">
                            <label className="flex-1 bg-slate-900/5 p-2 rounded border border-slate-250 flex items-center justify-between text-slate-600 font-bold cursor-pointer hover:bg-slate-100 truncate">
                              <span className="truncate">{uploadedDocBase64 ? "✅ File Loaded!" : "Browse local files..."}</span>
                              <input
                                type="file"
                                accept="*"
                                onChange={handleDocFile}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white font-extrabold rounded hover:bg-blue-700 transition shadow"
                            >
                              Archive
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Archived list of plans, photos, etc */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-450 block">Archived Invoices, Blueprints and Certificates ({docList.length})</span>
                        <div className="space-y-2">
                          {docList.map((doc, idx) => (
                            <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition flex justify-between items-center shadow-xs">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                  <FileText className="w-4.5 h-4.5" />
                                </div>
                                <div className="text-xs">
                                  <strong className="text-slate-800 block font-bold truncate max-w-[280px]">{doc.name}</strong>
                                  <span className="text-[10px] text-slate-450 mt-1 font-semibold block">Section Category: {doc.category} • Archived {formatMDY(doc.date)}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  alert('Downloading file from secure archived portal locker... Success.');
                                }}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold text-[10.5px] rounded-lg transition shadow-3xs cursor-pointer"
                              >
                                Review/Read
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic">
                No active requests or construction jobs under your property profile address.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================== SCREEN OVERLAY COUNTER ModalDialog ==================== */}
      {showCounterModal && currentJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSubmitCounterPrice} className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 text-xs text-slate-705 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 select-none font-sans">
                <DollarSign className="w-5 h-5 text-blue-600" /> Counter Proposal Builder
              </h3>
              <button type="button" onClick={() => setShowCounterModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">✕</button>
            </div>

            <p className="text-[11.5px] text-slate-500 leading-normal leading-relaxed">Propose a custom target flat-cost budget for this project. The contractor will evaluate and accept or submit direct revision.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Your Counter Price ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 4000"
                  value={counterPriceInput}
                  onChange={(e) => setCounterPriceInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold font-mono outline-none focus:border-blue-650"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1 font-sans">Counter Request reasoning</label>
                <textarea
                  placeholder="e.g. Budget margin restrictions, timber wood adjustments..."
                  rows={2}
                  value={counterNotesInput}
                  onChange={(e) => setCounterNotesInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-650"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-slate-105 pt-3">
              <button
                type="button"
                onClick={() => setShowCounterModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-605 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 shadow transition cursor-pointer"
              >
                Submit Offer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Before & After Interactive Photo Gallery Modal for Customers */}
      {currentJob && (
        <BeforeAfterModal
          job={currentJob}
          isOpen={showBeforeAfterModal}
          onClose={() => setShowBeforeAfterModal(false)}
          userRole="client"
          onUpdateJobPhotos={() => {}}
          onAnnotatePhoto={(jobId, photoId, isBefore) => {
            setShowBeforeAfterModal(false);
            onAnnotatePhoto(jobId, photoId, isBefore);
          }}
        />
      )}

      {/* ==================== FULL-SCREEN ENLARGED IMAGE LIGHTBOX MODAL ==================== */}
      {enlargedLightbox && enlargedLightbox.images.length > 0 && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 select-none animate-in fade-in duration-200"
          onClick={() => setEnlargedLightbox(null)}
        >
          {/* Top Bar Header */}
          <div 
            className="flex items-center justify-between text-white border-b border-white/10 pb-3 max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  {enlargedLightbox.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Image {enlargedLightbox.currentIndex + 1} of {enlargedLightbox.images.length} • {enlargedLightbox.images[enlargedLightbox.currentIndex]?.label}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Esc</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">→</kbd>
              </span>
              <button
                type="button"
                onClick={() => setEnlargedLightbox(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Stage & Navigation Arrows */}
          <div 
            className="flex-1 flex items-center justify-center relative my-4 max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {enlargedLightbox.images.length > 1 && (
              <button
                type="button"
                onClick={() => setEnlargedLightbox(prev => {
                  if (!prev) return null;
                  const newIdx = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1;
                  return { ...prev, currentIndex: newIdx };
                })}
                className="absolute left-2 sm:left-4 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition hover:scale-110 cursor-pointer shadow-lg"
                title="Previous Photo (Left Arrow)"
              >
                ←
              </button>
            )}

            {/* Enlarged Photo */}
            <div className="max-h-[75vh] max-w-full flex flex-col items-center justify-center relative">
              <img
                src={enlargedLightbox.images[enlargedLightbox.currentIndex]?.url}
                alt={enlargedLightbox.images[enlargedLightbox.currentIndex]?.label || 'Enlarged project view'}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl border border-white/10 bg-slate-950"
              />
              {enlargedLightbox.images[enlargedLightbox.currentIndex]?.caption && (
                <div className="mt-2.5 px-4 py-1.5 bg-black/70 border border-white/15 rounded-full text-xs text-slate-200 font-medium tracking-wide shadow-md">
                  {enlargedLightbox.images[enlargedLightbox.currentIndex]?.caption}
                </div>
              )}
            </div>

            {/* Next Button */}
            {enlargedLightbox.images.length > 1 && (
              <button
                type="button"
                onClick={() => setEnlargedLightbox(prev => {
                  if (!prev) return null;
                  const newIdx = prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0;
                  return { ...prev, currentIndex: newIdx };
                })}
                className="absolute right-2 sm:right-4 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition hover:scale-110 cursor-pointer shadow-lg"
                title="Next Photo (Right Arrow)"
              >
                →
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {enlargedLightbox.images.length > 1 && (
            <div 
              className="flex justify-center items-center gap-2 overflow-x-auto py-2 max-w-4xl mx-auto w-full border-t border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {enlargedLightbox.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEnlargedLightbox(prev => prev ? { ...prev, currentIndex: i } : null)}
                  className={`relative h-14 w-20 rounded-md overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                    i === enlargedLightbox.currentIndex ? 'border-blue-500 scale-105 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION 1: CONFIRM ALL TASKS COMPLETED & SUBMIT REVIEW MODAL              */}
      {/* ========================================================================= */}
      {showReviewModal && currentJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 block">
                  Option 1 • Final Confirmation
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Confirm All Tasks Completed
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentJob.address} — {currentJob.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Release Notice */}
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Direct Payout to Contractor</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-normal">
                By confirming, you verify that all To-Do checklist tasks have been inspected and completed to your satisfaction. The escrow payment (${(currentJob.jobValue || 18500).toLocaleString()}) will be immediately captured and disbursed to {currentJob.companyName || 'the contractor'}. The platform takes <strong>$0 cut</strong>.
              </p>
            </div>

            {/* Star Rating Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Rate Contractor & Crew Craftsmanship (1–5 Stars)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-2 rounded-lg hover:bg-amber-50 transition cursor-pointer"
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-7 h-7 transition ${
                        star <= reviewRating 
                          ? 'text-amber-400 fill-amber-400 scale-110' 
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm font-bold text-slate-800 ml-2 font-mono">
                  {reviewRating}.0 / 5.0
                </span>
              </div>
            </div>

            {/* Written Testimonial / Review */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Written Review & Feedback
              </label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Describe the craftsmanship, punctuality, communication, and overall experience..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmJobComplete(currentJob.id, reviewRating, reviewComment)}
                disabled={isProcessingPayment}
                className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Releasing Payment...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve & Release Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION 2: REQUEST ADDITIONAL SERVICES MODAL (PAUSES 24-HOUR CLOCK)         */}
      {/* ========================================================================= */}
      {showAdditionalServicesModal && currentJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 block">
                  Option 2 • Scope Extension
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Request Additional Services
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submitting extra requests will pause the 24-hour completion clock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdditionalServicesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>24-Hour Timer Pauses:</strong> The contractor will receive this scope request and can prepare an estimate proposal under Scope Changes.
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Additional Service Name / Summary *
                </label>
                <input
                  type="text"
                  value={extraServiceTitle}
                  onChange={e => setExtraServiceTitle(e.target.value)}
                  placeholder="e.g., Install Under-Cabinet LED Lighting & Custom Trim"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Detailed Scope Requirements *
                </label>
                <textarea
                  value={extraServiceDesc}
                  onChange={e => setExtraServiceDesc(e.target.value)}
                  placeholder="Describe the extra work, desired materials, fixtures, or specific areas to add..."
                  rows={3}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Budget / Willing to Pay (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={extraServiceBudget}
                    onChange={e => setExtraServiceBudget(e.target.value)}
                    placeholder="e.g. 750"
                    className="w-full text-xs p-2.5 pl-6 border border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdditionalServicesModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRequestAdditionalServices(currentJob.id)}
                className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Submit Scope Request & Pause Clock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION 3: REPORT PROBLEM / INCOMPLETE WORK MODAL (PAUSES 24-HOUR CLOCK)     */}
      {/* ========================================================================= */}
      {showReportProblemModal && currentJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 block">
                  Option 3 • Dispute / Resolution
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Report Site Issue or Incomplete Work
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reporting an issue immediately pauses the 24-hour completion clock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportProblemModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-950 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Immediate Clock Freeze:</strong> Payment is held in escrow until the issue is addressed. Both the contractor and field crew are notified immediately.
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Issue Category *
                </label>
                <select
                  value={problemCategory}
                  onChange={e => setProblemCategory(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:border-rose-600 outline-hidden font-medium"
                >
                  <option value="Unfinished To-Do tasks">Unfinished To-Do tasks</option>
                  <option value="Defective installation / craftsmanship defect">Defective installation / craftsmanship defect</option>
                  <option value="Property damage or scratch">Property damage or scratch</option>
                  <option value="Site clean-up or debris left behind">Site clean-up or debris left behind</option>
                  <option value="Other concern">Other concern</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Describe Problem in Detail *
                </label>
                <textarea
                  value={problemDescription}
                  onChange={e => setProblemDescription(e.target.value)}
                  placeholder="Explain exactly what is missing, incomplete, or requires corrective action..."
                  rows={3}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-rose-600 outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReportProblemModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReportProblem(currentJob.id)}
                className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                Report Issue & Pause Clock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Job Detail Popup Modal */}
      {modalJob && (
        <UniversalJobDetailModal
          isOpen={Boolean(modalJob)}
          job={modalJob}
          onClose={() => setModalJob(null)}
          userRole="customer"
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
          userRole="customer"
          workers={workers}
          onClose={() => setInspectionModalJob(null)}
          onUpdateJobs={(updatedJobs) => {
            onUpdateJobs(updatedJobs);
            if (inspectionModalJob) {
              const updatedSelf = updatedJobs.find(j => j.id === inspectionModalJob.id);
              if (updatedSelf) {
                setInspectionModalJob(updatedSelf);
              }
            }
          }}
          onSendNotification={onSendNotification}
        />
      )}

    </div>
  );
}
