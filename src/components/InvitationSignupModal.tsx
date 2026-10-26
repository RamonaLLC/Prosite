import React, { useState } from 'react';
import { Role, UserAccount, Invitation, WorkerProfile } from '../types';
import { 
  UserPlus, Mail, Key, Shield, User, Building, 
  HardHat, Home, CheckCircle2, AlertCircle, X, 
  ArrowRight, Phone, MapPin, Sparkles, Lock
} from 'lucide-react';

interface InvitationSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: Invitation[];
  onCompleteSignup: (account: UserAccount, newWorkerProfile?: WorkerProfile) => void;
  onAcceptInvitation: (invitationId: string, profile: any) => void;
}

export default function InvitationSignupModal({
  isOpen,
  onClose,
  invitations,
  onCompleteSignup,
  onAcceptInvitation
}: InvitationSignupModalProps) {
  // Active mode: 'select-mode' | 'direct-signup' | 'invitation-signup'
  const [step, setStep] = useState<'select-mode' | 'direct-signup' | 'invitation-signup'>('select-mode');
  
  // Direct signup role (only Customer or Company permitted)
  const [directRole, setDirectRole] = useState<'customer' | 'company'>('customer');
  
  // Active invitation chosen
  const [selectedInvite, setSelectedInvite] = useState<Invitation | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150');
  const [aboutMe, setAboutMe] = useState('');
  const [companyName, setCompanyName] = useState('ABC Construction & Remodeling');
  const [enteredManagerCode, setEnteredManagerCode] = useState('');

  // Validation Error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle invitation selection
  const handleSelectInviteToClaim = (invite: Invitation) => {
    setSelectedInvite(invite);
    setEmail(invite.email);
    setErrorMessage(null);
    setStep('invitation-signup');
  };

  // Submit Direct Signup (Customer or Company)
  const handleDirectSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName || !email) {
      setErrorMessage('Full name and email are required.');
      return;
    }

    const newAccount: UserAccount = {
      id: `acc-${Date.now()}`,
      email,
      name: fullName,
      role: directRole,
      companyName: directRole === 'company' ? companyName : undefined,
      phone,
      address,
      avatar,
      aboutMe
    };

    onCompleteSignup(newAccount);
    setSuccessMessage(`Account created successfully as ${directRole.toUpperCase()}!`);
    setTimeout(() => {
      onClose();
      resetForm();
    }, 1500);
  };

  // Submit Invitation Signup (Employee or Manager)
  const handleInvitationSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedInvite) {
      setErrorMessage('No active invitation found.');
      return;
    }

    if (!fullName || !phone || !address) {
      setErrorMessage('Profile picture, Full name, Phone number, and Address are required.');
      return;
    }

    // Manager validation: 5-digit code check
    if (selectedInvite.role === 'manager') {
      if (!enteredManagerCode || enteredManagerCode.trim() !== selectedInvite.managerCode) {
        setErrorMessage('Invalid 5-digit invitation code. Please verify the code provided in your invitation.');
        return;
      }
    }

    const newAccount: UserAccount = {
      id: `acc-${Date.now()}`,
      email: selectedInvite.email,
      name: fullName,
      role: selectedInvite.role,
      companyId: selectedInvite.companyId,
      companyName: selectedInvite.companyName,
      phone,
      address,
      avatar,
      aboutMe
    };

    // Create matching worker profile for company roster
    const newWorker: WorkerProfile = {
      id: `w-${Date.now()}`,
      name: fullName,
      avatar,
      position: selectedInvite.role === 'manager' ? 'Site Manager' : 'Field Technician',
      role: selectedInvite.role,
      isAtJob: false,
      isIdle: true,
      lat: 37.7749,
      lng: -122.4194,
      phone,
      address,
      aboutMe
    };

    onCompleteSignup(newAccount, newWorker);
    onAcceptInvitation(selectedInvite.id, newAccount);

    setSuccessMessage(`Welcome to ${selectedInvite.companyName}! Account created as ${selectedInvite.role.toUpperCase()}.`);
    setTimeout(() => {
      onClose();
      resetForm();
    }, 1800);
  };

  const resetForm = () => {
    setStep('select-mode');
    setSelectedInvite(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setAboutMe('');
    setEnteredManagerCode('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-xl">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Account Creation & Invitation Portal
              </h2>
              <p className="text-xs text-slate-400">
                Direct registration for Customers & Companies • Invitation onboarding for Employees & Managers
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {successMessage && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-red-950/80 border border-red-500 rounded-xl text-red-300 text-xs font-mono font-bold flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* STEP 1: SELECT MODE */}
          {step === 'select-mode' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* DIRECT REGISTRATION (Customer / Company) */}
                <div 
                  onClick={() => setStep('direct-signup')}
                  className="p-5 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-2xl cursor-pointer transition group space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
                      <Home className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-white">Direct Public Registration</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Create an independent <strong>Customer</strong> account or <strong>Company</strong> account directly without requiring an invitation.
                    </p>
                  </div>
                  
                  <div className="pt-2 text-xs font-bold text-blue-400 flex items-center gap-1">
                    Sign Up Directly <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* INVITATION ONBOARDING (Manager / Employee) */}
                <div 
                  className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-white">Claim Company Invitation</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Managers and Employees <strong>cannot create accounts independently</strong>. Select your pending company invitation to onboard.
                  </p>
                </div>

              </div>

              {/* Pending Invitations list */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase font-mono tracking-wider text-slate-400 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" /> Pending Invitations in Workspace
                </h4>

                {invitations.length === 0 ? (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 text-center">
                    No open invitations. Send one from Company Employee Management to simulate onboarding.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <div 
                        key={inv.id}
                        className="p-3.5 bg-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{inv.email}</span>
                            <span className={`text-[10px] px-2 py-0.2 rounded font-mono font-bold ${
                              inv.role === 'manager' 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {inv.role.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Invited by <strong>{inv.companyName}</strong>
                            {inv.managerCode && (
                              <span className="ml-2 text-amber-400 font-mono font-bold">
                                (5-Digit Code: {inv.managerCode})
                              </span>
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSelectInviteToClaim(inv)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-450 text-slate-950 text-xs font-black rounded-lg transition shadow flex items-center gap-1 cursor-pointer"
                        >
                          Accept Invitation <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: DIRECT SIGNUP FORM (Customer or Company) */}
          {step === 'direct-signup' && (
            <form onSubmit={handleDirectSignupSubmit} className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('select-mode')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Back to Options
                </button>
                <span className="text-xs font-bold text-slate-300">Direct Public Signup</span>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Account Role:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirectRole('customer')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      directRole === 'customer'
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Home className="w-4 h-4" /> Customer (Homeowner)
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirectRole('company')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      directRole === 'company'
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Building className="w-4 h-4" /> Company (Contractor)
                  </button>
                </div>
              </div>

              {directRole === 'company' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Company Name:</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Full Name:</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Email Address:</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@domain.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Phone Number:</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Address:</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="425 Grandview Dr, San Francisco"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-black text-white rounded-xl shadow-md transition cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: INVITATION SIGNUP FORM (Employee or Manager) */}
          {step === 'invitation-signup' && selectedInvite && (
            <form onSubmit={handleInvitationSignupSubmit} className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('select-mode')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Back to Invitations
                </button>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  Role: {selectedInvite.role.toUpperCase()}
                </span>
              </div>

              {/* Exact Mandated Announcement Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border-2 border-amber-500/40 rounded-2xl text-center space-y-1">
                <h3 className="text-sm sm:text-base font-black text-white">
                  You have been invited to join <span className="text-amber-400">{selectedInvite.companyName}</span> as a{' '}
                  <span className="text-amber-400 underline decoration-2 underline-offset-4 capitalize">{selectedInvite.role}</span>.
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  The assigned role has been locked by company administration.
                </p>
              </div>

              {/* Required 5-digit verification code input for Managers */}
              {selectedInvite.role === 'manager' && (
                <div className="p-4 bg-slate-950 border border-amber-500/50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <label className="text-xs font-bold text-white">
                      Enter 5-Digit Manager Invitation Code (Required):
                    </label>
                  </div>
                  <input
                    type="text"
                    maxLength={5}
                    required
                    value={enteredManagerCode}
                    onChange={(e) => setEnteredManagerCode(e.target.value)}
                    placeholder="e.g. 58291"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-center text-lg tracking-widest font-mono font-black text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    The 5-digit verification code was provided when the company dispatched your managerial invite.
                  </p>
                </div>
              )}

              {/* Profile Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Marcus Chen"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Email Address (Locked)</label>
                  <input
                    type="email"
                    disabled
                    value={selectedInvite.email}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="742 Evergreen Terrace, San Francisco"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Optional About Me for field crew */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">About Me (Optional):</label>
                <textarea
                  rows={2}
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  placeholder="Tell clients and teammates about your trade specialties and certifications..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-450 text-xs font-black text-slate-950 rounded-xl shadow-lg transition cursor-pointer"
                >
                  Complete Account Creation
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
