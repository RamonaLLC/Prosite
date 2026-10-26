import React, { useState } from 'react';
import { Job, Role } from '../types';
import { 
  DollarSign, Check, X, Edit3, Briefcase, 
  User, Clock, AlertCircle, ArrowRight, ShieldCheck, 
  Sparkles, MapPin, Building, MessageSquare, RefreshCw
} from 'lucide-react';
import { formatMDY } from '../utils/dateFormatter';
import { getJobCardBgClass, getJobStatusBadge } from '../utils/jobStatusHelper';

interface OpenBidsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  userRole: Role;
  currentUserId?: string;
  onUpdateJobs: (updated: Job[]) => void;
  onSelectJob?: (job: Job) => void;
  onSendNotification?: (title: string, message: string, type: any, jobId?: string) => void;
}

export const OpenBidsModal: React.FC<OpenBidsModalProps> = ({
  isOpen,
  onClose,
  jobs,
  userRole,
  currentUserId,
  onUpdateJobs,
  onSelectJob,
  onSendNotification
}) => {
  if (!isOpen) return null;

  const isCustomer = userRole === 'customer' || userRole === 'client';
  const isCompany = userRole === 'company' || userRole === 'admin' || userRole === 'manager';

  // Customer counter state
  const [counteringBidId, setCounteringBidId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>('');
  const [counterMessage, setCounterMessage] = useState<string>('');

  // Company revise state
  const [revisingBidId, setRevisingBidId] = useState<string | null>(null);
  const [revisedPrice, setRevisedPrice] = useState<string>('');
  const [revisedNotes, setRevisedNotes] = useState<string>('');

  // 1. Customer: find all jobs that have bids submitted
  const customerJobsWithBids = jobs.filter(j => 
    (j.isOpenJob || j.status === 'open-bid' || (j.bids && j.bids.length > 0)) &&
    (j.bids && j.bids.length > 0)
  );

  // 2. Company: find all bids submitted across jobs
  const companyActiveBids: { job: Job; bid: any }[] = [];
  jobs.forEach(j => {
    if (j.bids && j.bids.length > 0) {
      j.bids.forEach(b => {
        // Show company's bids (or all bids if in company admin demo mode)
        companyActiveBids.push({ job: j, bid: b });
      });
    }
  });

  // CUSTOMER ACTIONS:
  // Accept Bid
  const handleAcceptBid = (jobId: string, bidId: string) => {
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) return;

    const acceptedBid = targetJob.bids?.find(b => b.id === bidId);
    const acceptedPrice = acceptedBid ? (acceptedBid.price || acceptedBid.amount || 0) : targetJob.jobValue;

    const updatedJobs = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          status: 'not-started' as const, // NOT STARTED until geofence arrival
          isOpenJob: false,
          acceptedOfferCompanyId: acceptedBid?.companyId || 'company-current',
          companyName: acceptedBid?.companyName || 'ABC Construction HQ',
          jobValue: acceptedPrice,
          bids: (j.bids || []).map(b => b.id === bidId ? { ...b, status: 'accepted' } : { ...b, status: 'denied' }),
          history: [
            ...(j.history || []),
            {
              id: `hist-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'Bid Accepted by Customer',
              actor: 'Customer',
              details: `Customer accepted bid of $${acceptedPrice.toLocaleString()} from ${acceptedBid?.companyName || 'Company'}. Exact job address is now revealed. Job status is NOT STARTED until geofence arrival.`
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs(updatedJobs);
    onSendNotification?.(
      'Bid Accepted! 🤝',
      `Thank you. The customer has accepted your bid of $${acceptedPrice.toLocaleString()} for ${targetJob.title}. Please assign employees and contact the customer prior to the scheduled start date to confirm details.`,
      'bid',
      jobId
    );
  };

  // Deny Bid
  const handleDenyBid = (jobId: string, bidId: string) => {
    const updatedJobs = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          bids: (j.bids || []).map(b => b.id === bidId ? { ...b, status: 'denied' } : b),
          history: [
            ...(j.history || []),
            {
              id: `hist-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'Bid Denied by Customer',
              actor: 'Customer',
              details: `Customer declined bid #${bidId}. The Open Job remains active for other contractor bids.`
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs(updatedJobs);
    onSendNotification?.(
      'Bid Declined',
      `Customer declined bid on ${jobs.find(j => j.id === jobId)?.title}. Your bid is closed.`,
      'bid',
      jobId
    );
  };

  // Submit Counter to Company Bid
  const handleSubmitCounter = (jobId: string, bidId: string) => {
    const priceNum = parseFloat(counterPrice);
    if (!priceNum || priceNum <= 0) return;

    const updatedJobs = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          bids: (j.bids || []).map(b => {
            if (b.id === bidId) {
              return {
                ...b,
                status: 'countered',
                counterPrice: priceNum,
                counterMessage: counterMessage.trim() || 'Customer proposed a counter price.'
              };
            }
            return b;
          }),
          history: [
            ...(j.history || []),
            {
              id: `hist-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'Customer Countered Bid',
              actor: 'Customer',
              details: `Customer countered with $${priceNum.toLocaleString()}: "${counterMessage}"`
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs(updatedJobs);
    onSendNotification?.(
      'Counter Offer from Customer',
      `Customer proposed a counter offer of $${priceNum.toLocaleString()} for ${jobs.find(j => j.id === jobId)?.title}. Please review in Open Bids.`,
      'bid',
      jobId
    );

    setCounteringBidId(null);
    setCounterPrice('');
    setCounterMessage('');
  };

  // COMPANY ACTIONS:
  // Revise Bid
  const handleSaveRevisedBid = (jobId: string, bidId: string) => {
    const priceNum = parseFloat(revisedPrice);
    if (!priceNum || priceNum <= 0) return;

    const updatedJobs = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          bids: (j.bids || []).map(b => {
            if (b.id === bidId) {
              return {
                ...b,
                price: priceNum,
                amount: priceNum,
                message: revisedNotes.trim() || b.message,
                status: 'pending',
                revisedAt: new Date().toISOString()
              };
            }
            return b;
          })
        };
      }
      return j;
    });

    onUpdateJobs(updatedJobs);
    onSendNotification?.(
      'Bid Revised by Contractor',
      `Contractor revised their bid to $${priceNum.toLocaleString()} for ${jobs.find(j => j.id === jobId)?.title}.`,
      'bid',
      jobId
    );

    setRevisingBidId(null);
    setRevisedPrice('');
    setRevisedNotes('');
  };

  // Cancel Bid (Company withdraws)
  const handleCancelBid = (jobId: string, bidId: string) => {
    const updatedJobs = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          bids: (j.bids || []).filter(b => b.id !== bidId)
        };
      }
      return j;
    });

    onUpdateJobs(updatedJobs);
    onSendNotification?.(
      'Bid Withdrawn',
      `Your bid for ${jobs.find(j => j.id === jobId)?.title} has been cancelled.`,
      'bid',
      jobId
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 md:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                Open Bids Workspace
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                  {isCustomer ? `${customerJobsWithBids.length} Jobs with Bids` : `${companyActiveBids.length} Submitted Bids`}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isCustomer
                  ? 'Review contractor bids on your open jobs. Accept, deny, or propose a counter offer.'
                  : 'Manage active proposals submitted to open jobs. Revise prices or cancel bids anytime.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* CUSTOMER VIEW */}
          {isCustomer && (
            <div className="space-y-4">
              {customerJobsWithBids.length === 0 ? (
                <div className="p-12 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-bold text-slate-300">No active bids received yet.</p>
                  <p>When verified contractors review your open jobs, their bids will appear here.</p>
                </div>
              ) : (
                customerJobsWithBids.map(job => (
                  <div key={job.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-blue-400 block">
                          Open Job Listing
                        </span>
                        <h4 className="text-sm font-black text-white">{job.title}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {job.address} • Target Start: {formatMDY(job.startDate)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Your Target Budget</span>
                        <span className="text-base font-black font-mono text-amber-400">
                          ${job.jobValue?.toLocaleString() || '15,000'}
                        </span>
                      </div>
                    </div>

                    {/* Bids List */}
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block">
                        Received Contractor Bids ({(job.bids || []).length})
                      </span>

                      {(job.bids || []).map((bid) => {
                        const isCountering = counteringBidId === bid.id;
                        const bidPrice = bid.price || bid.amount || 0;

                        return (
                          <div
                            key={bid.id}
                            className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                                  <Building className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-white">
                                    {bid.companyName || 'Verified General Contractor'}
                                  </h5>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                                    bid.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-300' :
                                    bid.status === 'denied' ? 'bg-rose-500/20 text-rose-300' :
                                    bid.status === 'countered' ? 'bg-amber-500/20 text-amber-300' :
                                    'bg-blue-500/20 text-blue-300'
                                  }`}>
                                    {bid.status || 'Pending Review'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-lg font-black font-mono text-emerald-400 block">
                                  ${bidPrice.toLocaleString()}
                                </span>
                                {bid.counterPrice && (
                                  <span className="text-[10px] font-mono text-amber-300 block">
                                    Your Counter: ${bid.counterPrice.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {bid.message && (
                              <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                                "{bid.message}"
                              </p>
                            )}

                            {/* Counter Form */}
                            {isCountering ? (
                              <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl space-y-2.5">
                                <span className="text-[11px] font-bold text-amber-300 block font-mono">
                                  Propose Counter Offer to Contractor:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    placeholder="Counter Price ($)"
                                    value={counterPrice}
                                    onChange={(e) => setCounterPrice(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400 font-mono"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Optional notes or timeline terms..."
                                    value={counterMessage}
                                    onChange={(e) => setCounterMessage(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                                  />
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => setCounteringBidId(null)}
                                    className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-lg cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSubmitCounter(job.id, bid.id)}
                                    className="px-3.5 py-1 bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white rounded-lg shadow-sm cursor-pointer"
                                  >
                                    Send Counter
                                  </button>
                                </div>
                              </div>
                            ) : (
                              bid.status !== 'accepted' && bid.status !== 'denied' && (
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => handleDenyBid(job.id, bid.id)}
                                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" /> Deny
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setCounteringBidId(bid.id);
                                      setCounterPrice(bidPrice.toString());
                                    }}
                                    className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" /> Counter
                                  </button>

                                  <button
                                    onClick={() => handleAcceptBid(job.id, bid.id)}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Accept Bid
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* COMPANY VIEW */}
          {isCompany && (
            <div className="space-y-4">
              {companyActiveBids.length === 0 ? (
                <div className="p-12 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-2">
                  <DollarSign className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-bold text-slate-300">No active submitted bids.</p>
                  <p>Browse Open Jobs to submit competitive proposals and bids to customers.</p>
                </div>
              ) : (
                companyActiveBids.map(({ job, bid }) => {
                  const isRevising = revisingBidId === bid.id;
                  const bidPrice = bid.price || bid.amount || 0;

                  return (
                    <div key={bid.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-blue-500/20 text-blue-300">
                              Bid on Open Job
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              bid.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-300' :
                              bid.status === 'denied' ? 'bg-rose-500/20 text-rose-300' :
                              bid.status === 'countered' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              Status: {bid.status || 'Submitted (Awaiting Customer)'}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-white mt-1">{job.title}</h4>
                          <p className="text-xs text-slate-400">
                            Client: <strong className="text-white">{job.clientName}</strong> • Region: {job.address.split(',').slice(-2).join(',').trim() || job.address}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Your Submitted Bid</span>
                          <span className="text-lg font-black font-mono text-emerald-400">
                            ${bidPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {bid.message && (
                        <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-850">
                          <strong>Cover Note:</strong> "{bid.message}"
                        </p>
                      )}

                      {/* Revision Form */}
                      {isRevising ? (
                        <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl space-y-2.5">
                          <span className="text-[11px] font-bold text-blue-300 block font-mono">
                            Revise Your Bid Proposal:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="New Price ($)"
                              value={revisedPrice}
                              onChange={(e) => setRevisedPrice(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-400 font-mono"
                            />
                            <input
                              type="text"
                              placeholder="Updated scope or note..."
                              value={revisedNotes}
                              onChange={(e) => setRevisedNotes(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setRevisingBidId(null)}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveRevisedBid(job.id, bid.id)}
                              className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg shadow-sm cursor-pointer"
                            >
                              Save Revision
                            </button>
                          </div>
                        </div>
                      ) : (
                        bid.status !== 'accepted' && (
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => onSelectJob?.(job)}
                              className="text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                            >
                              View Job Details (Modal)
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCancelBid(job.id, bid.id)}
                                className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Cancel Bid
                              </button>

                              <button
                                onClick={() => {
                                  setRevisingBidId(bid.id);
                                  setRevisedPrice(bidPrice.toString());
                                  setRevisedNotes(bid.message || '');
                                }}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Revise Bid
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
