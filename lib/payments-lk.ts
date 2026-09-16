import { createHmac, timingSafeEqual } from "node:crypto";

export interface PaymentsLkCustomer {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CreateCheckoutParams {
  amountCents: number; // e.g. 720000 for Rs. 7,200.00
  description: string;
  reference?: string;
  customer?: PaymentsLkCustomer;
  successUrl: string;
  cancelUrl: string;
  saveCard?: boolean;
  idempotencyKey?: string;
}

export interface CheckoutResponse {
  id: string;
  url: string;
  amountCents: number;
  description: string;
  reference?: string;
  status?: string;
  customer?: PaymentsLkCustomer;
  saveCard?: boolean;
  payment?: {
    id: string;
    status: string;
    amountCents: number;
    feeCents?: number;
    card?: {
      scheme: string;
      last4: string;
    };
  };
  createdAt?: string;
}

export interface WebhookEvent<T = any> {
  id: string;
  type:
    | "payment.succeeded"
    | "payment.failed"
    | "checkout.expired"
    | "card.saved"
    | "refund.succeeded"
    | "refund.failed";
  created: number;
  data: T;
}

const PAYMENTS_LK_API_URL =
  process.env.PAYMENTS_LK_API_URL || "https://api.payments.lk/v1";

/**
 * Returns the configured Payments.lk secret key (sk_test_... or sk_live_...)
 */
export function getPaymentsLkSecretKey(): string | null {
  return process.env.PAYMENTS_LK_SECRET_KEY || null;
}

/**
 * Returns the configured Payments.lk webhook signing secret
 */
export function getPaymentsLkWebhookSecret(): string | null {
  return process.env.PAYMENTS_LK_WEBHOOK_SECRET || null;
}

/**
 * Check whether Payments.lk is properly configured with an API key
 */
export function isPaymentsLkConfigured(): boolean {
  const key = getPaymentsLkSecretKey();
  return Boolean(key && key.trim().length > 0);
}

/**
 * Create a hosted checkout session on Payments.lk
 * POST https://api.payments.lk/v1/checkouts
 */
export async function createPaymentsLkCheckout(
  params: CreateCheckoutParams
): Promise<CheckoutResponse> {
  const secretKey = getPaymentsLkSecretKey();

  if (!secretKey) {
    // If not configured, throw a clear actionable error or allow simulation
    throw new Error(
      "PAYMENTS_LK_SECRET_KEY is not configured in environment variables. Obtain your sandbox key (sk_test_...) from https://payments.lk/developers"
    );
  }

  const idempotencyKey =
    params.idempotencyKey ||
    params.reference ||
    `chk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const bodyPayload: Record<string, any> = {
    amountCents: Math.round(params.amountCents),
    description: params.description,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
  };

  if (params.reference) {
    bodyPayload.reference = params.reference;
  }
  if (params.customer) {
    bodyPayload.customer = params.customer;
  }
  if (typeof params.saveCard === "boolean") {
    bodyPayload.saveCard = params.saveCard;
  }

  const response = await fetch(`${PAYMENTS_LK_API_URL}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey.trim()}`,
      "Idempotency-Key": idempotencyKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      `Payments.lk checkout creation failed with status ${response.status}`;
    console.error("Payments.lk API Error:", {
      status: response.status,
      data,
    });
    throw new Error(errorMsg);
  }

  return data as CheckoutResponse;
}

/**
 * Retrieve an existing checkout session from Payments.lk
 * GET https://api.payments.lk/v1/checkouts/:id
 */
export async function getPaymentsLkCheckout(
  checkoutId: string
): Promise<CheckoutResponse> {
  const secretKey = getPaymentsLkSecretKey();
  if (!secretKey) {
    throw new Error("PAYMENTS_LK_SECRET_KEY is not configured.");
  }

  const response = await fetch(`${PAYMENTS_LK_API_URL}/checkouts/${encodeURIComponent(checkoutId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey.trim()}`,
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Failed to retrieve checkout ${checkoutId}`);
  }

  return data as CheckoutResponse;
}

/**
 * Retrieve an individual payment record from Payments.lk
 * GET https://api.payments.lk/v1/payments/:id
 */
export async function getPaymentsLkPayment(paymentId: string): Promise<any> {
  const secretKey = getPaymentsLkSecretKey();
  if (!secretKey) {
    throw new Error("PAYMENTS_LK_SECRET_KEY is not configured.");
  }

  const response = await fetch(`${PAYMENTS_LK_API_URL}/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey.trim()}`,
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Failed to retrieve payment ${paymentId}`);
  }

  return data;
}

/**
 * Verify webhook signature from Payments.lk using HMAC-SHA256
 * Signature format: "t=1726400000,v1=<hex>"
 * Tolerance default: 300 seconds (5 minutes)
 */
export function verifyPaymentsLkWebhookSignature(
  header: string | null | undefined,
  rawBody: string,
  secret: string,
  toleranceSeconds = 300
): boolean {
  if (!header || !secret || !rawBody) return false;

  try {
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const idx = p.indexOf("=");
        if (idx === -1) return [p.trim(), ""];
        return [p.substring(0, idx).trim(), p.substring(idx + 1).trim()];
      })
    );

    const t = Number(parts.t);
    if (!t || isNaN(t)) return false;

    // Reject events outside tolerance window to prevent replay attacks
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowInSeconds - t) > toleranceSeconds) {
      console.warn("Payments.lk webhook timestamp exceeds tolerance:", {
        webhookTimestamp: t,
        now: nowInSeconds,
        diff: Math.abs(nowInSeconds - t),
      });
      return false;
    }

    const expected = createHmac("sha256", secret)
      .update(t + "." + rawBody)
      .digest();

    const given = Buffer.from(parts.v1 ?? "", "hex");

    if (given.length !== expected.length) return false;
    return timingSafeEqual(given, expected);
  } catch (err) {
    console.error("Exception during webhook signature verification:", err);
    return false;
  }
}
