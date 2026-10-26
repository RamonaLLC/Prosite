import React, { useState } from 'react';
import { 
  Job, JobOffer, InspectionRequest, ChangeOrder, 
  AppNotification, Role 
} from '../types';
import { 
  Inbox, CheckCircle2, XCircle, Clock, Calendar, 
  DollarSign, FileText, AlertTriangle, ArrowRight, 
  Check, X, RefreshCw, Send, Search, Filter, ShieldCheck, MapPin
} from 'lucide-react';

interface CompanyPendingRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  onUpdateJobs?: (updatedJobs: Job[]) => void;
  onSendNotification?: (title: string, message: string, type: any, jobId?: string) => void;
  onSelectJob?: (jobId: string) => void;
}

export const CompanyPendingRequestsModal: React.FC<CompanyPendingRequestsModalProps> = ({
  isOpen,
  onClose,
  jobs,
  onUpdateJobs,
  onSendNotification,
  onSelectJob
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'inspections' | 'offers' | 'change_orders' | 'estimates'>('all');
  
  // Revise / Counter state
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>('');
  const [counterNotes, setCounterNotes] = useState<string>('');

  // Propose alternative inspection time state
  const [reschedulingInspectionJobId, setReschedulingInspectionJobId] = useState<string | null>(null);
  const [altDate, setAltDate] = useState<string>('2026-06-26');
  const [altTime, setAltTime] = useState<string>('14:00');

  // Convert inspection to active job state
  const [convertingInspectionJobId, setConvertingInspectionJobId] = useState<string | null>(null);
  const [proposedJobTotal, setProposedJobTotal] = useState<number>(14500);

  if (!isOpen) return null;

  // 1. Gather all pending inspections
  const pendingInspections = jobs
    .filter(j => j.inspectionStatus === 'proposed' || (j.inspectionRequest && j.inspectionRequest.status === 'pending'))
    .map(j => ({
      jobId: j.id,
      title: j.title,
      address: j.address,
      clientName: j.clientName,
      clientEmail: j.clientEmail,
      clientPhone: j.clientPhone || '(415) 555-0199',
      inspectionDate: j.inspectionDate || j.inspectionRequest?.requestedDate || '2026-06-25',
      inspectionTime: j.inspectionTime || j.inspectionRequest?.requestedTime || '10:00',
      inspectionFee: j.inspectionFee || j.inspectionRequest?.inspectionFee || 150,
      feePaid: true,
      requestDate: j.inspectionRequest?.createdAt || '2026-06-22',
      status: 'pending' as const
    }));

  // 1b. Gather all confirmed / scheduled inspections ready for conversion to active job
  const scheduledInspections = jobs
    .filter(j => (j.inspectionStatus === 'scheduled' || j.inspectionStatus === 'confirmed') && j.status !== 'in-progress' && j.status !== 'completed')
    .map(j => ({
      jobId: j.id,
      title: j.title,
      address: j.address,
      clientName: j.clientName,
      clientEmail: j.clientEmail,
      clientPhone: j.clientPhone || '(415) 555-0199',
      inspectionDate: j.inspectionDate || '2026-06-25',
      inspectionTime: j.inspectionTime || '10:00',
      inspectionFee: j.inspectionFee || 150,
      feePaid: true,
      status: 'scheduled' as const
    }));

  // 2. Gather all pending job offers & bids awaiting company action
  const pendingOffers: {
    jobId: string;
    offer: JobOffer;
  }[] = [];

  jobs.forEach(j => {
    if (j.jobOffers) {
      j.jobOffers.forEach(o => {
        if (o.status === 'pending' && o.senderRole === 'customer') {
          pendingOffers.push({ jobId: j.id, offer: o });
        }
      });
    }
    // Check estimate counter requests awaiting company
    if (j.estimates) {
      j.estimates.forEach(est => {
        if (est.status === 'awaiting-company') {
          pendingOffers.push({
            jobId: j.id,
            offer: {
              id: est.id,
              jobId: j.id,
              jobTitle: j.title,
              senderRole: 'customer',
              senderName: j.clientName,
              clientName: j.clientName,
              clientEmail: j.clientEmail,
              proposedPrice: est.clientCounterPrice || est.currentAmount,
              proposedDuration: 'Standard',
              scopeSummary: est.notes || 'Customer countered project estimate price',
              status: 'pending',
              createdAt: '2026-06-22'
            }
          });
        }
      });
    }
  });

  // 3. Gather pending change orders
  const pendingChangeOrders: {
    jobId: string;
    changeOrder: ChangeOrder;
  }[] = [];

  jobs.forEach(j => {
    if (j.changeOrders) {
      j.changeOrders.forEach(co => {
        if (co.status === 'pending') {
          pendingChangeOrders.push({ jobId: j.id, changeOrder: co });
        }
      });
    }
  });

  const totalPendingCount = pendingInspections.length + pendingOffers.length + pendingChangeOrders.length;

  // Confirm Inspection Request
  const handleConfirmInspection = (jobId: string) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          inspectionStatus: 'scheduled' as const,
          inspectionRequest: j.inspectionRequest ? { ...j.inspectionRequest, status: 'confirmed' as const } : undefined
        };
      }
      return j;
    });
    onUpdateJobs?.(updated);
    const target = jobs.find(j => j.id === jobId);
    onSendNotification?.(
      'Inspection Confirmed',
      `Inspection for ${target?.clientName} at ${target?.address} has been confirmed. Inspection fee of $${target?.inspectionFee || 150} processed.`,
      'inspection',
      jobId
    );
  };

  // Convert Inspection to Active Job Workflow
  const handleConvertInspectionToActiveJob = (jobId: string) => {
    const target = jobs.find(j => j.id === jobId);
    const fee = target?.inspectionFee || 150;
    const netTotal = Math.max(0, proposedJobTotal - fee);

    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          status: 'not-started' as const,
          inspectionStatus: 'completed' as const,
          inspectionFeePaid: true,
          inspectionFeeDeducted: true,
          inspectionFeeStatus: `Paid ($${fee}) — Deducted from Active Job Total`,
          jobValue: netTotal,
          originalJobValue: proposedJobTotal,
          inspectionConvertedToJob: true,
          history: [
            ...(j.history || []),
            {
              id: `hist-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'Inspection Converted to Active Job',
              actor: 'Company',
              details: `Inspection completed. $${fee} booking fee deducted from active job total ($${netTotal.toLocaleString()} net).`
            }
          ]
        };
      }
      return j;
    });

    onUpdateJobs?.(updated);
    setConvertingInspectionJobId(null);
    onSendNotification?.(
      'Inspection Converted to Active Job 🏗️',
      `Inspection at ${target?.address} converted to an Active Job! $${fee} inspection fee deducted from total ($${netTotal.toLocaleString()} net).`,
      'job',
      jobId
    );
  };

  // Deny Inspection Request
  const handleDenyInspection = (jobId: string) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          inspectionStatus: undefined,
          inspectionRequest: j.inspectionRequest ? { ...j.inspectionRequest, status: 'denied' as const } : undefined
        };
      }
      return j;
    });
    onUpdateJobs?.(updated);
    const target = jobs.find(j => j.id === jobId);
    onSendNotification?.(
      'Inspection Denied',
      `Inspection request for ${target?.address} was declined. Customer fee will be refunded.`,
      'inspection',
      jobId
    );
  };

  // Propose alternative inspection time
  const handleProposeAlternativeTime = (jobId: string) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          inspectionDate: altDate,
          inspectionTime: altTime,
          inspectionStatus: 'proposed' as const,
          inspectionRequest: j.inspectionRequest ? {
            ...j.inspectionRequest,
            proposedAlternativeDate: altDate,
            proposedAlternativeTime: altTime,
            status: 'rescheduled' as const
          } : undefined
        };
      }
      return j;
    });
    onUpdateJobs?.(updated);
    setReschedulingInspectionJobId(null);
    onSendNotification?.(
      'Alternative Time Proposed',
      `Proposed alternative inspection slot: ${altDate} at ${altTime} to customer.`,
      'inspection',
      jobId
    );
  };

  // Accept Job Offer / Convert to Active Job
  const handleAcceptOffer = (jobId: string, offerId: string) => {
    const targetJob = jobs.find(j => j.id === jobId);
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        const updatedOffers = (j.jobOffers || []).map(o => o.id === offerId ? { ...o, status: 'accepted' as const } : o);
        const acceptedOffer = updatedOffers.find(o => o.id === offerId);
        return {
          ...j,
          status: 'in-progress' as const,
          jobOffers: updatedOffers,
          jobValue: acceptedOffer?.proposedPrice || j.jobValue || 24000
        };
      }
      return j;
    });
    onUpdateJobs?.(updated);
    onSendNotification?.(
      'Job Offer Accepted',
      `You accepted the job offer for "${targetJob?.title}". It is now an ACTIVE JOB and available for dispatch!`,
      'offer',
      jobId
    );
  };

  // Deny Job Offer
  const handleDenyOffer = (jobId: string, offerId: string) => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        const updatedOffers = (j.jobOffers || []).map(o => o.id === offerId ? { ...o, status: 'denied' as const } : o);
        return { ...j, jobOffers: updatedOffers };
      }
      return j;
    });
    onUpdateJobs?.(updated);
    onSendNotification?.(
      'Job Offer Denied',
      `The job offer has been marked as denied and customer notified.`,
      'offer',
      jobId
    );
  };

  // Submit Counter / Revised Offer
  const handleSendCounter = (jobId: string, offerId: string) => {
    if (!counterPrice) return;
    const priceNum = parseFloat(counterPrice);
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        const updatedOffers = (j.jobOffers || []).map(o => {
          if (o.id === offerId) {
            return {
              ...o,
              status: 'countered' as const,
              counterPrice: priceNum,
              counterNotes: counterNotes,
              updatedAt: new Date().toISOString()
            };
          }
          return o;
        });
        return { ...j, jobOffers: updatedOffers };
      }
      return j;
    });
    onUpdateJobs?.(updated);
    setCounteringOfferId(null);
    setCounterPrice('');
    setCounterNotes('');
    onSendNotification?.(
      'Revised Offer Sent',
      `Sent revised counter offer of $${priceNum.toLocaleString()} to customer for review.`,
      'offer',
      jobId
    );
  };

  // Accept/Deny Change Order
  const handleResolveChangeOrder = (jobId: string, coId: string, decision: 'accepted' | 'denied') => {
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        const updatedCos = (j.changeOrders || []).map(co => co.id === coId ? { ...co, status: decision } : co);
        return { ...j, changeOrders: updatedCos };
      }
      return j;
    });
    onUpdateJobs?.(updated);
    onSendNotification?.(
      `Change Order ${decision === 'accepted' ? 'Approved' : 'Declined'}`,
      `Change order status recorded as [${decision.toUpperCase()}].`,
      'change_order',
      jobId
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Pending Requests & Incoming Actions
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-black">
                  {totalPendingCount} Action Items
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Centralized inbox for inspections, job offers, change orders, and customer confirmations
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

        {/* Filter categories */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Pending ({totalPendingCount})
          </button>

          <button
            onClick={() => setFilterCategory('inspections')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'inspections'
                ? 'bg-blue-600 text-white font-black shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Inspection Requests ({pendingInspections.length})
          </button>

          <button
            onClick={() => setFilterCategory('offers')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'offers'
                ? 'bg-emerald-600 text-white font-black shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Job Offers & Bids ({pendingOffers.length})
          </button>

          <button
            onClick={() => setFilterCategory('change_orders')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'change_orders'
                ? 'bg-purple-600 text-white font-black shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Change Orders ({pendingChangeOrders.length})
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {totalPendingCount === 0 && (
            <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Zero Pending Requests</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Your pending inbox is completely clear! Any new customer inspection requests, job offers, or change orders will appear here immediately.
              </p>
            </div>
          )}

          {/* 1. INSPECTIONS SECTION */}
          {(filterCategory === 'all' || filterCategory === 'inspections') && pendingInspections.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase font-mono tracking-wider text-blue-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Pending Foundation & Pre-Construction Inspections ({pendingInspections.length})
              </h4>

              {pendingInspections.map((insp) => (
                <div 
                  key={insp.jobId}
                  className="p-4 bg-slate-950 border border-blue-500/40 rounded-xl space-y-3 shadow-sm hover:border-blue-500 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                          Pending Inspection
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          Fee Paid: ${insp.inspectionFee}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Requested: {insp.requestDate}
                        </span>
                      </div>

                      <h5 
                        onClick={() => {
                          onSelectJob?.(insp.jobId);
                          onClose();
                        }}
                        className="text-sm font-black text-white hover:text-blue-400 cursor-pointer underline decoration-dotted transition"
                        title="Click to open job details in modal"
                      >
                        {insp.title}
                      </h5>
                      <p className="text-xs text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {insp.address}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        Customer: <strong className="text-slate-200">{insp.clientName}</strong> • {insp.clientPhone} • {insp.clientEmail}
                      </p>

                      <div className="mt-2 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg inline-block">
                        Requested Inspection Date: <strong>{insp.inspectionDate} at {insp.inspectionTime}</strong>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex sm:flex-col items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleConfirmInspection(insp.jobId)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer w-full justify-center"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Confirm Inspection
                      </button>

                      <button
                        onClick={() => setReschedulingInspectionJobId(reschedulingInspectionJobId === insp.jobId ? null : insp.jobId)}
                        className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer w-full justify-center"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Propose Different Time
                      </button>

                      <button
                        onClick={() => handleDenyInspection(insp.jobId)}
                        className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer w-full justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                        Deny
                      </button>
                    </div>
                  </div>

                  {/* Inline propose different time tray */}
                  {reschedulingInspectionJobId === insp.jobId && (
                    <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <h6 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        Propose Available Alternative Inspection Slot
                      </h6>
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          type="date"
                          value={altDate}
                          onChange={(e) => setAltDate(e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                        />
                        <input
                          type="time"
                          value={altTime}
                          onChange={(e) => setAltTime(e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                        />
                        <button
                          onClick={() => handleProposeAlternativeTime(insp.jobId)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send Alternative Proposal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Scheduled / Confirmed Inspections Ready to Convert */}
              {scheduledInspections.length > 0 && (
                <div className="space-y-3 pt-3">
                  <h4 className="text-xs font-black uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmed Inspections Ready to Convert to Active Job ({scheduledInspections.length})
                  </h4>

                  {scheduledInspections.map((insp) => (
                    <div
                      key={insp.jobId}
                      className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              Confirmed & Scheduled
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                              Fee Paid: ${insp.inspectionFee} (Creditable)
                            </span>
                          </div>

                          <h5 
                            onClick={() => {
                              onSelectJob?.(insp.jobId);
                              onClose();
                            }}
                            className="text-sm font-black text-white hover:text-emerald-400 cursor-pointer underline decoration-dotted transition"
                            title="Click to open job details in modal"
                          >
                            {insp.title}
                          </h5>
                          <p className="text-xs text-slate-300 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {insp.address}
                          </p>
                          <p className="text-xs text-slate-400 font-medium">
                            Customer: <strong className="text-slate-200">{insp.clientName}</strong> • {insp.clientPhone}
                          </p>
                          <div className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg inline-block">
                            Confirmed Inspection Slot: <strong>{insp.inspectionDate} at {insp.inspectionTime}</strong>
                          </div>
                        </div>

                        {/* Convert to Active Job Action Button */}
                        <div className="shrink-0 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConvertingInspectionJobId(insp.jobId);
                              setProposedJobTotal(14500);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Convert Inspection to Active Job
                          </button>
                        </div>
                      </div>

                      {/* Convert dialog / drawer */}
                      {convertingInspectionJobId === insp.jobId && (
                        <div className="p-4 bg-slate-900 border border-emerald-500/60 rounded-xl space-y-3 animate-fade-in">
                          <h6 className="text-xs font-black text-white flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Convert Inspection to Active Job & Credit Fee
                          </h6>
                          <p className="text-[11px] text-slate-400">
                            Formalize the inspected project into an Active Job. The ${insp.inspectionFee} inspection fee paid by the customer is automatically deducted from the total project value.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-[10px] text-slate-400 uppercase font-mono block">Estimated Total</span>
                              <input
                                type="number"
                                value={proposedJobTotal}
                                onChange={(e) => setProposedJobTotal(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold mt-1"
                              />
                            </div>
                            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-[10px] text-slate-400 uppercase font-mono block">Inspection Credit</span>
                              <span className="text-xs font-mono font-bold text-emerald-400 mt-2 block">
                                -${insp.inspectionFee} (Deducted)
                              </span>
                            </div>
                            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                              <span className="text-[10px] text-slate-400 uppercase font-mono block">Net Active Job Total</span>
                              <span className="text-xs font-mono font-black text-white mt-2 block">
                                ${(Math.max(0, proposedJobTotal - insp.inspectionFee)).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-300 font-mono">
                            Fee Status: Paid (${insp.inspectionFee}) — Deducted from Active Job Total
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setConvertingInspectionJobId(null)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConvertInspectionToActiveJob(insp.jobId)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Confirm & Convert to Active Job
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. JOB OFFERS & BIDS SECTION */}
          {(filterCategory === 'all' || filterCategory === 'offers') && pendingOffers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Pending Customer Job Offers & Counter Bids ({pendingOffers.length})
              </h4>

              {pendingOffers.map(({ jobId, offer }) => (
                <div 
                  key={offer.id}
                  className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3 shadow-sm hover:border-emerald-500 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          Job Offer Received
                        </span>
                        <span className="text-xs font-mono font-black text-amber-400 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          Offer Price: ${offer.proposedPrice?.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Duration: {offer.proposedDuration}
                        </span>
                      </div>

                      <h5 
                        onClick={() => {
                          onSelectJob?.(jobId);
                          onClose();
                        }}
                        className="text-sm font-black text-white hover:text-amber-400 cursor-pointer underline decoration-dotted transition"
                        title="Click to open job details in modal"
                      >
                        {offer.jobTitle}
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {offer.scopeSummary}
                      </p>
                      <p className="text-xs text-slate-400">
                        From Customer: <strong className="text-slate-200">{offer.clientName || offer.senderName}</strong>
                      </p>
                    </div>

                    {/* Action Buttons: Accept, Deny, Revise / Counter */}
                    <div className="flex sm:flex-col items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAcceptOffer(jobId, offer.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer w-full justify-center"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept Job Offer
                      </button>

                      <button
                        onClick={() => setCounteringOfferId(counteringOfferId === offer.id ? null : offer.id)}
                        className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer w-full justify-center"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Revise / Counter
                      </button>

                      <button
                        onClick={() => handleDenyOffer(jobId, offer.id)}
                        className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer w-full justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                        Deny
                      </button>
                    </div>
                  </div>

                  {/* Inline Revise / Counter tray */}
                  {counteringOfferId === offer.id && (
                    <div className="mt-3 p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
                      <h6 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                        Submit Company Counter Offer
                      </h6>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Counter Price ($)</label>
                          <input
                            type="number"
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(e.target.value)}
                            placeholder="e.g. 26500"
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Reason / Notes</label>
                          <input
                            type="text"
                            value={counterNotes}
                            onChange={(e) => setCounterNotes(e.target.value)}
                            placeholder="Includes extra material allowance..."
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setCounteringOfferId(null)}
                          className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendCounter(jobId, offer.id)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Send Counter to Customer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3. CHANGE ORDERS SECTION */}
          {(filterCategory === 'all' || filterCategory === 'change_orders') && pendingChangeOrders.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase font-mono tracking-wider text-purple-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Customer Change Orders Requiring Action ({pendingChangeOrders.length})
              </h4>

              {pendingChangeOrders.map(({ jobId, changeOrder }) => (
                <div 
                  key={changeOrder.id}
                  className="p-4 bg-slate-950 border border-purple-500/40 rounded-xl space-y-2.5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          Scope Change Order
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          Cost Impact: +${changeOrder.costImpact.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          +{changeOrder.timeImpactDays} Days
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-white">{changeOrder.title}</h5>
                      <p className="text-xs text-slate-300">{changeOrder.description}</p>
                    </div>

                    <div className="flex sm:flex-col items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveChangeOrder(jobId, changeOrder.id, 'accepted')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer w-full justify-center"
                      >
                        <Check className="w-3 h-3" />
                        Approve Change
                      </button>
                      <button
                        onClick={() => handleResolveChangeOrder(jobId, changeOrder.id, 'denied')}
                        className="px-3 py-1.5 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer w-full justify-center"
                      >
                        <X className="w-3 h-3" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>All accepted offers automatically become <strong className="text-white">Active Jobs</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
          >
            Close Pending Inbox
          </button>
        </div>

      </div>
    </div>
  );
};
