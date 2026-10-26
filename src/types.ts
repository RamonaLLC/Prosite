export type Role = 'company' | 'manager' | 'employee' | 'customer' | 'agent' | 'admin' | 'worker' | 'client';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'company' | 'manager' | 'employee' | 'customer' | 'agent';
  companyId?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  additionalAddresses?: string[];
  preferredContact?: 'In-App' | 'SMS' | 'Call' | 'Email';
  avatar?: string;
  aboutMe?: string;
  theme?: ConstructionTheme;
  favoritedCompanyIds?: string[];
  stripe_customer_id?: string;
  licenseNumber?: string;
  licenseState?: string;
  regulatoryBoard?: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: 'manager' | 'employee';
  companyId: string;
  companyName: string;
  managerCode?: string; // 5-digit code for manager
  token?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt?: string;
}

export interface WorkerProfile {
  id: string;
  name: string;
  avatar: string;
  position: string; // Company-assigned Job Role
  jobRole?: string; // Company-assigned Job Role
  email?: string;
  role?: 'manager' | 'employee';
  isAtJob: boolean;
  isIdle?: boolean; // when manually placed in idle
  currentJobId?: string;
  lastCheckInAt?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  address?: string;
  aboutMe?: string;
  totalJobSiteHours?: number;
  assignedCardIds?: string[];
}

export type Worker = WorkerProfile;

export interface CompanyCard {
  id: string;
  cardNumber: string;
  cardHolder?: string;
  cardType?: 'Visa' | 'MasterCard' | 'Amex' | string;
  color?: string;
  limit: number;
  spent?: number;
  spentThisMonth?: number;
  isActive?: boolean;
  name?: string;
  cardName?: string;
  nickname?: string;
  last4?: string;
  lastFour?: string;
  monthlyLimit?: number;
  dailyLimit?: number;
  currentMonthSpend?: number;
  status?: 'active' | 'suspended' | 'canceled' | string;
  brand?: string;
  category?: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  usageCategory?: 'GAS' | 'EXPENSES' | 'GAS / EXPENSES';
}

export interface ExpensePurchase {
  id: string;
  jobId: string;
  jobAddress?: string;
  description: string;
  amount: number;
  category: 'Materials' | 'Fuel' | 'Gas' | 'Tools' | 'Permits' | 'Other';
  workerId: string;
  workerName: string;
  cardId?: string;
  cardUsedId?: string;
  merchant?: string;
  date: string;
  receiptImage?: string; // base64 string or mock path
}

export interface SubJob {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  completedByWorkerId?: string;
  completedByWorkerName?: string;
  completedAt?: string;
  photoUrl?: string; // uploaded through this specific To-Do task
}

export interface PhotoComment {
  id: string;
  authorRole: Role;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface BeforeAfterPhoto {
  id: string;
  title: string;
  beforeImage?: string; // Base64 or URL (primary fallback)
  afterImage?: string; // Base64 or URL (primary fallback)
  beforeImages?: string[]; // Multiple Before images list
  afterImages?: string[]; // Multiple After images list
  comments: PhotoComment[];
  toDoTaskId?: string; // Associated To-Do task if uploaded through To-Do
  uploadedByWorkerId?: string;
  uploadedByWorkerName?: string;
  uploadedAt?: string;
}

export interface JobComment {
  id: string;
  authorRole: Role;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  recipientId: string;
  recipientName: string;
  jobId?: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface CustomerReview {
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface WorkDayLog {
  date: string; // 'YYYY-MM-DD'
  worked: boolean;
  notes?: string;
}

export interface JobSiteTimeLog {
  id: string;
  workerId: string;
  workerName: string;
  jobId: string;
  jobTitle: string;
  jobAddress: string;
  date: string; // 'YYYY-MM-DD'
  arrivalTime: string;
  departureTime?: string;
  hours: number;
}

export interface Job {
  id: string;
  title: string;
  clientName: string;
  clientPhone?: string;
  clientEmail: string;
  address: string;
  description: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  estimatedDuration?: string; // e.g., "3 Weeks" or "To Be Complete"
  status: 'planning' | 'in-progress' | 'completed' | 'open-bid' | 'pending';
  jobValue?: number; // monetary value for Total Job Value reporting
  completedAt?: string; // date when officially confirmed complete
  workerAllTasksCompleted?: boolean;
  workerCompletedAt?: string;
  employeeConfirmedComplete?: boolean;
  completionRecord?: {
    confirmedByWorkerId: string;
    confirmedByWorkerName: string;
    confirmedAt: string;
    finalChecklist: SubJob[];
    notes?: string;
    managerConfirmed?: boolean;
    managerConfirmedAt?: string;
  };

  // 24-Hour Completion Window & Customer Options
  completionConfirmationTimestamp?: string;
  customerConfirmationWindowExpiresAt?: string; // 24 hours after confirmation
  customerConfirmationStatus?: 'pending_confirmation' | 'customer_confirmed' | 'additional_services_requested' | 'problem_reported' | 'auto_finalized';
  customerConfirmationResolvedAt?: string;
  isJobLockedAfterCompletion?: boolean;

  // Additional Services Request workflow
  additionalServicesRequests?: AdditionalServiceItem[];

  // Problem / Dispute reporting
  reportedProblem?: JobProblemDispute;
  disputeRecord?: JobDisputeRecord;

  // $5 Job Posting Fee and publishing flow
  jobPostingFeePaid?: boolean;
  publishingStatus?: 'draft' | 'published';
  stripeJobPostingPaymentId?: string;

  // Customer -> Company Payment tracking (100% to company, $0 platform fee)
  paymentAmount?: number;
  paymentStatus?: 'unpaid' | 'authorized' | 'paid' | 'released' | 'refunded' | 'held_for_dispute' | 'Disputed / Funds Held';
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  paymentReleasedAt?: string;
  history?: { id: string; timestamp: string; action: string; actor: string; details?: string }[];

  hasInitialGeofenceArrival?: boolean; // whether first verified geofence arrived
  firstGeofenceArrivalTime?: string;
  assignedWorkers: string[]; // Worker ids
  checklist: SubJob[]; // "Job To-Do"
  beforeAfterPhotos: BeforeAfterPhoto[];
  workDayLogs: Record<string, WorkDayLog>; // keyed by date 'YYYY-MM-DD'
  comments: JobComment[];
  review?: CustomerReview;
  scopeAccuracyAgreement?: boolean;
  
  // Custom interactive workflow extensions
  inspectionStatus?: 'proposed' | 'scheduled' | 'confirmed' | 'completed';
  inspectionDate?: string;
  inspectionTime?: string;
  inspectionFee?: number;
  inspectionFeePaid?: boolean;
  inspectionFeeDeducted?: boolean;
  inspectionFeeStatus?: string;
  inspectionConvertedToJob?: boolean;
  originalJobValue?: number;
  companyId?: string;
  companyName?: string;
  isOpenWork?: boolean;
  estimates?: {
    id: string;
    currentAmount: number;
    clientCounterPrice?: number;
    companyCounterPrice?: number;
    lines?: { title: string; price: number }[];
    originalAmount?: number;
    notes?: string;
    status: 'pending' | 'awaiting-client' | 'awaiting-company' | 'approved' | 'declined';
    history: {
      authorRole: Role;
      authorName: string;
      text: string;
      timestamp: string;
    }[];
  }[];
  bids?: {
    id: string;
    companyId?: string;
    companyName: string;
    price?: number;
    amount?: number;
    days?: number;
    proposedDurationDays?: number;
    estimateLines?: { title: string; price: number }[];
    message: string;
    approved?: boolean;
    companyRating?: number;
    status?: string;
  }[];
  proposals?: {
    id: string;
    title: string;
    price: number;
    description: string;
    status: 'pending' | 'approved' | 'declined';
    createdAt: string;
    approvedAt?: string;
  }[];
  jobOffers?: JobOffer[];
  changeOrders?: ChangeOrder[];
  inspectionRequest?: InspectionRequest;
  inspectionScope?: InspectionScope;
  isActualStarted?: boolean; // Actual start when geofence arrival is confirmed
  actualStartedAt?: string;
  isPromoted?: boolean;
  isOpenJob?: boolean;
  postedAt?: string;
  offeredPrice?: number;
  expectedStartDate?: string;
  acceptedOfferCompanyId?: string;
  openJobPostedAt?: string;
  createdAt?: string;
}

export interface InspectionScopeTask {
  id: string;
  description: string;
  comment: string;
  photos: string[];
  cost: number;
}

export interface InspectionScopeRevision {
  revisedAt: string;
  revisedBy: string;
  tasks: InspectionScopeTask[];
  totalCost: number;
  notes?: string;
}

export interface InspectionScope {
  id: string;
  jobId: string;
  submittedByWorkerId?: string;
  submittedByWorkerName?: string;
  submittedAt: string;
  tasks: InspectionScopeTask[];
  totalCost: number;
  status: 'submitted_to_company' | 'company_approved' | 'customer_approved' | 'customer_rejected';
  companyReviewedAt?: string;
  companyReviewedBy?: string;
  companyRevisions?: InspectionScopeRevision[];
  customerDecisionAt?: string;
  rejectionReason?: string;
}

export interface AdditionalServiceItem {
  id: string;
  title?: string;
  description: string;
  details: string;
  pictures?: string[];
  quotedPrice?: number;
  estimatedBudget?: number;
  status: 'pending_company_quote' | 'quoted_pending_customer_approval' | 'customer_approved' | 'customer_denied' | 'company_denied';
  companyDeniedReason?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface JobDisputeRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  jobAddress: string;
  customerName: string;
  customerEmail: string;
  companyName: string;
  companyId?: string;
  complaint: string;
  reason?: 'Work Not Completed' | 'Quality / Defect Issues' | 'Damage to Property' | 'Unauthorized Charges / Scope Discrepancy' | 'Safety Hazard / Code Non-Compliance' | 'Other' | string;
  requestedResolution?: 'Full Refund' | 'Partial Refund' | 'Re-work / Correction by Company' | 'Customer Service Arbitration' | string;
  requestedRefundAmount?: number;
  customerPhotos?: string[];
  reportedAt: string;
  sentToCustomerServiceEmail: string; // strictly 'devinjjenkins90@gmail.com'
  responseDeadline?: string; // 7 business days
  status: 'open' | 'under_review' | 'resolved';
  fundsHeld: boolean;
  heldAmount: number;
  companyResponse?: {
    action?: 'accept_resolution' | 'alternative_offer' | 'reject_dispute' | string;
    comments: string;
    alternativeOfferDetails?: string;
    photos?: string[];
    submittedAt: string;
    accountResponsible: string;
  };
  resolution?: {
    resolvedInFavorOf: 'company' | 'customer' | 'mutual_agreement';
    resolvedAt: string;
    resolutionNotes: string;
    resolvedBy: string; // e.g. 'Customer Service (devinjjenkins90@gmail.com)'
  };
}

export interface JobProblemDispute {
  id: string;
  description: string;
  category: 'workmanship' | 'incomplete_task' | 'property_damage' | 'unauthorized_deviation' | 'other' | string;
  photos?: string[];
  status: 'open' | 'under_review' | 'resolved';
  resolved?: boolean;
  reportedAt: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  attemptCount: number; // Prevent unlimited duplicate problems for the same completion
}

export interface CustomerPaymentMethod {
  id: string; // Stripe PaymentMethod ID (pm_...)
  brand: string; // 'visa' | 'mastercard' | 'amex' | 'discover'
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  type: 'company_subscription' | 'job_posting_fee' | 'customer_job_payment' | 'inspection_fee' | 'refund';
  amount: number;
  currency: string;
  status: 'authorized' | 'captured' | 'succeeded' | 'refunded' | 'cancelled' | 'pending';
  platformFee: number; // STRICTLY 0 for customer payments and inspections!
  companyAmount: number; // 100% of customer payments and inspections goes to company
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeConnectedAccountId?: string;
  jobId?: string;
  jobTitle?: string;
  inspectionId?: string;
  companyId?: string;
  companyName?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  description: string;
  paymentMethodId?: string;
  paymentMethodSummary?: string;
  createdAt: string;
  capturedAt?: string;
  refundedAt?: string;
}

export type SubscriptionPlanTier = 'professional' | 'business';

export interface CompanySubscription {
  plan: SubscriptionPlanTier; // Professional ($29) or Business ($59)
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  pricePerMonth: number; // 29 or 59
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export type ConstructionTheme = 
  | 'wood_grain' 
  | 'concrete' 
  | 'blueprint' 
  | 'steel' 
  | 'industrial_orange' 
  | 'clean_jobsite' 
  | 'asphalt' 
  | 'natural_stone';

export interface EmployeeSchedulingWindow {
  earliestStartTime: string; // e.g. '08:00'
  latestEndTime: string;     // e.g. '17:00'
}

export interface JobOffer {
  id: string;
  jobId?: string;
  jobTitle: string;
  senderRole: 'customer' | 'company';
  senderName: string;
  companyId?: string;
  companyName?: string;
  clientEmail?: string;
  clientName?: string;
  proposedPrice: number;
  proposedDuration: string;
  scopeSummary: string;
  status: 'pending' | 'accepted' | 'denied' | 'countered';
  counterPrice?: number;
  counterNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InspectionRequest {
  id: string;
  jobId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  propertyAddress: string;
  requestedDate: string;
  requestedTime: string;
  inspectionFee: number;
  feePaid: boolean;
  paymentStatus?: 'authorized' | 'captured' | 'refunded' | 'cancelled' | 'pending';
  stripePaymentIntentId?: string;
  paymentMethodId?: string;
  paymentMethodSummary?: string;
  authorizedAt?: string;
  status: 'pending' | 'confirmed' | 'denied' | 'rescheduled' | 'completed';
  proposedAlternativeDate?: string;
  proposedAlternativeTime?: string;
  rescheduleOptions?: { id: string; date: string; time: string }[];
  contactRequested?: boolean;
  issueReported?: {
    reportedBy: string;
    comment: string;
    photos?: string[];
    reportedAt: string;
    type: 'reschedule_requested' | 'issue_noted';
  };
  createdAt: string;
  notes?: string;
  completedAt?: string;
  refundedAt?: string;
}

export interface ChangeOrder {
  id: string;
  jobId: string;
  jobTitle: string;
  title: string;
  description: string;
  costImpact: number;
  timeImpactDays: number;
  requestedBy: Role;
  status: 'pending' | 'accepted' | 'denied';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'check-in' | 'check-out' | 'comment' | 'expense' | 'review' | 'system' | 'bid' | 'estimate' | 'todo' | 'completion' | 'assignment' | 'message' | 'inspection' | 'offer' | 'change_order' | 'dispute';
  targetRole?: 'company' | 'manager' | 'employee' | 'customer' | 'worker' | 'client' | 'all';
  workerId?: string;
  jobId?: string;
  isRead?: boolean;
  
  // Action-required priority system (Green <24h, Orange >48h, Red >72h)
  actionRequired?: boolean;
  actionType?: 'accept_deny' | 'inspection_confirm' | 'job_offer' | 'change_order' | 'estimate_response';
  actionStatus?: 'pending' | 'accepted' | 'denied' | 'completed';
  actionDecisionAt?: string;
  senderName?: string;
  senderRole?: Role;
  urgencyLevel?: 'green' | 'orange' | 'red' | 'normal';
  relatedEntityId?: string;
}

export interface ScheduleSlot {
  id: string;
  jobId: string;
  jobTitle: string;
  jobAddress: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm' (e.g. '13:00')
  endTime: string; // 'HH:mm' (e.g. '16:00')
  assignedWorkers: string[];
}

export interface TravelTimeInfo {
  originAddress: string;
  destinationAddress: string;
  distanceMiles: number;
  travelTimeMinutes: number;
  trafficCondition?: 'normal' | 'moderate' | 'heavy';
  source?: 'google_maps' | 'calculated';
}

export interface SchedulingConflict {
  type: 'overlap' | 'insufficient_buffer' | 'travel_time_conflict' | 'outside_working_hours' | 'unreachable_from_base';
  severity: 'error' | 'warning';
  workerId: string;
  workerName: string;
  date: string;
  previousJob?: {
    id: string;
    title: string;
    address: string;
    endTime: string;
  };
  currentJob: {
    id: string;
    title: string;
    address: string;
    startTime: string;
    endTime: string;
  };
  nextJob?: {
    id: string;
    title: string;
    address: string;
    startTime: string;
  };
  estimatedTravelTimeMinutes: number;
  availableGapMinutes: number;
  requiredGapMinutes: number; // max(minBuffer, estimatedTravelTime)
  recommendedEarliestStart: string; // 'HH:mm'
  message: string;
  canOverride: boolean; // false if gap < mandatory minBuffer
}

export interface CompanySettings {
  companyName: string;
  phone: string;
  email: string;
  address?: string;
  businessType?: string;
  licenseNumber?: string;
  insurancePolicy?: string;
  yearFounded?: number;
  serviceRadiusMiles?: number;
  geofenceRadiusMiles?: number; // GPS geofence distance (in miles) required for employee check-in (configured solely in company account settings)
  willTravel?: boolean;
  inspectionFee?: number;
  jobCompletionPromptText?: string;
  completionPromptWording?: string; // e.g. "Are all jobs/tasks completed?"
  
  // Smart Scheduling & Travel-Time Configuration (Specifications 77-95)
  smartTravelTimeEnabled?: boolean; // Default true
  minSchedulingBufferMinutes?: number; // Mandatory buffer, default 30 mins
  useEmployeeBaseLocation?: boolean; // Default true
  calculateReturnToBase?: boolean; // Default false
  defaultWorkDayStart?: string; // e.g. '08:00'
  defaultWorkDayEnd?: string; // e.g. '18:00'
  employeeSchedulingWindow?: EmployeeSchedulingWindow; // Earliest Start Time & Latest End Time
  workingDays?: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  allowManagerScheduleOverrides?: boolean; // Default true
  allowManagerEmployeeReassignment?: boolean; // Default true
  allowEmployeeScheduleRequests?: boolean; // Default true

  // Stripe Connect & Payout Architecture
  stripe_customer_id?: string;
  stripe_connected_account_id?: string;
  stripe_connect_status?: 'not_connected' | 'pending' | 'connected' | 'restricted';
  stripe_payout_status?: 'active' | 'pending' | 'disabled';
  stripe_onboarding_completed?: boolean;
  payouts_enabled?: boolean;
  charges_enabled?: boolean;
  bank_name?: string;
  bank_last4?: string;

  // Company Subscriptions ($29 Professional vs $59 Business)
  subscription_plan?: SubscriptionPlanTier;
  subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing';
  subscription_current_period_end?: string;
}
