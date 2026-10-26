import React, { useState } from 'react';
import { 
  Role, CompanySettings, ConstructionTheme, 
  WorkerProfile, CompanyCard
} from '../types';
import { 
  CONSTRUCTION_THEMES, saveTheme 
} from '../utils/themeUtils';
import { 
  Settings, Palette, Building, User, Phone, Mail, 
  MapPin, Clock, Shield, Check, X, Plus, Trash2, 
  CreditCard, Award, ChevronRight, Fuel, ShoppingCart,
  AlertCircle, Lock, Edit2, Calendar
} from 'lucide-react';

interface UnifiedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: Role;
  currentTheme: ConstructionTheme;
  onSelectTheme: (theme: ConstructionTheme) => void;
  companySettings: CompanySettings;
  onSaveCompanySettings: (updated: CompanySettings) => void;
  workers?: WorkerProfile[];
  cards?: CompanyCard[];
  onUpdateCards?: (updatedCards: CompanyCard[]) => void;
  customerProfile?: {
    name: string;
    email: string;
    phone: string;
    address: string;
    additionalAddresses?: string[];
    preferredContact?: 'In-App' | 'SMS' | 'Call' | 'Email';
  };
  onSaveCustomerProfile?: (updated: {
    name: string;
    email: string;
    phone: string;
    address: string;
    additionalAddresses?: string[];
    preferredContact?: 'In-App' | 'SMS' | 'Call' | 'Email';
  }) => void;
  workerProfile?: WorkerProfile;
  onSaveWorkerProfile?: (updated: Partial<WorkerProfile>) => void;
}

export const UnifiedSettingsModal: React.FC<UnifiedSettingsModalProps> = ({
  isOpen,
  onClose,
  activeRole,
  currentTheme,
  onSelectTheme,
  companySettings,
  onSaveCompanySettings,
  workers = [],
  cards = [],
  onUpdateCards,
  customerProfile = {
    name: 'Sarah Jenkins',
    email: 'DevinJJenkins90@gmail.com',
    phone: '(415) 555-0199',
    address: '425 Grandview Dr, San Francisco',
    additionalAddresses: ['880 Folsom St, Apt 4B, San Francisco'],
    preferredContact: 'In-App'
  },
  onSaveCustomerProfile,
  workerProfile,
  onSaveWorkerProfile
}) => {
  // Navigation Tabs:
  // All accounts have "Personal Information".
  // Company has "Membership", "Company Cards", "Dispatch & Operations".
  // Theme is consolidated into a single dropdown under Settings (no separate tab).
  const [activeTab, setActiveTab] = useState<'personal_info' | 'membership' | 'company_cards' | 'dispatch_ops'>('personal_info');

  // Company settings form state
  const [companyForm, setCompanyForm] = useState<CompanySettings>(companySettings);
  
  // Membership state: $29 Professional vs $59 Business
  const [membershipTier, setMembershipTier] = useState<'professional' | 'business'>(
    companySettings.membershipTier || 'professional'
  );

  // Customer profile form state
  const [custName, setCustName] = useState(customerProfile.name);
  const [custEmail, setCustEmail] = useState(customerProfile.email);
  const [custPhone, setCustPhone] = useState(customerProfile.phone);
  const [custAddress, setCustAddress] = useState(customerProfile.address);
  const [custAddlAddresses, setCustAddlAddresses] = useState<string[]>(customerProfile.additionalAddresses || []);
  const [custPrefContact, setCustPrefContact] = useState<'In-App' | 'SMS' | 'Call' | 'Email'>(customerProfile.preferredContact || 'In-App');
  const [newAddlAddress, setNewAddlAddress] = useState('');

  // Worker profile form state
  const [workerName, setWorkerName] = useState(workerProfile?.name || 'Marcus Brody');
  const [workerEmail, setWorkerEmail] = useState(workerProfile?.email || 'm.brody@prosite.internal');
  const [workerPhone, setWorkerPhone] = useState(workerProfile?.phone || '+1 (415) 555-0199');
  const [workerAddress, setWorkerAddress] = useState(workerProfile?.address || 'San Francisco, CA');
  const [workerEmergency, setWorkerEmergency] = useState(workerProfile?.emergencyContact || 'Ellen Brody (Spouse) - (415) 555-0188');

  // Company Cards management state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardWorkerId, setNewCardWorkerId] = useState('');
  const [newCardCategory, setNewCardCategory] = useState<'GAS' | 'EXPENSES' | 'GAS / EXPENSES'>('GAS / EXPENSES');
  const [newCardLimit, setNewCardLimit] = useState(2500);

  // Scheduling Window state
  const [schedStart, setSchedStart] = useState(companySettings.employeeSchedulingWindow?.earliestStartTime || '08:00');
  const [schedEnd, setSchedEnd] = useState(companySettings.employeeSchedulingWindow?.latestEndTime || '17:00');
  
  const [saveToast, setSaveToast] = useState(false);

  if (!isOpen) return null;

  const handleApplyTheme = (themeId: ConstructionTheme) => {
    onSelectTheme(themeId);
    saveTheme(activeRole, themeId);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    // Save Company Settings
    const updatedCompany: CompanySettings = {
      ...companyForm,
      membershipTier,
      employeeSchedulingWindow: {
        earliestStartTime: schedStart,
        latestEndTime: schedEnd
      }
    };
    onSaveCompanySettings(updatedCompany);

    // Save Customer Profile if role is customer/client
    if (onSaveCustomerProfile) {
      onSaveCustomerProfile({
        name: custName,
        email: custEmail,
        phone: custPhone,
        address: custAddress,
        additionalAddresses: custAddlAddresses,
        preferredContact: custPrefContact
      });
    }

    // Save Worker Profile if role is worker/employee
    if (onSaveWorkerProfile && workerProfile) {
      onSaveWorkerProfile({
        name: workerName,
        email: workerEmail,
        phone: workerPhone,
        address: workerAddress,
        emergencyContact: workerEmergency
      });
    }

    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 1000);
  };

  const handleAddAddress = () => {
    if (!newAddlAddress.trim()) return;
    setCustAddlAddresses([...custAddlAddresses, newAddlAddress.trim()]);
    setNewAddlAddress('');
  };

  const handleRemoveAddress = (idx: number) => {
    setCustAddlAddresses(custAddlAddresses.filter((_, i) => i !== idx));
  };

  // Add Company Card
  const handleAddNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) return;

    const assignedWorker = workers.find(w => w.id === newCardWorkerId);
    const last4 = newCardNumber.replace(/\s+/g, '').slice(-4) || '8492';

    const newCard: CompanyCard = {
      id: `card-${Date.now()}`,
      name: newCardName.trim(),
      cardNumber: `•••• •••• •••• ${last4}`,
      last4,
      assignedWorkerId: newCardWorkerId || undefined,
      assignedWorkerName: assignedWorker ? assignedWorker.name : 'Unassigned',
      monthlyLimit: newCardLimit,
      limit: newCardLimit,
      spentThisMonth: 0,
      category: newCardCategory,
      cardType: newCardCategory,
      isActive: true
    };

    const updated = [...cards, newCard];
    if (onUpdateCards) {
      onUpdateCards(updated);
    }

    setNewCardName('');
    setNewCardNumber('');
    setNewCardWorkerId('');
    setShowAddCardModal(false);
  };

  const handleDeleteCard = (cardId: string) => {
    if (onUpdateCards) {
      onUpdateCards(cards.filter(c => c.id !== cardId));
    }
  };

  const isCompanyRole = activeRole === 'company' || activeRole === 'admin' || activeRole === 'manager';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Settings
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-bold border border-slate-700">
                  {activeRole}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage personal information, account preferences, and company controls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Consolidated Theme Dropdown under Settings (No separate theme page) */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300 font-mono">Theme:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentTheme}
              onChange={(e) => handleApplyTheme(e.target.value as ConstructionTheme)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
            >
              {CONSTRUCTION_THEMES.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.tagline}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-950/50 border-b border-slate-800 flex gap-2 sm:gap-4 text-xs font-bold overflow-x-auto">
          {/* ALL ACCOUNTS HAVE CLICKABLE "Personal Information" */}
          <button
            type="button"
            onClick={() => setActiveTab('personal_info')}
            className={`pb-3 px-1 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'personal_info'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Personal Information
          </button>

          {/* COMPANY ACCOUNTS ONLY */}
          {isCompanyRole && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('membership')}
                className={`pb-3 px-1 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'membership'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-4 h-4 text-amber-400" />
                Membership
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('company_cards')}
                className={`pb-3 px-1 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'company_cards'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Company Cards
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dispatch_ops')}
                className={`pb-3 px-1 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'dispatch_ops'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-blue-400" />
                Dispatch & Operations
              </button>
            </>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAll} className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveToast && (
            <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              Settings updated and saved successfully!
            </div>
          )}

          {/* ==================== TAB: PERSONAL INFORMATION (ALL ACCOUNTS) ==================== */}
          {activeTab === 'personal_info' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  Personal Information
                </h3>
                <p className="text-xs text-slate-400">
                  Manage your personal contact details, verified profile, and address information.
                </p>
              </div>

              {/* 1. AGENT PERSONAL INFORMATION */}
              {(activeRole === 'client' || activeRole === 'customer' || activeRole === 'agent') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                      <input
                        type="text"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Preferred Contact Method</label>
                      <select
                        value={custPrefContact}
                        onChange={(e: any) => setCustPrefContact(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="In-App">In-App Chat & Notifications</option>
                        <option value="SMS">SMS Text Message</option>
                        <option value="Call">Phone Call</option>
                        <option value="Email">Email Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Primary Property Address */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Primary Property Address</label>
                    <input
                      type="text"
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Additional Property Addresses */}
                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-slate-300 block">
                      Additional Property Addresses
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAddlAddress}
                        onChange={(e) => setNewAddlAddress(e.target.value)}
                        placeholder="e.g. 1020 Pacific Ave, Apt 3"
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddAddress}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>

                    {custAddlAddresses.map((addr, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-200">
                        <span className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" /> {addr}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAddress(idx)}
                          className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. EMPLOYEE / WORKER PERSONAL INFORMATION */}
              {(activeRole === 'worker' || activeRole === 'employee') && (
                <div className="space-y-4">
                  {/* Explanatory note: Company-assigned Job Role cannot be edited here */}
                  <div className="p-3.5 bg-blue-950/40 border border-blue-800/50 rounded-xl flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-200 space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        Company-Assigned Job Role:
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px] border border-blue-400/40">
                          {workerProfile?.jobRole || workerProfile?.position || 'Field Specialist'}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-300/80 leading-relaxed">
                        Company-assigned employee Job Role is <strong>NOT</strong> included in personal information editing and can only be changed by the Company.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                      <input
                        type="text"
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Personal Email</label>
                      <input
                        type="email"
                        value={workerEmail}
                        onChange={(e) => setWorkerEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Direct Phone</label>
                      <input
                        type="text"
                        value={workerPhone}
                        onChange={(e) => setWorkerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Home / Mailing Address</label>
                      <input
                        type="text"
                        value={workerAddress}
                        onChange={(e) => setWorkerAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Emergency Contact Information</label>
                    <input
                      type="text"
                      value={workerEmergency}
                      onChange={(e) => setWorkerEmergency(e.target.value)}
                      placeholder="e.g. Ellen Brody (Spouse) - (415) 555-0188"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 3. COMPANY / ADMIN PERSONAL & BUSINESS INFORMATION */}
              {isCompanyRole && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Company Administrator / Owner Name</label>
                      <input
                        type="text"
                        value={companyForm.companyName || 'ABC Construction LLC'}
                        onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Business Support Email</label>
                      <input
                        type="email"
                        value={companyForm.supportEmail || 'DevinJJenkins90@gmail.com'}
                        onChange={(e) => setCompanyForm({ ...companyForm, supportEmail: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Contractor License #</label>
                      <input
                        type="text"
                        value={companyForm.licenseNumber || 'CA-CSLB-982110'}
                        onChange={(e) => setCompanyForm({ ...companyForm, licenseNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Insurance & Bond Policy</label>
                      <input
                        type="text"
                        value={companyForm.insurancePolicy || 'Liberty Mutual #GL-882-990-01'}
                        onChange={(e) => setCompanyForm({ ...companyForm, insurancePolicy: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: MEMBERSHIP (COMPANY ACCOUNTS) ==================== */}
          {activeTab === 'membership' && isCompanyRole && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  ProSite Company Membership Tier
                </h3>
                <p className="text-xs text-slate-400">
                  Select your subscription tier, review enterprise benefits, and manage billing.
                </p>
              </div>

              {/* Tier Cards: $29 Professional vs $59 Business */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* $29 Tier */}
                <div className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                  membershipTier === 'professional'
                    ? 'bg-slate-950 border-blue-500 ring-2 ring-blue-500/40 shadow-xl'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}>
                  {membershipTier === 'professional' && (
                    <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/40">
                      CURRENT TIER
                    </span>
                  )}
                  <div>
                    <h4 className="text-sm font-black text-white">Professional Tier</h4>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white font-mono">$29</span>
                      <span className="text-xs text-slate-400 font-mono">/ month</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Designed for growing general contractors and independent trades.
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Up to 5 company crew members</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Automated GPS Geofence Check-in</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Universal Job ID & Photo Tracking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Basic expense logging</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setMembershipTier('professional')}
                      disabled={membershipTier === 'professional'}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        membershipTier === 'professional'
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {membershipTier === 'professional' ? 'Active Plan' : 'Downgrade to Professional ($29)'}
                    </button>
                  </div>
                </div>

                {/* $59 Tier */}
                <div className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                  membershipTier === 'business'
                    ? 'bg-slate-950 border-amber-500 ring-2 ring-amber-500/40 shadow-xl'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}>
                  {membershipTier === 'business' && (
                    <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40">
                      CURRENT TIER
                    </span>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-white">Business Tier</h4>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-bold rounded">
                        RECOMMENDED
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white font-mono">$59</span>
                      <span className="text-xs text-slate-400 font-mono">/ month</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Full enterprise suite for multi-crew operations, card controls, and escrow protection.
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span><strong>Unlimited</strong> employees and managers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span><strong>Company Card & Fuel Tracking</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Customer Dispute & Escrow Shield</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Smart Scheduling Conflict Matrix</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setMembershipTier('business')}
                      disabled={membershipTier === 'business'}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        membershipTier === 'business'
                          ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 cursor-default'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                      }`}
                    >
                      {membershipTier === 'business' ? 'Active Plan' : 'Upgrade to Business ($59)'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Billing Information */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Billing Information & Payment Method
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Payment Method on File</span>
                    <span className="font-bold text-white font-mono mt-1 block">Visa ending in •••• 4242</span>
                    <span className="text-[10px] text-slate-500 font-mono">Expires 12/28</span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Next Billing Cycle</span>
                    <span className="font-bold text-white font-mono mt-1 block">October 01, 2026</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Amount: ${membershipTier === 'business' ? '59.00' : '29.00'} USD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: COMPANY CARDS (COMPANY ACCOUNTS) ==================== */}
          {activeTab === 'company_cards' && isCompanyRole && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Company Card Management
                  </h3>
                  <p className="text-xs text-slate-400">
                    Link cards, assign to crew members, and specify card usage categories (Gas, Expenses, Gas/Expenses).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCardModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Link / Add Company Card
                </button>
              </div>

              {/* Add Card Sub-Modal */}
              {showAddCardModal && (
                <div className="p-4 bg-slate-950 rounded-2xl border-2 border-emerald-500/60 space-y-3 animate-fade-in shadow-xl">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-mono">
                      Link New Company Card
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddCardModal(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Card Name / Identifier *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        placeholder="e.g. Crew Fleet 01, Site Fuel Card"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Card Number / Last 4 Digits
                      </label>
                      <input
                        type="text"
                        value={newCardNumber}
                        onChange={(e) => setNewCardNumber(e.target.value)}
                        placeholder="•••• •••• •••• 4289"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Assigned Employee
                      </label>
                      <select
                        value={newCardWorkerId}
                        onChange={(e) => setNewCardWorkerId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Unassigned (Company Pool) --</option>
                        {workers.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.jobRole || w.position || 'Crew'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Card Usage Category *
                      </label>
                      <select
                        value={newCardCategory}
                        onChange={(e: any) => setNewCardCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      >
                        <option value="GAS / EXPENSES">GAS / EXPENSES (Dual Use)</option>
                        <option value="GAS">GAS (Fuel Purchases Only)</option>
                        <option value="EXPENSES">EXPENSES (Materials & Hardware)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Monthly Spending Limit ($)
                      </label>
                      <input
                        type="number"
                        value={newCardLimit}
                        onChange={(e) => setNewCardLimit(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCardModal(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewCard}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
                    >
                      Save & Link Card
                    </button>
                  </div>
                </div>
              )}

              {/* Cards List */}
              <div className="space-y-3">
                {cards.length === 0 ? (
                  <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs text-slate-500">
                    No company cards linked yet. Click [Link / Add Company Card] above to link your first card.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cards.map(card => (
                      <div key={card.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 relative group">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-white">{card.name}</h4>
                              <span className="text-[11px] text-slate-400 font-mono block">
                                {card.last4 ? `•••• •••• •••• ${card.last4}` : card.cardNumber}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                            card.category === 'GAS'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : card.category === 'EXPENSES'
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {card.category || 'GAS / EXPENSES'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 text-xs space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Assigned To:</span>
                            <span className="font-bold text-white">{card.assignedWorkerName || 'Unassigned'}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Monthly Limit:</span>
                            <span className="font-mono text-emerald-400 font-bold">${(card.limit || card.monthlyLimit || 2500).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-mono transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Card
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB: DISPATCH & OPERATIONS (COMPANY ACCOUNTS) ==================== */}
          {activeTab === 'dispatch_ops' && isCompanyRole && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Dispatch & Operations Configuration
                </h3>
                <p className="text-xs text-slate-400">
                  Configure the company-wide geofence perimeter, scheduling limits, and inspection booking fees.
                </p>
              </div>

              {/* GPS Geofence Distance (Exclusive configuration in Company Settings) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      GPS Geofence Distance (Company Controlled)
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Mandatory arrival boundary around job sites. Field employees must be physically within this perimeter to clock in. Employees cannot alter this setting.
                    </p>
                  </div>
                  <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-mono text-xs font-bold">
                    {companyForm.geofenceRadiusMiles ?? 1.0} mi
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="10.0"
                      value={companyForm.geofenceRadiusMiles ?? 1.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCompanyForm({
                          ...companyForm,
                          geofenceRadiusMiles: isNaN(val) ? 1.0 : Math.max(0.05, Math.min(25.0, val))
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      placeholder="1.0"
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-mono text-slate-400">miles</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '0.25 mi (1,320 ft)', val: 0.25 },
                      { label: '0.50 mi', val: 0.5 },
                      { label: '1.00 mi (Std)', val: 1.0 },
                      { label: '2.00 mi', val: 2.0 }
                    ].map(preset => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setCompanyForm({ ...companyForm, geofenceRadiusMiles: preset.val })}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                          (companyForm.geofenceRadiusMiles ?? 1.0) === preset.val
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-400 leading-normal">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">Tamper Protection:</strong> Employees have no ability to alter the distance for geofencing. This parameter is locked exclusively to Company Settings.
                  </div>
                </div>
              </div>

              {/* Scheduling Window */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Employee Daily Scheduling Window
                </label>
                <p className="text-[11px] text-slate-400">
                  Defines allowable shift hours. Sub-jobs outside this window trigger an automated scheduling conflict alert.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Earliest Start Time</label>
                    <input
                      type="time"
                      value={schedStart}
                      onChange={(e) => setSchedStart(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Latest End Time</label>
                    <input
                      type="time"
                      value={schedEnd}
                      onChange={(e) => setSchedEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Inspection Fee */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white">Inspection Booking Fee ($)</label>
                    <p className="text-[11px] text-slate-400">
                      Standard fee collected from customer upon booking an inspection. Deducted from the active job total once converted.
                    </p>
                  </div>
                  <input
                    type="number"
                    value={companyForm.inspectionFee ?? 150}
                    onChange={(e) => setCompanyForm({ ...companyForm, inspectionFee: Number(e.target.value) })}
                    className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500 text-right"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Preferences
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
