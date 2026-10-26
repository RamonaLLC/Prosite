import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Lazy Stripe Initialization
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as any
    });
  }
  return stripeClient;
}

// In-memory data store for financial transactions, payment methods, and subscriptions
// (backed by Firestore sync on the client side)
interface StoredPaymentMethod {
  id: string;
  email: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  createdAt: string;
}

interface StoredTransaction {
  id: string;
  type: 'company_subscription' | 'job_posting_fee' | 'customer_job_payment' | 'inspection_fee' | 'refund';
  amount: number;
  currency: string;
  status: 'authorized' | 'captured' | 'succeeded' | 'refunded' | 'cancelled' | 'pending';
  platformFee: number; // strictly $0 for job & inspection payments!
  companyAmount: number; // 100% to company!
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

let dbTransactions: StoredTransaction[] = [];

let dbCustomerPaymentMethods: StoredPaymentMethod[] = [];

const dbCompanyConnect: Record<string, {
  connectedAccountId: string;
  status: 'not_connected' | 'pending' | 'connected' | 'restricted';
  payoutStatus: 'active' | 'pending' | 'disabled';
  onboardingCompleted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  bankName?: string;
  bankLast4?: string;
}> = {
  'co-1': {
    connectedAccountId: 'acct_1ProSiteCA984210',
    status: 'connected',
    payoutStatus: 'active',
    onboardingCompleted: true,
    payoutsEnabled: true,
    chargesEnabled: true,
    bankName: 'JPMorgan Chase Bank, N.A.',
    bankLast4: '4192'
  },
  'comp-1': {
    connectedAccountId: 'acct_1ProSiteCA984210',
    status: 'connected',
    payoutStatus: 'active',
    onboardingCompleted: true,
    payoutsEnabled: true,
    chargesEnabled: true,
    bankName: 'JPMorgan Chase Bank, N.A.',
    bankLast4: '4192'
  }
};

const dbCompanySubscriptions: Record<string, {
  plan: 'professional' | 'business';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  stripeSubscriptionId?: string;
  pricePerMonth: number;
  currentPeriodEnd: string;
}> = {
  'co-1': {
    plan: 'professional',
    status: 'active',
    stripeSubscriptionId: 'sub_1ProSiteSub29',
    pricePerMonth: 29,
    currentPeriodEnd: new Date(Date.now() + 86400000 * 16).toISOString()
  },
  'comp-1': {
    plan: 'professional',
    status: 'active',
    stripeSubscriptionId: 'sub_1ProSiteSub29',
    pricePerMonth: 29,
    currentPeriodEnd: new Date(Date.now() + 86400000 * 16).toISOString()
  }
};

// Express Middleware
app.use(express.json());

// -------------------------------------------------------------
// 1. HEALTH & DIAGNOSTICS
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY)
  });
});

app.post('/api/reset-test-data', (req, res) => {
  dbTransactions = [];
  dbCustomerPaymentMethods = [];
  res.json({
    success: true,
    message: 'All backend test records, simulated transactions, and customer payment methods have been completely reset.'
  });
});

// -------------------------------------------------------------
// 2. STRIPE CONNECT FOR COMPANIES
// -------------------------------------------------------------
app.get('/api/stripe/connect/status', async (req, res) => {
  const companyId = (req.query.companyId as string) || 'co-1';
  const stripe = getStripe();

  const record = dbCompanyConnect[companyId] || {
    connectedAccountId: `acct_${companyId}_stripe`,
    status: 'connected',
    payoutStatus: 'active',
    onboardingCompleted: true,
    payoutsEnabled: true,
    chargesEnabled: true,
    bankName: 'Wells Fargo Bank, N.A.',
    bankLast4: '8831'
  };

  if (stripe && record.connectedAccountId && !record.connectedAccountId.includes('_stripe')) {
    try {
      const account = await stripe.accounts.retrieve(record.connectedAccountId);
      record.payoutsEnabled = account.payouts_enabled ?? false;
      record.chargesEnabled = account.charges_enabled ?? false;
      record.status = account.charges_enabled ? 'connected' : 'pending';
      record.onboardingCompleted = account.details_submitted ?? false;
    } catch (e: any) {
      console.warn('Stripe retrieve account notice:', e.message);
    }
  }

  res.json(record);
});

app.post('/api/stripe/connect/onboard', async (req, res) => {
  const { companyId, companyName, email } = req.body;
  const stripe = getStripe();

  if (stripe) {
    try {
      // Create express connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email || undefined,
        business_profile: {
          name: companyName || 'Construction Company'
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });

      // Generate account link for onboarding
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${appUrl}?connect=refresh`,
        return_url: `${appUrl}?connect=success`,
        type: 'account_onboarding'
      });

      dbCompanyConnect[companyId] = {
        connectedAccountId: account.id,
        status: 'pending',
        payoutStatus: 'pending',
        onboardingCompleted: false,
        payoutsEnabled: false,
        chargesEnabled: false
      };

      return res.json({ url: accountLink.url, accountId: account.id });
    } catch (err: any) {
      console.error('Stripe connect error:', err);
      return res.status(500).json({ message: err.message });
    }
  }

  // Sandbox simulation mode
  const accountId = `acct_sim_${Date.now()}`;
  dbCompanyConnect[companyId] = {
    connectedAccountId: accountId,
    status: 'connected',
    payoutStatus: 'active',
    onboardingCompleted: true,
    payoutsEnabled: true,
    chargesEnabled: true,
    bankName: 'JPMorgan Chase Bank, N.A.',
    bankLast4: '4192'
  };

  res.json({
    url: '#stripe-connected-simulated',
    accountId,
    message: 'Stripe Connect express onboarding completed successfully'
  });
});

// -------------------------------------------------------------
// 3. CUSTOMER PAYMENT METHODS
// -------------------------------------------------------------
app.get('/api/stripe/customer/payment-methods', (req, res) => {
  const email = (req.query.email as string) || 'DevinJJenkins90@gmail.com';
  const methods = dbCustomerPaymentMethods.filter(m => m.email.toLowerCase() === email.toLowerCase());
  res.json({ paymentMethods: methods });
});

app.post('/api/stripe/customer/payment-methods', async (req, res) => {
  const { email, number, exp_month, exp_year, cvc, cardholderName } = req.body;
  if (!email || !number) {
    return res.status(400).json({ message: 'Email and card number required' });
  }

  const cleanNumber = String(number).replace(/\s+/g, '');
  const last4 = cleanNumber.slice(-4) || '4242';
  let brand = 'visa';
  if (cleanNumber.startsWith('5')) brand = 'mastercard';
  else if (cleanNumber.startsWith('3')) brand = 'amex';
  else if (cleanNumber.startsWith('6')) brand = 'discover';

  const stripe = getStripe();
  let paymentMethodId = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  if (stripe) {
    try {
      const pm = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cleanNumber,
          exp_month: Number(exp_month) || 12,
          exp_year: Number(exp_year) || 2028,
          cvc: cvc || '123'
        },
        billing_details: {
          name: cardholderName,
          email: email
        }
      });
      paymentMethodId = pm.id;
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  // Check if this is the user's first card (make default)
  const existingCards = dbCustomerPaymentMethods.filter(m => m.email.toLowerCase() === email.toLowerCase());
  const isFirstCard = existingCards.length === 0;

  const newMethod: StoredPaymentMethod = {
    id: paymentMethodId,
    email,
    brand,
    last4,
    exp_month: Number(exp_month) || 12,
    exp_year: Number(exp_year) || 2028,
    is_default: isFirstCard,
    createdAt: new Date().toISOString()
  };

  dbCustomerPaymentMethods.push(newMethod);
  res.json({ paymentMethod: newMethod });
});

app.delete('/api/stripe/customer/payment-methods/:id', (req, res) => {
  const { id } = req.params;
  const email = (req.query.email as string) || '';

  const index = dbCustomerPaymentMethods.findIndex(m => m.id === id);
  if (index !== -1) {
    const wasDefault = dbCustomerPaymentMethods[index].is_default;
    dbCustomerPaymentMethods.splice(index, 1);

    // If deleted card was default, set another card as default
    if (wasDefault) {
      const remaining = dbCustomerPaymentMethods.filter(m => m.email.toLowerCase() === email.toLowerCase());
      if (remaining.length > 0) {
        remaining[0].is_default = true;
      }
    }
  }

  res.json({ success: true });
});

app.post('/api/stripe/customer/payment-methods/:id/default', (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  dbCustomerPaymentMethods.forEach(m => {
    if (m.email.toLowerCase() === String(email).toLowerCase()) {
      m.is_default = m.id === id;
    }
  });

  res.json({ success: true });
});

// -------------------------------------------------------------
// 4. $5 JOB POSTING FEE (Company -> Platform)
// -------------------------------------------------------------
app.post('/api/stripe/jobs/publish-fee', async (req, res) => {
  const { companyId, jobId, jobTitle } = req.body;
  if (!jobId) {
    return res.status(400).json({ message: 'Job ID is required' });
  }

  // Prevent duplicate charge
  const existingCharge = dbTransactions.find(
    t => t.type === 'job_posting_fee' && t.jobId === jobId && t.status === 'succeeded'
  );
  if (existingCharge) {
    return res.json({ transaction: existingCharge, message: 'Fee already paid' });
  }

  const transaction: StoredTransaction = {
    id: `tx_post_${Date.now()}`,
    type: 'job_posting_fee',
    amount: 5.00,
    currency: 'usd',
    status: 'succeeded',
    platformFee: 5.00, // 100% of $5 belongs to app owner!
    companyAmount: 0.00,
    jobId,
    jobTitle: jobTitle || 'Construction Job',
    companyId: companyId || 'co-1',
    description: `$5 Job Posting Fee — ${jobTitle || jobId}`,
    createdAt: new Date().toISOString()
  };

  dbTransactions.unshift(transaction);
  res.json({ transaction, published: true });
});

// -------------------------------------------------------------
// 5. INSPECTION PAYMENTS (Customer -> Company, $0 platform fee)
// -------------------------------------------------------------
app.post('/api/stripe/inspections/authorize', async (req, res) => {
  const { 
    customerEmail, customerName, companyId, companyName, 
    inspectionId, jobId, feeAmount, paymentMethodId 
  } = req.body;

  const fee = Number(feeAmount) || 150;
  const transaction: StoredTransaction = {
    id: `tx_insp_auth_${Date.now()}`,
    type: 'inspection_fee',
    amount: fee,
    currency: 'usd',
    status: 'authorized',
    platformFee: 0.00, // Strictly $0 Platform Fee
    companyAmount: fee, // 100% to Company
    inspectionId,
    jobId,
    companyId: companyId || 'co-1',
    companyName: companyName || 'ProSite Contractors',
    customerEmail,
    customerName,
    paymentMethodId,
    description: `Inspection Fee Authorized — ${customerName || customerEmail} ($${fee})`,
    createdAt: new Date().toISOString()
  };

  dbTransactions.unshift(transaction);
  res.json({ transaction });
});

app.post('/api/stripe/inspections/capture', async (req, res) => {
  const { inspectionId, jobId, companyId } = req.body;

  // Find authorized transaction
  const authTx = dbTransactions.find(
    t => (t.inspectionId === inspectionId || t.jobId === jobId) && t.status === 'authorized'
  );

  const amount = authTx ? authTx.amount : 150;
  const transaction: StoredTransaction = {
    id: `tx_insp_cap_${Date.now()}`,
    type: 'inspection_fee',
    amount,
    currency: 'usd',
    status: 'captured',
    platformFee: 0.00, // Strictly $0 Platform Fee
    companyAmount: amount, // 100% to Company
    inspectionId,
    jobId,
    companyId: companyId || authTx?.companyId || 'co-1',
    companyName: authTx?.companyName || 'ProSite Contractors',
    customerEmail: authTx?.customerEmail,
    customerName: authTx?.customerName,
    description: `Inspection Fee Captured (100% to Company) — $${amount}`,
    createdAt: authTx?.createdAt || new Date().toISOString(),
    capturedAt: new Date().toISOString()
  };

  if (authTx) {
    authTx.status = 'captured';
    authTx.capturedAt = new Date().toISOString();
  } else {
    dbTransactions.unshift(transaction);
  }

  res.json({ transaction });
});

app.post('/api/stripe/inspections/refund', async (req, res) => {
  const { inspectionId, jobId, reason } = req.body;

  const targetTx = dbTransactions.find(
    t => (t.inspectionId === inspectionId || t.jobId === jobId) && (t.status === 'authorized' || t.status === 'captured')
  );

  const amount = targetTx ? targetTx.amount : 150;
  const refundTx: StoredTransaction = {
    id: `tx_insp_ref_${Date.now()}`,
    type: 'refund',
    amount,
    currency: 'usd',
    status: 'refunded',
    platformFee: 0.00,
    companyAmount: -amount,
    inspectionId,
    jobId,
    companyId: targetTx?.companyId || 'co-1',
    customerEmail: targetTx?.customerEmail,
    customerName: targetTx?.customerName,
    description: `Inspection Fee Refund (${reason || 'Inspection Cancelled/Denied'}) — $${amount}`,
    createdAt: new Date().toISOString(),
    refundedAt: new Date().toISOString()
  };

  if (targetTx) {
    targetTx.status = 'refunded';
    targetTx.refundedAt = new Date().toISOString();
  }
  dbTransactions.unshift(refundTx);

  res.json({ transaction: refundTx, refunded: true });
});

// -------------------------------------------------------------
// 6. CUSTOMER -> COMPANY JOB PAYMENTS (100% to Company, $0 fee)
// -------------------------------------------------------------
app.post('/api/stripe/jobs/charge-payment', async (req, res) => {
  const {
    customerEmail, customerName, companyId, companyName,
    jobId, jobTitle, amount, paymentMethodId
  } = req.body;

  const numAmount = Number(amount) || 1000;

  const transaction: StoredTransaction = {
    id: `tx_job_pay_${Date.now()}`,
    type: 'customer_job_payment',
    amount: numAmount,
    currency: 'usd',
    status: 'succeeded',
    platformFee: 0.00, // Strictly $0 Platform Fee
    companyAmount: numAmount, // 100% to Company
    jobId,
    jobTitle,
    companyId: companyId || 'co-1',
    companyName: companyName || 'Apex Structural Builders',
    customerEmail,
    customerName,
    paymentMethodId,
    description: `Customer Job Payment for "${jobTitle || 'Job'}" (100% transferred to Company)`,
    createdAt: new Date().toISOString(),
    capturedAt: new Date().toISOString()
  };

  dbTransactions.unshift(transaction);
  res.json({ transaction });
});

// -------------------------------------------------------------
// 7. 24-HOUR JOB COMPLETION & PAYMENT RELEASE
// -------------------------------------------------------------
app.post('/api/stripe/jobs/release-payment', (req, res) => {
  const { jobId, companyId, amount } = req.body;
  const numAmount = Number(amount) || 18500;

  const releaseTx: StoredTransaction = {
    id: `tx_rel_${Date.now()}`,
    type: 'customer_job_payment',
    amount: numAmount,
    currency: 'usd',
    status: 'captured',
    platformFee: 0.00, // Strictly $0 Platform Fee
    companyAmount: numAmount, // 100% to Company
    jobId,
    companyId: companyId || 'co-1',
    description: `Job Payment Released to Company upon Completion — $${numAmount.toLocaleString()} ($0 Platform Fee)`,
    createdAt: new Date().toISOString(),
    capturedAt: new Date().toISOString()
  };

  dbTransactions.unshift(releaseTx);
  res.json({ transaction: releaseTx, released: true });
});

// -------------------------------------------------------------
// 8. COMPANY SUBSCRIPTIONS ($29 Professional vs $59 Business)
// -------------------------------------------------------------
app.get('/api/stripe/subscriptions/status', (req, res) => {
  const companyId = (req.query.companyId as string) || 'co-1';
  const sub = dbCompanySubscriptions[companyId] || {
    plan: 'professional',
    status: 'active',
    pricePerMonth: 29,
    currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString()
  };
  res.json(sub);
});

app.post('/api/stripe/subscriptions/change-plan', (req, res) => {
  const { companyId, plan } = req.body;
  const targetPlan: 'professional' | 'business' = plan === 'business' ? 'business' : 'professional';
  const price = targetPlan === 'business' ? 59 : 29;

  const updatedSub = {
    plan: targetPlan,
    status: 'active' as const,
    stripeSubscriptionId: `sub_${companyId}_${targetPlan}`,
    pricePerMonth: price,
    currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
    cancelAtPeriodEnd: false
  };

  dbCompanySubscriptions[companyId || 'co-1'] = updatedSub;

  // Record platform subscription payment transaction
  const subTx: StoredTransaction = {
    id: `tx_sub_${Date.now()}`,
    type: 'company_subscription',
    amount: price,
    currency: 'usd',
    status: 'succeeded',
    platformFee: price, // 100% belongs to platform owner
    companyAmount: 0.00,
    companyId: companyId || 'co-1',
    description: `Platform Monthly Subscription — ${targetPlan === 'business' ? 'Business ($59/mo)' : 'Professional ($29/mo)'}`,
    createdAt: new Date().toISOString()
  };
  dbTransactions.unshift(subTx);

  res.json(updatedSub);
});

// -------------------------------------------------------------
// 9. TRANSACTION LEDGER
// -------------------------------------------------------------
app.get('/api/stripe/transactions', (req, res) => {
  const companyId = req.query.companyId as string;
  const customerEmail = req.query.customerEmail as string;

  let list = dbTransactions;
  if (companyId) {
    list = list.filter(t => !t.companyId || t.companyId === companyId);
  }
  if (customerEmail) {
    list = list.filter(t => !t.customerEmail || t.customerEmail.toLowerCase() === customerEmail.toLowerCase());
  }

  res.json(list);
});

// -------------------------------------------------------------
// 10. SERVER-SIDE GEOFENCING VALIDATION
// -------------------------------------------------------------
app.post('/api/geofence/validate', (req, res) => {
  const { workerLat, workerLng, siteLat, siteLng, radiusMiles = 0.5 } = req.body;

  if (typeof workerLat !== 'number' || typeof workerLng !== 'number' ||
      typeof siteLat !== 'number' || typeof siteLng !== 'number') {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  // Haversine formula
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (siteLat - workerLat) * Math.PI / 180;
  const dLon = (siteLng - workerLng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(workerLat * Math.PI / 180) * Math.cos(siteLat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMiles = R * c;

  const isWithinGeofence = distanceMiles <= Number(radiusMiles);

  res.json({
    distanceMiles: Number(distanceMiles.toFixed(2)),
    isWithinGeofence,
    thresholdMiles: radiusMiles,
    verifiedAt: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// 11. STRIPE WEBHOOK HANDLER
// -------------------------------------------------------------
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  let event: any = null;

  if (stripe && webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log('Verified Stripe Webhook received:', event.type);
    } catch (err: any) {
      console.warn('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // Sandbox / dev fallback
    try {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      event = req.body;
    }
  }

  if (event && event.type) {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data?.object;
        if (pi) {
          const matchTx = dbTransactions.find(t => t.stripePaymentIntentId === pi.id);
          if (matchTx) {
            matchTx.status = 'succeeded';
            matchTx.capturedAt = new Date().toISOString();
          } else {
            // Log new transaction
            dbTransactions.unshift({
              id: `tx_${pi.id}`,
              type: pi.metadata?.type || 'customer_job_payment',
              amount: (pi.amount_received || pi.amount || 0) / 100,
              currency: pi.currency || 'usd',
              status: 'succeeded',
              platformFee: pi.metadata?.type === 'job_posting_fee' ? 5.00 : 0.00,
              companyAmount: pi.metadata?.type === 'job_posting_fee' ? 0.00 : ((pi.amount_received || pi.amount || 0) / 100),
              stripePaymentIntentId: pi.id,
              jobId: pi.metadata?.jobId,
              description: pi.description || 'Stripe payment transaction',
              createdAt: new Date().toISOString(),
              capturedAt: new Date().toISOString()
            });
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data?.object;
        if (pi) {
          const matchTx = dbTransactions.find(t => t.stripePaymentIntentId === pi.id);
          if (matchTx) {
            matchTx.status = 'cancelled';
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data?.object;
        if (sub && sub.metadata?.companyId) {
          const cid = sub.metadata.companyId;
          const plan = sub.items?.data?.[0]?.price?.unit_amount === 5900 ? 'business' : 'professional';
          dbCompanySubscriptions[cid] = {
            plan,
            status: sub.status === 'active' ? 'active' : 'past_due',
            stripeSubscriptionId: sub.id,
            pricePerMonth: plan === 'business' ? 59 : 29,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString()
          };
        }
        break;
      }
      case 'account.updated': {
        const acct = event.data?.object;
        if (acct && acct.id) {
          // Update Stripe Connect status
          Object.keys(dbCompanyConnect).forEach(cid => {
            if (dbCompanyConnect[cid].connectedAccountId === acct.id) {
              dbCompanyConnect[cid].payoutsEnabled = acct.payouts_enabled;
              dbCompanyConnect[cid].chargesEnabled = acct.charges_enabled;
              dbCompanyConnect[cid].status = acct.payouts_enabled ? 'connected' : 'pending';
              dbCompanyConnect[cid].payoutStatus = acct.payouts_enabled ? 'active' : 'pending';
            }
          });
        }
        break;
      }
    }
  }

  res.json({ received: true });
});

// -------------------------------------------------------------
// 12. VITE MIDDLEWARE (DEV) & STATIC SERVING (PROD)
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
