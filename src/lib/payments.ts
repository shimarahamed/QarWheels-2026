/**
 * Payment provider boundary.
 *
 * No provider is wired in yet (no Stripe account exists for this project),
 * so every function here is a clearly-marked adapter: the ledger, commission
 * maths, payout records and all the UI around them are real and work end to
 * end — only the actual money movement is stubbed until STRIPE_SECRET_KEY is
 * set. Same posture as src/lib/email.ts.
 *
 * When wiring Stripe up:
 *   1. npm install stripe
 *   2. set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
 *   3. replace the stub bodies below (each notes what the real call is)
 *   4. implement src/app/api/webhooks/stripe/route.ts to reconcile
 *      transfer.created / transfer.failed back onto the payout record
 */

export type PayoutProvider = 'stripe_connect' | 'manual';

export type ConnectAccountResult = {
  accountId: string;
  onboardingUrl: string | null;
  /** False when running against the stub — the caller should surface this. */
  live: boolean;
};

export type TransferResult = {
  providerTransferId: string | null;
  status: 'Paid' | 'Processing' | 'Failed';
  live: boolean;
  failureReason?: string;
};

function isConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function warnStub(action: string): void {
  // eslint-disable-next-line no-console
  console.warn(
    `[payments] STRIPE_SECRET_KEY not set — "${action}" ran against the stub. ` +
      'The ledger/payout records are real; no money moved.',
  );
}

/**
 * Creates (or returns) the connected account a business receives payouts
 * into. Real call: stripe.accounts.create({type:'express', ...}) followed by
 * stripe.accountLinks.create(...) for the onboarding URL.
 */
export async function ensureConnectAccount(businessId: string): Promise<ConnectAccountResult> {
  if (!isConfigured()) {
    warnStub('ensureConnectAccount');
    return { accountId: `acct_stub_${businessId}`, onboardingUrl: null, live: false };
  }
  throw new Error('Stripe is configured but the integration has not been implemented yet — see src/lib/payments.ts');
}

/**
 * Moves a payout's net amount to the business's connected account.
 * Real call: stripe.transfers.create({amount, currency, destination}).
 */
export async function sendPayout(params: {
  businessId: string;
  connectAccountId: string;
  amountMinorUnits: number;
  currency: string;
  payoutId: string;
}): Promise<TransferResult> {
  if (!isConfigured()) {
    warnStub('sendPayout');
    // Deliberately reports Processing rather than Paid: nothing actually
    // settled, and marking it Paid would make the ledger lie.
    return { providerTransferId: null, status: 'Processing', live: false };
  }
  throw new Error('Stripe is configured but the integration has not been implemented yet — see src/lib/payments.ts');
}

/** Platform commission in minor units, from the business's rate in basis points. */
export function calculateCommission(grossMinorUnits: number, commissionRateBps: number): number {
  return Math.round((grossMinorUnits * commissionRateBps) / 10_000);
}

export function paymentsAreLive(): boolean {
  return isConfigured();
}
