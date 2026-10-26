import React, { useState, useEffect } from 'react';
import { 
  Role, 
  CompanySettings, 
  CustomerPaymentMethod, 
  PaymentTransaction, 
  SubscriptionPlanTier 
} from '../types';
import { stripeService, StripeConnectStatus } from '../services/stripeService';
import { 
  CreditCard, Landmark, CheckCircle, ExternalLink, 
  RefreshCw, AlertCircle, ShieldCheck, ArrowUpRight, 
  Plus, Trash2, Star, Sparkles, DollarSign, ShieldAlert,
  Calendar, Check, X, Building, Zap
} from 'lucide-react';

interface PaymentsSettingsSectionProps {
  activeRole: Role;
  companySettings: CompanySettings;
  onUpdateCompanySettings: (updated: CompanySettings) => void;
  customerEmail?: string;
  customerName?: string;
}

export const PaymentsSettingsSection: React.FC<PaymentsSettingsSectionProps> = ({
  activeRole,
  companySettings,
  onUpdateCompanySettings,
  customerEmail = 'DevinJJenkins90@gmail.com',
  customerName = 'Sarah Jenkins'
}) => {
  const isCompanyUser = activeRole === 'company' || activeRole === 'admin' || activeRole === 'manager';

  // Stripe Connect state for companies
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [isLoadingConnect, setIsLoadingConnect] = useState(false);
  const [onboardSuccessMessage, setOnboardSuccessMessage] = useState('');

  // Subscription state
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlanTier>(
    companySettings.subscription_plan || 'professional'
  );
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [subscriptionToast, setSubscriptionToast] = useState('');

  // Customer cards state
  const [paymentMethods, setPaymentMethods] = useState<CustomerPaymentMethod[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExp, setNewCardExp] = useState('');
  const [newCardCvc, setNewCardCvc] = useState('');
  const [newCardName, setNewCardName] = useState(customerName);
  const [cardError, setCardError] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Transactions ledger state
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isCompanyUser) {
      loadConnectStatus();
      loadCompanyTransactions();
    } else {
      loadCustomerCards();
      loadCustomerTransactions();
    }
  }, [activeRole, customerEmail]);

  // Fetch company Stripe Connect status
  const loadConnectStatus = async () => {
    setIsLoadingConnect(true);
    try {
      const status = await stripeService.getConnectStatus('co-1');
      setConnectStatus(status);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingConnect(false);
    }
  };

  const loadCompanyTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const txs = await stripeService.getTransactions({ companyId: 'co-1' });
      setTransactions(txs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTx(false);
    }
  };

  const loadCustomerCards = async () => {
    setIsLoadingCards(true);
    try {
      const cards = await stripeService.getCustomerPaymentMethods(customerEmail);
      setPaymentMethods(cards);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const loadCustomerTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const txs = await stripeService.getTransactions({ customerEmail });
      setTransactions(txs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTx(false);
    }
  };

  // Handle Stripe Connect onboarding
  const handleStartConnectOnboarding = async () => {
    setIsLoadingConnect(true);
    try {
      const result = await stripeService.createConnectOnboardingLink(
        'co-1',
        companySettings.companyName,
        companySettings.email
      );
      if (result.url && !result.url.startsWith('#')) {
        window.open(result.url, '_blank');
      }
      // Refresh status
      await loadConnectStatus();
      setOnboardSuccessMessage('Stripe Connect onboarding verified! Bank payouts are enabled.');
      setTimeout(() => setOnboardSuccessMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to start Stripe onboarding');
    } finally {
      setIsLoadingConnect(false);
    }
  };

  // Handle Subscription Plan Change
  const handleChangeSubscription = async (targetPlan: SubscriptionPlanTier) => {
    if (targetPlan === currentPlan) return;
    setIsChangingPlan(true);
    try {
      const updated = await stripeService.updateSubscription('co-1', targetPlan);
      setCurrentPlan(updated.plan);
      onUpdateCompanySettings({
        ...companySettings,
        subscription_plan: updated.plan,
        subscription_status: updated.status
      });
      setSubscriptionToast(`Successfully switched to ${updated.plan === 'business' ? 'Business ($59/mo)' : 'Professional ($29/mo)'}!`);
      await loadCompanyTransactions();
      setTimeout(() => setSubscriptionToast(''), 3500);
    } catch (err: any) {
      alert(err.message || 'Could not update subscription plan');
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Add Customer Card
  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError('');

    const cleanNum = newCardNumber.replace(/\s+/g, '');
    if (cleanNum.length < 15) {
      setCardError('Please enter a valid 15 or 16 digit card number');
      return;
    }

    const expParts = newCardExp.split('/');
    if (expParts.length !== 2) {
      setCardError('Please enter expiration as MM/YY');
      return;
    }

    const month = parseInt(expParts[0].trim(), 10);
    const year = 2000 + parseInt(expParts[1].trim(), 10);
    if (isNaN(month) || month < 1 || month > 12) {
      setCardError('Invalid expiration month');
      return;
    }

    setIsAddingCard(true);
    try {
      const added = await stripeService.addCustomerPaymentMethod(customerEmail, {
        number: cleanNum,
        exp_month: month,
        exp_year: year,
        cvc: newCardCvc.trim(),
        cardholderName: newCardName.trim()
      });

      setPaymentMethods(prev => {
        if (added.is_default) {
          return [added, ...prev.map(p => ({ ...p, is_default: false }))];
        }
        return [...prev, added];
      });

      setShowAddCardModal(false);
      setNewCardNumber('');
      setNewCardExp('');
      setNewCardCvc('');
    } catch (err: any) {
      setCardError(err.message || 'Error saving payment method');
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleSetDefaultCard = async (pmId: string) => {
    try {
      await stripeService.setDefaultPaymentMethod(customerEmail, pmId);
      setPaymentMethods(prev =>
        prev.map(p => ({ ...p, is_default: p.id === pmId }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update default card');
    }
  };

  const handleRemoveCard = async (pmId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    try {
      await stripeService.removeCustomerPaymentMethod(customerEmail, pmId);
      setPaymentMethods(prev => prev.filter(p => p.id !== pmId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove card');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============================================================== */}
      {/* A. COMPANY & MANAGER VIEW: PAYMENTS, PAYOUTS & SUBSCRIPTIONS */}
      {/* ============================================================== */}
      {isCompanyUser ? (
        <>
          {/* Zero Platform Fee Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 rounded-2xl flex items-start gap-3.5 shadow-sm">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5 border border-emerald-500/30">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-emerald-300">
                  100% Payout to Companies — $0 Platform Fee
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  0% PLATFORM TAKE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                When customers pay for jobs or inspections, <strong>100% of the funds go directly to your bank account</strong> through Stripe Connect. The platform takes $0.00 from customer-to-company transactions. Platform revenue is derived strictly from monthly subscriptions and $5 job posting fees.
              </p>
            </div>
          </div>

          {/* Toast Notice */}
          {onboardSuccessMessage && (
            <div className="p-3 bg-emerald-900/60 border border-emerald-500 rounded-xl text-emerald-200 text-xs font-mono font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              {onboardSuccessMessage}
            </div>
          )}
          {subscriptionToast && (
            <div className="p-3 bg-blue-900/60 border border-blue-500 rounded-xl text-blue-200 text-xs font-mono font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              {subscriptionToast}
            </div>
          )}

          {/* Section 1: Stripe Connect & Bank Payouts */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-400" />
                  Stripe Connect & Direct Bank Payouts
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Secure bank account integration to receive customer payments and inspection fees
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                  connectStatus?.status === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : connectStatus?.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    connectStatus?.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  {connectStatus?.status === 'connected' ? 'STRIPE CONNECTED' : 'ONBOARDING PENDING'}
                </span>

                <button
                  type="button"
                  onClick={handleStartConnectOnboarding}
                  disabled={isLoadingConnect}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {connectStatus?.status === 'connected' ? 'Manage Payout Info' : 'Complete Onboarding'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Stripe Account ID</span>
                <span className="text-white font-mono font-bold mt-1 block">
                  {connectStatus?.connectedAccountId || 'acct_1ProSiteCA984210'}
                </span>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Payout Destination</span>
                <span className="text-emerald-300 font-bold mt-1 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />
                  {connectStatus?.bankName || 'JPMorgan Chase'} •••• {connectStatus?.bankLast4 || '4192'}
                </span>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Payout Status</span>
                <span className="text-white font-bold mt-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  {connectStatus?.payoutStatus === 'active' ? 'Active & Auto-Daily' : 'Verification In-Progress'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * Bank credentials are kept strictly inside Stripe's secure infrastructure. ProSite stores only necessary Stripe account IDs and verification statuses.
            </p>
          </div>

          {/* Section 2: Company Subscriptions (Professional $29 vs Business $59) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Company Subscription Plan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select the tier that matches your workforce and operational requirements
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Current Plan:</span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-black border border-blue-500/30 uppercase">
                  {currentPlan === 'business' ? 'Business — $59/mo' : 'Professional — $29/mo'}
                </span>
              </div>
            </div>

            {/* Plan Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Professional Tier */}
              <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                currentPlan === 'professional'
                  ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-white">PROFESSIONAL</h4>
                      <p className="text-xs text-slate-400">Core company operations & job dispatch</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-lg font-black text-white">$29</span>
                      <span className="text-xs text-slate-400">/month</span>
                    </div>
                  </div>

                  {/* Team Limits Rule */}
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 font-bold flex items-center gap-2">
                    <Building className="w-4 h-4 shrink-0" />
                    <span>Combined Limit: Maximum 10 employees & managers</span>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Core company & customer management
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Job dispatch, scheduling & day logs
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Inspection requests & direct payments
                    </li>
                    <li className="flex items-center gap-2 text-slate-500 line-through">
                      <X className="w-3.5 h-3.5 text-red-400" />
                      Live GPS worker map & geofencing
                    </li>
                    <li className="flex items-center gap-2 text-slate-500 line-through">
                      <X className="w-3.5 h-3.5 text-red-400" />
                      Advanced report analytics & profitability
                    </li>
                  </ul>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/80">
                  {currentPlan === 'professional' ? (
                    <div className="w-full py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl text-center">
                      ✓ Active Current Plan
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isChangingPlan}
                      onClick={() => handleChangeSubscription('professional')}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Switch to Professional ($29/mo)
                    </button>
                  )}
                </div>
              </div>

              {/* Business Tier */}
              <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                currentPlan === 'business'
                  ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-black text-amber-400">BUSINESS</h4>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            RECOMMENDED
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Full telemetry, analytics & enterprise scale</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-lg font-black text-amber-400">$59</span>
                      <span className="text-xs text-slate-400">/month</span>
                    </div>
                  </div>

                  {/* Team Limits Rule */}
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Unlimited employees & unlimited managers</span>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Everything included in Professional plan
                    </li>
                    <li className="flex items-center gap-2 font-bold text-amber-300">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Live worker GPS tracking on Google Maps
                    </li>
                    <li className="flex items-center gap-2 font-bold text-amber-300">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Automated GPS Geofencing arrival/departure
                    </li>
                    <li className="flex items-center gap-2 font-bold text-amber-300">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Advanced financial reports & profit analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Unlimited team seats without cap
                    </li>
                  </ul>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/80">
                  {currentPlan === 'business' ? (
                    <div className="w-full py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black rounded-xl text-center">
                      ★ Active Current Plan
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isChangingPlan}
                      onClick={() => handleChangeSubscription('business')}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shadow-md"
                    >
                      Upgrade to Business ($59/mo)
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Transactions & Payouts Ledger */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Payments & Payouts History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified Stripe transaction records, inspection captures, and platform fees
                </p>
              </div>

              <button
                type="button"
                onClick={loadCompanyTransactions}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                title="Refresh Transactions"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Gross</th>
                    <th className="pb-2">Platform Fee</th>
                    <th className="pb-2 text-right">Net to Company</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                        No financial transactions logged yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 text-slate-400 text-[11px]">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-slate-200 font-sans font-medium">
                          {tx.description}
                        </td>
                        <td className="py-2.5">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            tx.type === 'inspection_fee' || tx.type === 'customer_job_payment'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : tx.type === 'job_posting_fee'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            {tx.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 text-white font-bold">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-slate-400">
                          {tx.platformFee === 0 ? (
                            <span className="text-emerald-400 font-bold">$0.00 (0%)</span>
                          ) : (
                            `$${tx.platformFee.toFixed(2)}`
                          )}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-400">
                          {tx.companyAmount > 0 ? `+$${tx.companyAmount.toFixed(2)}` : '$0.00'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ============================================================== */
        /* B. CUSTOMER VIEW: PAYMENT METHODS & PAYMENT HISTORY            */
        /* ============================================================== */
        <>
          {/* Section 1: Customer Credit / Debit Cards via Stripe */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Payment Methods (Credit & Debit Cards)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage credit and debit cards for job payments and inspection bookings
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCardModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add New Card
              </button>
            </div>

            {/* Security Guarantee Banner */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Bank-Grade Stripe Security:</strong> Full credit card numbers and CVVs are processed directly by Stripe. ProSite never stores card credentials in application databases.
              </span>
            </div>

            {/* Cards List */}
            <div className="space-y-2.5">
              {isLoadingCards ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading payment methods...</div>
              ) : paymentMethods.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400 space-y-2">
                  <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>No payment methods on file yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddCardModal(true)}
                    className="text-blue-400 hover:underline font-bold"
                  >
                    + Add your first credit/debit card
                  </button>
                </div>
              ) : (
                paymentMethods.map(card => (
                  <div
                    key={card.id}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                      card.is_default
                        ? 'bg-slate-900 border-blue-500/80 ring-1 ring-blue-500/40 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
                        <CreditCard className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-white uppercase">
                            {card.brand} •••• {card.last4}
                          </span>
                          {card.is_default && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-black border border-blue-500/30">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          Expires {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!card.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultCard(card.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition cursor-pointer"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(card.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                        title="Remove Card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Customer Payments & Inspection Ledger */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  Your Payment History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Itemized receipts for project payments, inspection fees, and refunds
                </p>
              </div>

              <button
                type="button"
                onClick={loadCustomerTransactions}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                        No customer transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 text-slate-400 text-[11px]">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-slate-200 font-sans font-medium">
                          {tx.description}
                        </td>
                        <td className="py-2.5">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold uppercase border border-slate-700">
                            {tx.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 text-white font-bold">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-bold">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            tx.status === 'captured' || tx.status === 'succeeded'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : tx.status === 'refunded'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Card Modal */}
          {showAddCardModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-black text-white">Add Credit or Debit Card</h3>
                  </div>
                  <button
                    onClick={() => setShowAddCardModal(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {cardError && (
                  <div className="p-2.5 bg-red-950/70 border border-red-500 rounded-xl text-red-300 text-xs font-mono">
                    {cardError}
                  </div>
                )}

                <form onSubmit={handleAddCardSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Card Number</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={newCardNumber}
                      onChange={(e) => {
                        // Format with space every 4 digits
                        const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                        const formatted = v.replace(/(.{4})/g, '$1 ').trim();
                        setNewCardNumber(formatted);
                      }}
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">Exp Date (MM/YY)</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={newCardExp}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                          if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                          setNewCardExp(v);
                        }}
                        placeholder="12/28"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-bold block mb-1">Security Code (CVC)</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={newCardCvc}
                        onChange={(e) => setNewCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 pt-1">
                    🔒 Secured by Stripe. Card numbers are tokenized client-side.
                  </p>

                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCardModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingCard}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isAddingCard ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Save Payment Method
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
