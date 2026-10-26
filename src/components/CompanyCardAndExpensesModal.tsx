import React, { useState, useMemo } from 'react';
import { CompanyCard, ExpensePurchase, WorkerProfile, Job, Role } from '../types';
import { 
  CreditCard, DollarSign, Fuel, ShoppingCart, 
  Search, Filter, Plus, X, Check, AlertCircle, 
  Trash2, Edit2, Shield, Eye, Calendar, User, 
  Image as ImageIcon, CheckCircle2, XCircle, Tag, Sliders
} from 'lucide-react';
import { formatMDY } from '../utils/dateFormatter';

interface CompanyCardAndExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CompanyCard[];
  expenses?: ExpensePurchase[];
  workers: WorkerProfile[];
  jobs: Job[];
  userRole: Role;
  onUpdateCards: (updated: CompanyCard[]) => void;
  onUpdateExpenses?: (updated: ExpensePurchase[]) => void;
  onSendNotification?: (title: string, message: string, type: any, jobId?: string, workerId?: string) => void;
}

export const CompanyCardAndExpensesModal: React.FC<CompanyCardAndExpensesModalProps> = ({
  isOpen,
  onClose,
  cards,
  expenses = [],
  workers,
  jobs,
  userRole,
  onUpdateCards,
  onUpdateExpenses,
  onSendNotification
}) => {
  if (!isOpen) return null;

  // Active view: 'cards' or 'purchases' or 'combined'
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'cards' | 'purchases'>('all');
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWorkerId, setFilterWorkerId] = useState('all');
  const [filterJobId, setFilterJobId] = useState('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // New / Edit Card Modal State
  const [isEditingCard, setIsEditingCard] = useState<CompanyCard | null>(null);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [cardNickName, setCardNickName] = useState('');
  const [cardNumberLast4, setCardNumberLast4] = useState('');
  const [cardAssignedWorkerId, setCardAssignedWorkerId] = useState('');
  const [cardDailyLimit, setCardDailyLimit] = useState(500);
  const [cardMonthlyLimit, setCardMonthlyLimit] = useState(5000);

  // Enlarged receipt photo preview modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Mock initial expenses if empty
  const allPurchases: ExpensePurchase[] = useMemo(() => {
    if (expenses && expenses.length > 0) return expenses;
    return [
      {
        id: 'exp-1',
        workerId: 'w1',
        workerName: 'Luis Alvarez',
        jobId: jobs[0]?.id || 'job-1',
        jobAddress: jobs[0]?.address || '1044 Market St, San Francisco',
        amount: 342.50,
        category: 'Materials',
        description: 'Red Oak hardwood moldings and trim screws (Home Depot #482)',
        date: '2026-06-22',
        receiptPhoto: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
        cardLast4: '4122',
        status: 'approved'
      },
      {
        id: 'exp-2',
        workerId: 'w2',
        workerName: 'Marcus Vance',
        jobId: jobs[0]?.id || 'job-1',
        jobAddress: jobs[0]?.address || '1044 Market St, San Francisco',
        amount: 88.20,
        category: 'Fuel',
        description: 'Chevron fleet diesel refueling (Job site generator & truck)',
        date: '2026-06-21',
        receiptPhoto: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=400&q=80',
        cardLast4: '8890',
        status: 'approved'
      },
      {
        id: 'exp-3',
        workerId: 'w3',
        workerName: 'Devin Jenkins',
        jobId: jobs[1]?.id || 'job-2',
        jobAddress: jobs[1]?.address || '284 Castro St, Mountain View',
        amount: 145.00,
        category: 'Equipment',
        description: 'Diamond blade tile cutter replacement parts',
        date: '2026-06-20',
        receiptPhoto: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80',
        cardLast4: '1092',
        status: 'approved'
      },
      {
        id: 'exp-4',
        workerId: 'w1',
        workerName: 'Luis Alvarez',
        jobId: jobs[0]?.id || 'job-1',
        jobAddress: jobs[0]?.address || '1044 Market St, San Francisco',
        amount: 45.00,
        category: 'Meals',
        description: 'Crew working lunch (Subway catering for roof pour)',
        date: '2026-06-19',
        cardLast4: '4122',
        status: 'approved'
      }
    ];
  }, [expenses, jobs]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return allPurchases.filter(p => {
      if (filterWorkerId !== 'all' && p.workerId !== filterWorkerId) return false;
      if (filterJobId !== 'all' && p.jobId !== filterJobId) return false;
      if (filterCategory !== 'all' && p.category?.toLowerCase() !== filterCategory.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = p.description?.toLowerCase().includes(q);
        const matchWorker = p.workerName?.toLowerCase().includes(q);
        const matchJob = p.jobAddress?.toLowerCase().includes(q);
        if (!matchDesc && !matchWorker && !matchJob) return false;
      }
      return true;
    });
  }, [allPurchases, filterWorkerId, filterJobId, filterCategory, searchQuery]);

  // Total spent across filtered purchases
  const totalFilteredSpend = filteredPurchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Toggle Card Active / Inactive
  const handleToggleCardActive = (cardId: string) => {
    const updated = cards.map(c => {
      if (c.id === cardId) {
        const nextStatus = c.status === 'active' ? 'inactive' : 'active';
        return { ...c, status: nextStatus as 'active' | 'inactive' };
      }
      return c;
    });
    onUpdateCards(updated);
    const target = cards.find(c => c.id === cardId);
    onSendNotification?.(
      'Company Card Status Updated',
      `Card ending in ${target?.lastFour || '----'} is now ${target?.status === 'active' ? 'INACTIVE (Locked)' : 'ACTIVE'}.`,
      'expense'
    );
  };

  // Add / Save Card
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    const assigned = workers.find(w => w.id === cardAssignedWorkerId);

    if (isEditingCard) {
      const updated = cards.map(c => {
        if (c.id === isEditingCard.id) {
          return {
            ...c,
            nickname: cardNickName || c.nickname,
            assignedWorkerId: cardAssignedWorkerId || c.assignedWorkerId,
            assignedWorkerName: assigned?.name || c.assignedWorkerName,
            dailyLimit: cardDailyLimit,
            monthlyLimit: cardMonthlyLimit
          };
        }
        return c;
      });
      onUpdateCards(updated);
      setIsEditingCard(null);
    } else {
      const newCard: CompanyCard = {
        id: `card-${Date.now()}`,
        cardNumber: `**** **** **** ${cardNumberLast4 || '4242'}`,
        limit: cardMonthlyLimit,
        lastFour: cardNumberLast4 || Math.floor(1000 + Math.random() * 9000).toString(),
        last4: cardNumberLast4 || Math.floor(1000 + Math.random() * 9000).toString(),
        assignedWorkerId: cardAssignedWorkerId || workers[0]?.id || 'w1',
        assignedWorkerName: assigned?.name || workers[0]?.name || 'Crew Member',
        dailyLimit: cardDailyLimit,
        monthlyLimit: cardMonthlyLimit,
        currentMonthSpend: 0,
        status: 'active',
        brand: 'Visa Business',
        nickname: cardNickName || `Fleet Card #${cardNumberLast4 || '0000'}`
      };
      onUpdateCards([...cards, newCard]);
      setShowAddCardForm(false);
    }

    setCardNickName('');
    setCardNumberLast4('');
    setCardAssignedWorkerId('');
    setCardDailyLimit(500);
    setCardMonthlyLimit(5000);
  };

  const handleStartEdit = (card: CompanyCard) => {
    setIsEditingCard(card);
    setCardNickName(card.nickname || '');
    setCardNumberLast4(card.lastFour);
    setCardAssignedWorkerId(card.assignedWorkerId);
    setCardDailyLimit(card.dailyLimit || 500);
    setCardMonthlyLimit(card.monthlyLimit || 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 md:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                Company Cards & Expenses
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                  {cards.length} Cards • {allPurchases.length} Logged Purchases
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Consolidated corporate spending, limits, receipts, and material logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(userRole === 'company' || userRole === 'admin') && (
              <button
                onClick={() => {
                  setIsEditingCard(null);
                  setShowAddCardForm(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Issue Card
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="bg-slate-950/80 px-4 md:px-6 py-2.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            {[
              { id: 'all', label: 'All Cards & Purchases' },
              { id: 'cards', label: `Active Cards (${cards.length})` },
              { id: 'purchases', label: `Logged Expenses (${filteredPurchases.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeSubTab === tab.id
                    ? 'bg-blue-600 text-white shadow font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono font-bold text-slate-300">
            Filtered Total: <span className="text-emerald-400 font-black">${totalFilteredSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1">

          {/* Section 1: COMPANY CARDS */}
          {(activeSubTab === 'all' || activeSubTab === 'cards') && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  Corporate Fleet & Material Cards ({cards.length})
                </h3>
              </div>

              {cards.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No company cards issued yet. Click "Issue Card" above to assign one to an employee.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cards.map(card => {
                    const assignedWorker = workers.find(w => w.id === card.assignedWorkerId);
                    const isActive = card.status === 'active';

                    return (
                      <div
                        key={card.id}
                        className={`p-4 rounded-2xl border transition shadow-sm flex flex-col justify-between gap-3 ${
                          isActive
                            ? 'bg-slate-950 border-slate-800 hover:border-blue-500/60'
                            : 'bg-slate-950/60 border-red-900/40 opacity-70'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-300">
                              {card.brand || 'Visa Business'}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-white text-sm">
                              {card.nickname || `Card •••• ${card.lastFour}`}
                            </h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="w-3.5 h-3.5 text-blue-400" />
                              Assigned to: <strong className="text-white">{assignedWorker?.name || card.assignedWorkerName}</strong>
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs font-mono">
                            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-850">
                              <span className="text-[10px] text-slate-500 block">Daily Limit</span>
                              <span className="text-amber-400 font-bold">${card.dailyLimit || 500}</span>
                            </div>
                            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-850">
                              <span className="text-[10px] text-slate-500 block">Monthly Limit</span>
                              <span className="text-emerald-400 font-bold">${card.monthlyLimit || 5000}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card controls for Company */}
                        {(userRole === 'company' || userRole === 'admin') && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                            <button
                              onClick={() => handleStartEdit(card)}
                              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" /> Edit Limits
                            </button>

                            <button
                              onClick={() => handleToggleCardActive(card.id)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                                isActive
                                  ? 'bg-red-950/60 text-red-400 hover:bg-red-900/80 border border-red-800/40'
                                  : 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-800/40'
                              }`}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2: EXPENSES / PURCHASES */}
          {(activeSubTab === 'all' || activeSubTab === 'purchases') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  Logged Card Purchases & Receipts ({filteredPurchases.length})
                </h3>
              </div>

              {/* Filters Bar */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search purchases, merchant..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 text-xs text-white placeholder:text-slate-500 rounded-xl border border-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Worker Filter */}
                <div>
                  <select
                    value={filterWorkerId}
                    onChange={(e) => setFilterWorkerId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Employees</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Job Filter */}
                <div>
                  <select
                    value={filterJobId}
                    onChange={(e) => setFilterJobId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 truncate"
                  >
                    <option value="all">All Job Sites</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.address}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="materials">Materials</option>
                    <option value="fuel">Fuel</option>
                    <option value="equipment">Equipment</option>
                    <option value="meals">Meals</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Purchases List */}
              {filteredPurchases.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No purchases found matching your filter criteria.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPurchases.map(purchase => {
                    const categoryColors: Record<string, string> = {
                      materials: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                      fuel: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      equipment: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                      meals: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                      other: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                    };
                    const catKey = purchase.category?.toLowerCase() || 'other';

                    return (
                      <div
                        key={purchase.id}
                        className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${categoryColors[catKey] || categoryColors.other}`}>
                              {purchase.category || 'Materials'}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              {formatMDY(purchase.date)}
                            </span>
                            <span className="text-[10px] font-mono bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded">
                              Card •••• {purchase.cardLast4 || 'Fleet'}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {purchase.workerName}
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 font-medium">
                            {purchase.description}
                          </p>

                          <p className="text-[11px] text-slate-400">
                            Job: <strong className="text-slate-300">{purchase.jobAddress || 'General Operations'}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                          {/* Receipt Photo preview thumbnail */}
                          {purchase.receiptPhoto && (
                            <button
                              onClick={() => setPreviewReceiptUrl(purchase.receiptPhoto || null)}
                              className="relative group p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500 transition cursor-pointer"
                              title="Click to view full receipt photo"
                            >
                              <img
                                src={purchase.receiptPhoto}
                                alt="Receipt"
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                          )}

                          <div className="text-right">
                            <span className="text-base font-black font-mono text-emerald-400 block">
                              ${purchase.amount.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">
                              {purchase.status || 'Approved'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Edit / Add Card Form Modal */}
        {(showAddCardForm || isEditingCard) && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  {isEditingCard ? 'Edit Card Limits' : 'Issue New Company Card'}
                </h4>
                <button
                  onClick={() => {
                    setShowAddCardForm(false);
                    setIsEditingCard(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCard} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Card Nickname</label>
                  <input
                    type="text"
                    value={cardNickName}
                    onChange={(e) => setCardNickName(e.target.value)}
                    placeholder="e.g. Truck 3 Materials Card"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {!isEditingCard && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardNumberLast4}
                      onChange={(e) => setCardNumberLast4(e.target.value)}
                      placeholder="e.g. 5891"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Assigned Worker</label>
                  <select
                    value={cardAssignedWorkerId}
                    onChange={(e) => setCardAssignedWorkerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Employee --</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.position || 'Field Crew'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Daily Limit ($)</label>
                    <input
                      type="number"
                      value={cardDailyLimit}
                      onChange={(e) => setCardDailyLimit(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">Monthly Limit ($)</label>
                    <input
                      type="number"
                      value={cardMonthlyLimit}
                      onChange={(e) => setCardMonthlyLimit(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCardForm(false);
                      setIsEditingCard(null);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg shadow"
                  >
                    {isEditingCard ? 'Save Limits' : 'Create Card'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receipt Photo Enlargement Modal */}
        {previewReceiptUrl && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewReceiptUrl(null)}>
            <div className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-2 text-xs text-slate-400 font-mono">
                <span>Verified Receipt Document</span>
                <button onClick={() => setPreviewReceiptUrl(null)} className="text-white hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img src={previewReceiptUrl} alt="Full Receipt" className="w-full max-h-[75vh] object-contain rounded-xl" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
