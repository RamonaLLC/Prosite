import { useState, useEffect, useMemo } from 'react';
import { 
  Role, WorkerProfile, CompanyCard, Job, 
  ExpensePurchase, AppNotification, UserAccount, 
  Invitation, CompanySettings 
} from './types';
import { 
  INITIAL_WORKERS, INITIAL_CARDS, INITIAL_JOBS, 
  INITIAL_EXPENSES, INITIAL_NOTIFICATIONS 
} from './data/mockData';
import AdminDashboard from './components/AdminDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import DrawingCanvas from './components/DrawingCanvas';
import NotificationBanner from './components/NotificationBanner';
import InvitationSignupModal from './components/InvitationSignupModal';
import MessagingCenterModal from './components/MessagingCenterModal';
import CompanySettingsModal from './components/CompanySettingsModal';
import { UnifiedSettingsModal } from './components/UnifiedSettingsModal';
import { NotificationsCenterModal } from './components/NotificationsCenterModal';
import { CompanyPendingRequestsModal } from './components/CompanyPendingRequestsModal';
import { GoogleWorkspaceHubModal } from './components/GoogleWorkspaceHubModal';
import LoginPage from './components/LoginPage';
import { testFirebaseConnection } from './lib/firebase';
import { 
  subscribeToJobs, 
  subscribeToWorkers, 
  syncJobToFirestore, 
  syncWorkerToFirestore, 
  seedInitialFirestoreData 
} from './services/firestoreService';
import { 
  Building, HardHat, Home, Bell, Calendar,
  CreditCard, Clock, Sparkles, UserCheck, MessageSquare,
  Settings, Mail, Shield, UserPlus, LogOut, CheckCircle,
  Moon, Sun, Video, FileText
} from 'lucide-react';

// Generated construction background images for ProSite
// @ts-ignore
import blueprintBg from './assets/images/blueprint_bg_1782156258737.jpg';
// @ts-ignore
import framingBg from './assets/images/framing_bg_1782156269852.jpg';
// @ts-ignore
import houseExteriorBg from './assets/images/house_exterior_bg_1782156282945.jpg';

export default function App() {
  // Active Authenticated User Account (Agent, Company, Manager, Employee)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('prosite_active_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Active Account / Role State (Agent/Customer, Company, Manager, Employee)
  const [activeRole, setActiveRole] = useState<Role>('company');

  // Global persistent user preference for dedicated Dark Mode (overrides role-based themes)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('prosite_dark_mode');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return true;
      }
    }
    return true; // Default to true (sleek dark slate palette)
  });

  // Unified persistent database states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [cards, setCards] = useState<CompanyCard[]>([]);
  const [expenses, setExpenses] = useState<ExpensePurchase[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Company Settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: 'Apex Structural Builders LLC',
    phone: '+1 (415) 555-0199',
    email: 'contact@apexbuilders.com',
    businessType: 'LLC',
    licenseNumber: 'CA-LIC-984210',
    insurancePolicy: 'State Farm Commercial #994-28-A',
    yearFounded: 2012,
    serviceRadiusMiles: 45,
    geofenceRadiusMiles: 1.0, // GPS geofence distance configured exclusively in company settings
    willTravel: true,
    inspectionFee: 150,
    jobCompletionPromptText: 'Are all jobs/tasks completed?'
  });

  // Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showPendingRequestsModal, setShowPendingRequestsModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWorkspaceHub, setShowWorkspaceHub] = useState(false);
  const [activeInvitationToAccept, setActiveInvitationToAccept] = useState<Invitation | null>(null);

  // Real-time Push Alert banners
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);

  // Deep-linking navigation targets from clicked notifications
  const [customerTargetJobId, setCustomerTargetJobId] = useState<string | null>(null);
  const [customerTargetView, setCustomerTargetView] = useState<'confirm_completion' | 'messages' | 'bids' | 'adjustments' | null>(null);
  const [adminTargetTab, setAdminTargetTab] = useState<'overview' | 'dispatch' | 'jobs' | 'finances' | 'analytics' | null>(null);
  const [adminTargetJobId, setAdminTargetJobId] = useState<string | null>(null);
  const [workerTargetJobId, setWorkerTargetJobId] = useState<string | null>(null);
  const [messagingInitialJobId, setMessagingInitialJobId] = useState<string | undefined>(undefined);
  const [messagingInitialRecipientId, setMessagingInitialRecipientId] = useState<string | undefined>(undefined);

  // Drawing Annotation Modal states
  const [annotationState, setAnnotationState] = useState<{
    jobId: string;
    photoId: string;
    isBefore: boolean;
  } | null>(null);

  // Initialize Firebase and real-time Firestore synchronization
  useEffect(() => {
    testFirebaseConnection();
    
    // Seed initial data if Firestore is empty (INITIAL_JOBS is empty)
    seedInitialFirestoreData(INITIAL_JOBS, INITIAL_WORKERS);

    // Subscribe to real-time Firestore jobs updates
    const unsubscribeJobs = subscribeToJobs((liveJobs) => {
      const clean = (liveJobs || []).filter(
        (j: any) => !['job-1', 'job-2', 'job-3'].includes(j.id) && !j.id?.startsWith('job-open-') && !j.id?.startsWith('inspect-job-')
      );
      setJobs(clean);
      localStorage.setItem('buildco_jobs', JSON.stringify(clean));
    });

    // Subscribe to real-time Firestore workers updates
    const unsubscribeWorkers = subscribeToWorkers((liveWorkers) => {
      setWorkers(liveWorkers || []);
      localStorage.setItem('buildco_workers', JSON.stringify(liveWorkers || []));
    });

    return () => {
      if (unsubscribeJobs) unsubscribeJobs();
      if (unsubscribeWorkers) unsubscribeWorkers();
    };
  }, []);

  // Load from LocalStorage and sanitize any legacy test records
  useEffect(() => {
    const rawJobs = localStorage.getItem('buildco_jobs');
    let loadedJobs: Job[] = [];
    if (rawJobs) {
      try {
        const parsed = JSON.parse(rawJobs);
        loadedJobs = Array.isArray(parsed)
          ? parsed.filter((j: any) => !['job-1', 'job-2', 'job-3'].includes(j.id) && !j.id?.startsWith('job-open-') && !j.id?.startsWith('inspect-job-'))
          : [];
      } catch (e) {
        loadedJobs = [];
      }
    }
    setJobs(loadedJobs);
    localStorage.setItem('buildco_jobs', JSON.stringify(loadedJobs));

    const savedWorkers = localStorage.getItem('buildco_workers');
    const savedCards = localStorage.getItem('buildco_cards');
    const savedExpenses = localStorage.getItem('buildco_expenses');
    const savedNotifications = localStorage.getItem('buildco_notifications');
    const savedInvitations = localStorage.getItem('buildco_invitations');
    const savedSettings = localStorage.getItem('buildco_settings');

    if (savedWorkers) {
      try { setWorkers(JSON.parse(savedWorkers)); } catch (e) { setWorkers(INITIAL_WORKERS); }
    } else {
      setWorkers(INITIAL_WORKERS);
    }

    if (savedCards) {
      try { setCards(JSON.parse(savedCards)); } catch (e) { setCards([]); }
    } else {
      setCards([]);
    }

    if (savedExpenses) {
      try { setExpenses(JSON.parse(savedExpenses)); } catch (e) { setExpenses([]); }
    } else {
      setExpenses([]);
    }

    if (savedNotifications) {
      try { setNotifications(JSON.parse(savedNotifications)); } catch (e) { setNotifications([]); }
    } else {
      setNotifications([]);
    }

    if (savedInvitations) {
      try { setInvitations(JSON.parse(savedInvitations)); } catch (e) {}
    }

    if (savedSettings) {
      try { setCompanySettings(JSON.parse(savedSettings)); } catch (e) {}
    }
  }, []);

  // Standard lightweight synthesized audio bell chime to bring push alerts to life
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24);
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // In-app sandbox audio may require user click/interaction state, fail silently
    }
  };

  // Helper: determine if a notification is appropriate for Customer accounts
  // Customer only gets notifications for bidding, adjustments, messages, or job completion.
  // Routine job notifications (check-ins, check-outs, expenses, crew assignments, to-dos) are never sent to customer.
  const isNotificationAllowedForCustomer = (n: AppNotification) => {
    if (n.targetRole && n.targetRole !== 'customer' && n.targetRole !== 'all') {
      return false;
    }
    const customerAllowedTypes = [
      'bid', 'offer', 'estimate', 'inspection', 'change_order', 'message', 'comment', 'completion'
    ];
    const customerAllowedActions = [
      'job_offer', 'estimate_response', 'inspection_confirm', 'change_order'
    ];
    const isAllowedType = customerAllowedTypes.includes(n.type) || (Boolean(n.actionType) && customerAllowedActions.includes(n.actionType!));
    // Explicitly exclude internal company operational job notifications
    const isExcludedJobOps = ['check-in', 'check-out', 'expense', 'todo', 'assignment'].includes(n.type);
    return isAllowedType && !isExcludedJobOps;
  };

  // Push alerts dispatch manager with role filtering
  const triggerPushAlert = (
    title: string,
    message: string,
    type: any,
    jobId?: string,
    workerId?: string,
    targetRole?: 'company' | 'manager' | 'worker' | 'employee' | 'customer' | 'all'
  ) => {
    // Automatically infer targetRole if not explicitly supplied
    let derivedRole = targetRole;
    if (!derivedRole) {
      if (['check-in', 'check-out', 'expense', 'todo', 'assignment'].includes(type)) {
        derivedRole = 'company'; // Internal job operations: do NOT send to customers
      } else if (['bid', 'estimate', 'offer', 'inspection', 'change_order', 'message', 'completion'].includes(type)) {
        derivedRole = 'all'; // Crucial notifications relevant to customer
      } else {
        derivedRole = 'all';
      }
    }

    const newAlert: AppNotification = {
      id: `alert-${Date.now()}-${Math.random()}`,
      title,
      message,
      timestamp: new Date().toISOString(),
      type,
      jobId,
      workerId,
      targetRole: derivedRole
    };

    // If currently logged in as Customer and this is a job operational notice (not bidding, adjustments, messages, or completion), suppress popup banner & audio
    const isCurrentCustomer = activeRole === 'client' || activeRole === 'customer';
    if (!isCurrentCustomer || isNotificationAllowedForCustomer(newAlert)) {
      playAlertChime();
      setActiveToasts((prev) => [newAlert, ...prev]);
    }

    setNotifications((prev) => {
      const updated = [newAlert, ...prev];
      localStorage.setItem('buildco_notifications', JSON.stringify(updated));
      return updated;
    });

    setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== newAlert.id));
    }, 4500);
  };

  // Unread alerts count filtered by user role
  const unreadAlertsCount = useMemo(() => {
    return notifications.filter((n) => {
      if (n.isRead) return false;
      if (activeRole === 'client' || activeRole === 'customer') {
        return isNotificationAllowedForCustomer(n);
      }
      if (activeRole === 'worker' || activeRole === 'employee') {
        return !n.targetRole || n.targetRole === 'worker' || n.targetRole === 'employee' || n.targetRole === 'all';
      }
      return true;
    }).length;
  }, [notifications, activeRole]);

  // Comprehensive notification navigation dispatcher
  // Makes notifications clickable across all accounts and routes to appropriate screens
  const handleNotificationClick = (n: AppNotification) => {
    // 1. Mark as read immediately
    setNotifications((prev) => {
      const updated = prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item));
      localStorage.setItem('buildco_notifications', JSON.stringify(updated));
      return updated;
    });

    // Close notifications modal if open
    setShowNotificationsModal(false);

    const typeLower = (n.type || '').toLowerCase();
    const titleLower = (n.title || '').toLowerCase();
    const messageLower = (n.message || '').toLowerCase();

    // A. MESSAGES: clicking a message notification takes you to that message screen
    if (typeLower === 'message' || typeLower === 'comment' || titleLower.includes('message') || messageLower.includes('message')) {
      if (n.jobId) {
        setMessagingInitialJobId(n.jobId);
      }
      if (n.workerId) {
        setMessagingInitialRecipientId(n.workerId);
      }
      setShowMessagesModal(true);
      return;
    }

    // B. JOB COMPLETION:
    // - Customer: takes them to the screen to confirm tasks completed and release escrow
    // - Company / Manager / Worker: takes them to that job screen
    if (typeLower === 'completion' || titleLower.includes('completion') || titleLower.includes('completed') || messageLower.includes('completed')) {
      const targetJobId = n.jobId || jobs[0]?.id;
      if (activeRole === 'client' || activeRole === 'customer') {
        setCustomerTargetJobId(targetJobId);
        setCustomerTargetView('confirm_completion');
      } else if (activeRole === 'company' || activeRole === 'manager' || activeRole === 'admin') {
        setAdminTargetTab('jobs');
        setAdminTargetJobId(targetJobId);
      } else {
        setWorkerTargetJobId(targetJobId);
      }
      return;
    }

    // C. BIDDING / ESTIMATES / OFFERS:
    if (typeLower === 'bid' || typeLower === 'offer' || typeLower === 'estimate' || n.actionType === 'job_offer' || n.actionType === 'estimate_response') {
      const targetJobId = n.jobId || jobs[0]?.id;
      if (activeRole === 'client' || activeRole === 'customer') {
        setCustomerTargetJobId(targetJobId);
        setCustomerTargetView('bids');
      } else {
        setShowPendingRequestsModal(true);
      }
      return;
    }

    // D. ADJUSTMENTS / SCOPE CHANGES:
    if (typeLower === 'change_order' || n.actionType === 'change_order' || titleLower.includes('adjustment') || titleLower.includes('change order') || titleLower.includes('service')) {
      const targetJobId = n.jobId || jobs[0]?.id;
      if (activeRole === 'client' || activeRole === 'customer') {
        setCustomerTargetJobId(targetJobId);
        setCustomerTargetView('adjustments');
      } else {
        setAdminTargetTab('jobs');
        setAdminTargetJobId(targetJobId);
      }
      return;
    }

    // E. INSPECTIONS:
    if (typeLower === 'inspection' || n.actionType === 'inspection_confirm' || titleLower.includes('inspection')) {
      const targetJobId = n.jobId || jobs[0]?.id;
      if (activeRole === 'client' || activeRole === 'customer') {
        setCustomerTargetJobId(targetJobId);
        setCustomerTargetView('bids');
      } else {
        setShowPendingRequestsModal(true);
      }
      return;
    }

    // F. CHECK-INS / CHECK-OUTS:
    if (typeLower === 'check-in' || typeLower === 'check-out') {
      if (activeRole === 'company' || activeRole === 'manager' || activeRole === 'admin') {
        setAdminTargetTab('dispatch');
        if (n.jobId) setAdminTargetJobId(n.jobId);
      } else if (activeRole === 'worker' || activeRole === 'employee') {
        if (n.jobId) setWorkerTargetJobId(n.jobId);
      }
      return;
    }

    // G. EXPENSES:
    if (typeLower === 'expense') {
      if (activeRole === 'company' || activeRole === 'manager' || activeRole === 'admin') {
        setAdminTargetTab('finances');
      } else if (activeRole === 'worker' || activeRole === 'employee') {
        if (n.jobId) setWorkerTargetJobId(n.jobId);
      }
      return;
    }

    // H. FALLBACK NAVIGATION BY JOB ID:
    if (n.jobId) {
      if (activeRole === 'client' || activeRole === 'customer') {
        setCustomerTargetJobId(n.jobId);
        setCustomerTargetView(null);
      } else if (activeRole === 'company' || activeRole === 'manager' || activeRole === 'admin') {
        setAdminTargetTab('jobs');
        setAdminTargetJobId(n.jobId);
      } else {
        setWorkerTargetJobId(n.jobId);
      }
    }
  };

  // State update propagation listeners
  const handleUpdateJobs = (newJobsList: Job[]) => {
    setJobs((prevJobs) => {
      let resolvedList = newJobsList;
      if (newJobsList.length === 1 && prevJobs.length > 1) {
        const single = newJobsList[0];
        if (prevJobs.some((j) => j.id === single.id)) {
          resolvedList = prevJobs.map((j) => (j.id === single.id ? single : j));
        } else {
          resolvedList = [single, ...prevJobs];
        }
      }
      localStorage.setItem('buildco_jobs', JSON.stringify(resolvedList));
      // Persist changes asynchronously to Firestore
      resolvedList.forEach((job) => {
        syncJobToFirestore(job).catch((err) => console.warn('Firestore job sync notice:', err));
      });
      return resolvedList;
    });
  };

  const handleUpdateWorkers = (newWorkersList: WorkerProfile[]) => {
    setWorkers(newWorkersList);
    localStorage.setItem('buildco_workers', JSON.stringify(newWorkersList));
    // Persist changes asynchronously to Firestore
    newWorkersList.forEach((worker) => {
      syncWorkerToFirestore(worker).catch((err) => console.warn('Firestore worker sync notice:', err));
    });
  };

  const handleUpdateExpenses = (newExpensesList: ExpensePurchase[]) => {
    setExpenses(newExpensesList);
    localStorage.setItem('buildco_expenses', JSON.stringify(newExpensesList));
  };

  const handleUpdateCards = (newCardsList: CompanyCard[]) => {
    setCards(newCardsList);
    localStorage.setItem('buildco_cards', JSON.stringify(newCardsList));
  };

  const handleUpdateSettings = (newSettings: CompanySettings) => {
    setCompanySettings(newSettings);
    localStorage.setItem('buildco_settings', JSON.stringify(newSettings));
    triggerPushAlert('Settings Updated', 'Company profile and operational rules saved.', 'system');
  };

  // Create & Dispatch new invitation
  const handleSendInvite = (email: string, role: 'manager' | 'employee', managerCode?: string) => {
    const newInvite: Invitation = {
      id: `inv-${Date.now()}`,
      companyId: 'comp-1',
      companyName: companySettings.companyName,
      email,
      role,
      managerCode,
      token: `tok-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString()
    };

    const updated = [newInvite, ...invitations];
    setInvitations(updated);
    localStorage.setItem('buildco_invitations', JSON.stringify(updated));

    triggerPushAlert(
      `Invitation Sent to ${role.toUpperCase()}`,
      `Sent email invitation to ${email}${managerCode ? ` with 5-digit Manager Code: ${managerCode}` : ''}.`,
      'system'
    );
  };

  // Complete Account Creation from Invitation
  const handleCompleteInvitationSignup = (accountData: any) => {
    // If it's an employee or manager, create worker profile or account
    const newWorker: WorkerProfile = {
      id: `w-${Date.now()}`,
      name: accountData.name,
      position: accountData.role === 'manager' ? 'Site Manager' : (accountData.trade || 'Field Specialist'),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      email: accountData.email,
      phone: accountData.phone,
      address: accountData.address,
      isAtJob: false,
      isIdle: true
    };

    handleUpdateWorkers([newWorker, ...workers]);
    
    // Mark invite as accepted
    if (activeInvitationToAccept) {
      const updatedInvites = invitations.map(inv => 
        inv.id === activeInvitationToAccept.id ? { ...inv, status: 'accepted' as const } : inv
      );
      setInvitations(updatedInvites);
      localStorage.setItem('buildco_invitations', JSON.stringify(updatedInvites));
    }

    setActiveInvitationToAccept(null);
    setActiveRole(accountData.role);

    triggerPushAlert(
      'Account Activated 🎉',
      `Welcome ${accountData.name}! Your ${accountData.role.toUpperCase()} profile is ready.`,
      'system'
    );
  };

  // Launch photo markup viewport
  const handleOpenPhotoAnnotation = (jobId: string, photoId: string, isBefore: boolean) => {
    setAnnotationState({ jobId, photoId, isBefore });
  };

  // Apply markup markings saves onto original image parameters on persistent list
  const handleSaveAnnotation = (annotatedBase64: string) => {
    if (!annotationState) return;
    const { jobId, photoId, isBefore } = annotationState;

    const authorRole = activeRole;
    const authorName = 
      activeRole === 'company' ? companySettings.companyName : 
      activeRole === 'manager' ? 'Site Manager' :
      activeRole === 'employee' || activeRole === 'worker' ? 'Field Crew' : 
      'Sarah Jenkins (Customer)';

    const updatedJobs = jobs.map((j) => {
      if (j.id === jobId) {
        const photos = j.beforeAfterPhotos.map((p) => {
          if (p.id === photoId) {
            const logComment = {
              id: `comment-annot-${Date.now()}`,
              authorRole,
              authorName,
              text: `🎨 Saved drawing markup annotations on this picture to highlight details.`,
              createdAt: new Date().toISOString()
            };

            return {
              ...p,
              beforeImage: isBefore ? annotatedBase64 : p.beforeImage,
              afterImage: !isBefore ? annotatedBase64 : p.afterImage,
              comments: [...(p.comments || []), logComment]
            };
          }
          return p;
        });
        return { ...j, beforeAfterPhotos: photos };
      }
      return j;
    });

    handleUpdateJobs(updatedJobs);
    setAnnotationState(null);

    triggerPushAlert(
      'Photo Drawing Annotations Saved! 🎨',
      `${authorName} drew details on photo inside "${jobs.find(j => j.id === jobId)?.title.substring(0, 30)}..."`,
      'comment',
      jobId
    );
  };

  // Floating toast dismiss action
  const handleDismissToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Get active photo imageUrl for Drawing Board
  // Toggle and persist Dark Mode preference globally
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('prosite_dark_mode', JSON.stringify(next));
      triggerPushAlert(
        next ? '🌙 Slate Dark Mode Enabled' : '☀️ Role-Based Theme Restored',
        next 
          ? 'Global persistent dark slate palette is now active across all portals and roles.' 
          : 'Standard role-specific translucent theme is now active.',
        'system'
      );
      return next;
    });
  };

  const getAnnotationImageSource = () => {
    if (!annotationState) return '';
    const { jobId, photoId, isBefore } = annotationState;
    const jobSelected = jobs.find((j) => j.id === jobId);
    const photoSelected = jobSelected?.beforeAfterPhotos.find((p) => p.id === photoId);
    return isBefore ? photoSelected?.beforeImage || '' : photoSelected?.afterImage || '';
  };

  const getAnnotationTitle = () => {
    if (!annotationState) return '';
    const { jobId, photoId, isBefore } = annotationState;
    const jobSelected = jobs.find((j) => j.id === jobId);
    const photoSelected = jobSelected?.beforeAfterPhotos.find((p) => p.id === photoId);
    return `${jobSelected?.address} — ${photoSelected?.title} (${isBefore ? 'Before View' : 'After View'})`;
  };

  return (
    <div className={`min-h-screen text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative bg-slate-950 overflow-x-hidden transition-colors duration-500 ${
      isDarkMode ? 'dark-mode-override dark' : (
        activeRole === 'company' || activeRole === 'admin' ? 'admin-theme' : 
        activeRole === 'manager' ? 'manager-theme' :
        activeRole === 'worker' || activeRole === 'employee' ? 'worker-theme' : 
        'client-theme'
      )
    }`}>
      
      {/* 1. Dynamic construction background images */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${
            activeRole === 'company' || activeRole === 'admin' ? blueprintBg : 
            activeRole === 'worker' || activeRole === 'employee' ? framingBg : 
            houseExteriorBg
          })` 
        }}
      />
      {/* 2. Backdrop dark overlay for crisp legibility */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-all duration-500 ${
        isDarkMode ? 'bg-slate-950/90 backdrop-blur-[5px]' : 'bg-slate-950/85 backdrop-blur-[4px]'
      }`} />

      {/* Floating Push Notification Banner layer */}
      <NotificationBanner 
        notifications={
          (activeRole === 'client' || activeRole === 'customer')
            ? activeToasts.filter(isNotificationAllowedForCustomer)
            : activeToasts
        } 
        onDismiss={handleDismissToast} 
        onNotificationClick={handleNotificationClick}
      />

      {/* Top Main Navigation Menu Bar */}
      <header className="shrink-0 sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 text-white backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row justify-between items-center gap-3.5">
          
          {/* Company branding */}
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl font-bold flex items-center justify-center shadow-lg transition-colors ${
              activeRole === 'worker' || activeRole === 'employee' ? 'bg-amber-500 text-slate-950' : 
              activeRole === 'manager' ? 'bg-emerald-600 text-white' :
              activeRole === 'client' || activeRole === 'customer' ? 'bg-purple-600 text-white' :
              'bg-blue-600 text-white'
            }`}>
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-tight flex items-center gap-2 text-white">
                ProSite
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase font-bold border border-slate-700">
                  {activeRole === 'admin' ? 'Company' : activeRole}
                </span>
              </h1>
              <p className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
                {companySettings.companyName}
              </p>
            </div>
          </div>

          {/* Core RBAC Role Switcher with the 4 exact roles */}
          <div className="p-1 rounded-xl flex gap-1 bg-slate-950 border border-slate-800 shadow-inner flex-wrap justify-center">
            
            {/* 1. Customer */}
            <button
              onClick={() => setActiveRole('client')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeRole === 'client' || activeRole === 'customer'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Customer
            </button>

            {/* 2. Company (Full Access + Finances) */}
            <button
              onClick={() => setActiveRole('company')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeRole === 'company' || activeRole === 'admin'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Company
            </button>

            {/* 3. Manager (Operational Sub-account, No Finances) */}
            <button
              onClick={() => setActiveRole('manager')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeRole === 'manager'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Manager
            </button>

            {/* 4. Employee (Field Worker) */}
            <button
              onClick={() => setActiveRole('worker')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeRole === 'worker' || activeRole === 'employee'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              Employee
            </button>
          </div>

          {/* Right Action Tools: Dark Mode, Messages, Settings, Invitations */}
          <div className="flex items-center gap-2 text-xs font-mono">
            
            {/* Global Persistent Dark Mode Toggle Button */}
            <button
              id="app-dark-mode-toggle"
              onClick={toggleDarkMode}
              className={`p-2 border rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-750 shadow-inner'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-900'
              }`}
              title={isDarkMode ? 'Dark Mode: ON (Overrides role themes with slate palette)' : 'Dark Mode: OFF (Click to enable global slate palette)'}
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <>
                  <Moon className="w-4 h-4 fill-amber-300/30 text-amber-300" />
                  <span className="hidden md:inline font-bold text-slate-200">Dark</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    ON
                  </span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-slate-400" />
                  <span className="hidden md:inline font-bold text-slate-300">Theme</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700">
                    AUTO
                  </span>
                </>
              )}
            </button>

            {/* Notifications Center with 3-priority color indicator */}
            <button
              id="app-notifications-btn"
              onClick={() => setShowNotificationsModal(true)}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-xl transition flex items-center gap-1.5 cursor-pointer relative"
              title="Notifications Center (Priority Action Queue & 31-day History)"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline font-bold">Alerts</span>
              {unreadAlertsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Google Workspace Hub Button (Calendar, Meet, Chat) */}
            <button
              id="app-workspace-hub-btn"
              onClick={() => setShowWorkspaceHub(true)}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-blue-500/30 text-blue-400 hover:text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open Google Workspace Hub (Calendar, Meet, Chat)"
            >
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="hidden lg:inline font-bold">Google Workspace</span>
            </button>

            {/* Requests Inbox (Company & Manager only) */}
            {(activeRole === 'company' || activeRole === 'manager' || activeRole === 'admin') && (
              <button
                id="app-pending-requests-btn"
                onClick={() => setShowPendingRequestsModal(true)}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-amber-400 hover:text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Company Pending Requests (Inspections, Offers & Change Orders)"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="hidden lg:inline font-bold">Requests</span>
              </button>
            )}

            {/* Messages Center Button */}
            <button
              id="app-messages-btn"
              onClick={() => setShowMessagesModal(true)}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Open Role-Based Messaging Center"
            >
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline font-bold">Messages</span>
            </button>

            {/* Test Pending Invitations Trigger */}
            <button
              onClick={() => {
                const pending = invitations.find(i => i.status === 'pending');
                if (pending) {
                  setActiveInvitationToAccept(pending);
                } else {
                  // create quick demo invite for testing
                  const demoInv: Invitation = {
                    id: `inv-${Date.now()}`,
                    companyId: 'comp-1',
                    companyName: companySettings.companyName,
                    email: 'alex.rivera@example.com',
                    role: 'manager',
                    managerCode: '91204',
                    token: 'tok-demo-91204',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString()
                  };
                  setActiveInvitationToAccept(demoInv);
                }
              }}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Test Acceptance of Invitation Link"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline font-bold">Test Invite Flow</span>
            </button>

            {/* Unified Settings Button */}
            <button
              id="app-settings-btn"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Operational & Appearance Settings"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="hidden md:inline font-bold">Settings</span>
            </button>

          </div>

        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        
        {/* Render Active Portal Module */}
        {(activeRole === 'company' || activeRole === 'admin') && (
          <AdminDashboard
            userRole="company"
            jobs={jobs}
            workers={workers}
            cards={cards}
            expenses={expenses}
            notifications={notifications}
            companySettings={companySettings}
            onUpdateJobs={handleUpdateJobs}
            onUpdateWorkers={handleUpdateWorkers}
            onUpdateExpenses={handleUpdateExpenses}
            onUpdateCards={handleUpdateCards}
            onAnnotatePhoto={handleOpenPhotoAnnotation}
            onSendNotification={triggerPushAlert}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenMessages={() => setShowMessagesModal(true)}
            onSendInvite={handleSendInvite}
            targetTab={adminTargetTab}
            targetJobId={adminTargetJobId}
            onClearTarget={() => {
              setAdminTargetTab(null);
              setAdminTargetJobId(null);
            }}
            onNotificationClick={handleNotificationClick}
          />
        )}

        {activeRole === 'manager' && (
          <AdminDashboard
            userRole="manager"
            jobs={jobs}
            workers={workers}
            cards={cards}
            expenses={expenses}
            notifications={notifications}
            companySettings={companySettings}
            onUpdateJobs={handleUpdateJobs}
            onUpdateWorkers={handleUpdateWorkers}
            onUpdateExpenses={handleUpdateExpenses}
            onUpdateCards={handleUpdateCards}
            onAnnotatePhoto={handleOpenPhotoAnnotation}
            onSendNotification={triggerPushAlert}
            onOpenMessages={() => setShowMessagesModal(true)}
            onSendInvite={handleSendInvite}
            targetTab={adminTargetTab}
            targetJobId={adminTargetJobId}
            onClearTarget={() => {
              setAdminTargetTab(null);
              setAdminTargetJobId(null);
            }}
            onNotificationClick={handleNotificationClick}
          />
        )}

        {(activeRole === 'worker' || activeRole === 'employee') && (
          <WorkerDashboard
            jobs={jobs}
            workers={workers}
            cards={cards}
            expenses={expenses}
            companySettings={companySettings}
            onUpdateWorkers={handleUpdateWorkers}
            onUpdateJobs={handleUpdateJobs}
            onUpdateExpenses={handleUpdateExpenses}
            onUpdateCards={handleUpdateCards}
            onAnnotatePhoto={handleOpenPhotoAnnotation}
            onSendNotification={triggerPushAlert}
            targetJobId={workerTargetJobId}
            onClearTarget={() => setWorkerTargetJobId(null)}
            onNotificationClick={handleNotificationClick}
          />
        )}

        {(activeRole === 'client' || activeRole === 'customer') && (
          <CustomerDashboard
            jobs={jobs}
            workers={workers}
            expenses={expenses}
            notifications={notifications}
            onUpdateJobs={handleUpdateJobs}
            onAnnotatePhoto={handleOpenPhotoAnnotation}
            onSendNotification={triggerPushAlert}
            targetJobId={customerTargetJobId}
            targetView={customerTargetView}
            onClearTarget={() => {
              setCustomerTargetJobId(null);
              setCustomerTargetView(null);
            }}
            onNotificationClick={handleNotificationClick}
          />
        )}
      </main>

      {/* ==================== GLOBAL MODALS ==================== */}

      {/* Google Workspace Hub Modal (Calendar, Meet, Chat) */}
      <GoogleWorkspaceHubModal
        isOpen={showWorkspaceHub}
        onClose={() => setShowWorkspaceHub(false)}
        jobs={jobs}
        activeRole={activeRole}
        onTriggerAlert={triggerPushAlert}
        onSelectJob={(jobId) => {
          setShowWorkspaceHub(false);
          if (activeRole === 'client' || activeRole === 'customer') {
            setCustomerTargetJobId(jobId);
          } else if (activeRole === 'worker' || activeRole === 'employee') {
            setWorkerTargetJobId(jobId);
          } else {
            setAdminTargetTab('jobs');
            setAdminTargetJobId(jobId);
          }
        }}
      />

      {/* 1. Role-Based Messaging Center Modal */}
      <MessagingCenterModal
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        userRole={activeRole}
        currentUserId={activeRole === 'company' ? 'comp-1' : activeRole === 'manager' ? 'mgr-1' : 'user-1'}
        currentUserName={
          activeRole === 'company' ? companySettings.companyName : 
          activeRole === 'manager' ? 'Site Manager' : 
          activeRole === 'worker' || activeRole === 'employee' ? 'Field Crew' : 
          'Sarah Jenkins'
        }
        jobs={jobs}
        workers={workers}
        initialJobId={messagingInitialJobId}
        initialRecipientId={messagingInitialRecipientId}
        onSendMessage={(msg) => {
          triggerPushAlert(
            `Message sent to ${msg.recipientName}`,
            msg.text,
            'message',
            msg.jobId
          );
        }}
        onSelectJob={(jobId) => {
          setShowMessagesModal(false);
          if (activeRole === 'client' || activeRole === 'customer') {
            setCustomerTargetJobId(jobId);
          } else if (activeRole === 'worker' || activeRole === 'employee') {
            setWorkerTargetJobId(jobId);
          } else {
            setAdminTargetTab('jobs');
            setAdminTargetJobId(jobId);
          }
        }}
      />

      {/* 2. Unified Settings Modal */}
      <UnifiedSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        companySettings={companySettings}
        onSaveCompanySettings={handleUpdateSettings}
        activeRole={activeRole}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Notifications Center Modal */}
      <NotificationsCenterModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        jobs={jobs}
        workers={workers}
        activeRole={activeRole}
        onUpdateNotifications={(updated) => {
          setNotifications(updated);
          localStorage.setItem('buildco_notifications', JSON.stringify(updated));
        }}
        onMarkAsRead={(id) => {
          const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
          setNotifications(updated);
          localStorage.setItem('buildco_notifications', JSON.stringify(updated));
        }}
        onClearAll={() => {
          setNotifications([]);
          localStorage.removeItem('buildco_notifications');
        }}
        onNotificationClick={handleNotificationClick}
        onSelectJob={(jobId) => {
          setShowNotificationsModal(false);
          if (activeRole === 'client' || activeRole === 'customer') {
            setCustomerTargetJobId(jobId);
          } else if (activeRole === 'worker' || activeRole === 'employee') {
            setWorkerTargetJobId(jobId);
          } else {
            setAdminTargetTab('jobs');
            setAdminTargetJobId(jobId);
          }
        }}
      />

      {/* Company Pending Requests Modal */}
      <CompanyPendingRequestsModal
        isOpen={showPendingRequestsModal}
        onClose={() => setShowPendingRequestsModal(false)}
        jobs={jobs}
        onUpdateJobs={handleUpdateJobs}
        onSendNotification={(title, message, type, jobId) => {
          triggerPushAlert(title, message, type);
        }}
        onAcceptRequest={(jobId) => {
          const updated = jobs.map(j => j.id === jobId ? { ...j, status: 'in-progress' as const } : j);
          handleUpdateJobs(updated);
          triggerPushAlert('Request Approved', `Job request approved and marked in-progress.`, 'system');
        }}
        onDeclineRequest={(jobId) => {
          const updated = jobs.map(j => j.id === jobId ? { ...j, status: 'cancelled' as const } : j);
          handleUpdateJobs(updated);
          triggerPushAlert('Request Declined', `Job request declined.`, 'system');
        }}
        onSelectJob={(jobId) => {
          setShowPendingRequestsModal(false);
          if (activeRole === 'client' || activeRole === 'customer') {
            setCustomerTargetJobId(jobId);
          } else if (activeRole === 'worker' || activeRole === 'employee') {
            setWorkerTargetJobId(jobId);
          } else {
            setAdminTargetTab('jobs');
            setAdminTargetJobId(jobId);
          }
        }}
      />

      {/* 3. Invitation Signup & Onboarding Flow Modal */}
      <InvitationSignupModal
        isOpen={showInviteModal || !!activeInvitationToAccept}
        onClose={() => {
          setShowInviteModal(false);
          setActiveInvitationToAccept(null);
        }}
        invitations={invitations}
        onCompleteSignup={(account, newWorker) => {
          if (newWorker) {
            handleUpdateWorkers([newWorker, ...workers]);
          }
          if (account.role === 'customer') {
            setActiveRole('customer');
          } else if (account.role === 'company') {
            setActiveRole('company');
          } else if (account.role === 'manager') {
            setActiveRole('manager');
          } else {
            setActiveRole('employee');
          }
          setShowInviteModal(false);
          setActiveInvitationToAccept(null);
          triggerPushAlert('Welcome!', `Account created for ${account.name} (${account.role}).`, 'system');
        }}
        onAcceptInvitation={(invId, profile) => {
          const updatedInvites = invitations.map(inv => 
            inv.id === invId ? { ...inv, status: 'accepted' as const } : inv
          );
          setInvitations(updatedInvites);
          localStorage.setItem('buildco_invitations', JSON.stringify(updatedInvites));
        }}
      />

      {/* 4. Drawing markup Canvas Overlay Modal */}
      {annotationState && (
        <DrawingCanvas
          imageUrl={getAnnotationImageSource()}
          title={getAnnotationTitle()}
          onSave={handleSaveAnnotation}
          onCancel={() => setAnnotationState(null)}
        />
      )}

      {/* Base platform footer */}
      <footer className="shrink-0 py-4 border-t border-slate-800 relative z-10 bg-slate-900/90 text-slate-400 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-[11px] gap-2 font-mono">
          <span>© 2026 ProSite Contractor Suite • Unified RBAC Platform (Customer, Company, Manager, Employee)</span>
          <div className="flex gap-4">
            <span className="text-emerald-400 font-semibold">• Live Operational Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
