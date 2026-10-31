import { z } from "zod";
import { stableRequestId } from "../core/hash";
import {
  AUTHORIZATION_STATUSES,
  CAPTURE_STATUSES,
  MoneySchema,
} from "../core/types";
import type {
  AuthorizationStatus,
  CaptureStatus,
  Money,
  ProviderCheckpoint,
} from "../core/types";

export const PAYPAL_SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const ProviderMoneySchema = z.object({
  value: z.string(),
  currency_code: z.string(),
});
const IdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const PaymentResourceSchema = z
  .object({
    id: IdSchema,
    status: z.string(),
    amount: ProviderMoneySchema.optional(),
    supplementary_data: z
      .object({
        related_ids: z
          .object({
            order_id: z.string().optional(),
            authorization_id: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();
const OrderSchema = z
  .object({
    id: IdSchema,
    status: z.string(),
    intent: z.string().optional(),
    purchase_units: z
      .array(
        z
          .object({
            amount: ProviderMoneySchema.optional(),
            custom_id: z.string().optional(),
            reference_id: z.string().optional(),
            payee: z.object({ merchant_id: z.string().optional() }).optional(),
            payments: z
              .object({
                authorizations: z.array(PaymentResourceSchema).optional(),
                captures: z.array(PaymentResourceSchema).optional(),
              })
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
    links: z.array(z.object({ rel: z.string(), href: z.string() })).optional(),
  })
  .passthrough();

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number | null,
    readonly outcomeUnknown: boolean,
    readonly requestId: string | null = null,
    readonly debugId: string | null = null,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}
export interface PayPalOrder {
  id: string;
  status: string;
  intent: string | null;
  amount: Money | null;
  payeeId: string | null;
  customId: string | null;
  referenceId: string | null;
  authorizationIds: string[];
  captureIds: string[];
  approvalUrl: string | null;
}
export interface PayPalAuthorization {
  id: string;
  status: AuthorizationStatus;
  amount: Money;
  orderId: string | null;
  payeeId: string | null;
  expiresAt: string | null;
}
export interface PayPalCapture {
  id: string;
  status: CaptureStatus;
  amount: Money;
  orderId: string | null;
  authorizationId: string | null;
  finalCapture: boolean;
}
export interface CreateOrderInput {
  actionId: string;
  caseId: string;
  amount: Money;
  returnUrl: string;
  cancelUrl: string;
  referenceId?: string;
  payeeId?: string;
  item?: {
    name: string;
    sku: string;
    quantity: number;
    unitAmount: Money;
    tax?: Money;
  };
  breakdown?: {
    itemTotal: Money;
    shipping: Money;
    taxTotal: Money;
    discount?: Money;
  };
}
export interface PayPalAdapterOptions {
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

/** The hackathon provider deliberately accepts only USD. No float money conversion. */
export function toPayPalMoney(value: Money): {
  currency_code: string;
  value: string;
} {
  const parsed = MoneySchema.parse(value);
  if (parsed.currency !== "USD" || parsed.amountMinor <= 0)
    throw new TypeError("Only positive USD Sandbox payments are supported.");
  return {
    currency_code: "USD",
    value: `${Math.floor(parsed.amountMinor / 100)}.${String(parsed.amountMinor % 100).padStart(2, "0")}`,
  };
}
function toBreakdownMoney(value: Money) {
  MoneySchema.parse(value);
  if (value.currency !== "USD")
    throw new TypeError("Only USD Sandbox payments are supported.");
  return {
    currency_code: "USD",
    value: `${Math.floor(value.amountMinor / 100)}.${String(value.amountMinor % 100).padStart(2, "0")}`,
  };
}
export function fromPayPalMoney(value: {
  value: string;
  currency_code: string;
}): Money {
  if (value.currency_code !== "USD" || !/^\d+(?:\.\d{1,2})?$/.test(value.value))
    throw new PayPalError(
      "Provider returned an unsupported currency or malformed amount.",
      "PROVIDER_AMOUNT_INVALID",
      null,
      false,
    );
  const [whole, fraction = ""] = value.value.split(".");
  const minor = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new PayPalError(
      "Provider amount exceeds the supported range.",
      "PROVIDER_AMOUNT_INVALID",
      null,
      false,
    );
  return { amountMinor: Number(minor), currency: "USD" };
}
function validId(id: string) {
  return IdSchema.parse(id);
}
function parseOrder(raw: unknown): PayPalOrder {
  const data = OrderSchema.parse(raw);
  if (data.purchase_units && data.purchase_units.length !== 1)
    throw new PayPalError(
      "Expected exactly one provider purchase unit.",
      "PURCHASE_UNIT_COUNT",
      null,
      false,
    );
  const unit = data.purchase_units?.[0];
  const approval =
    data.links?.find(
      (link) => link.rel === "approve" || link.rel === "payer-action",
    )?.href ?? null;
  if (approval) {
    const url = new URL(approval);
    if (
      url.protocol !== "https:" ||
      !(
        url.hostname === "sandbox.paypal.com" ||
        url.hostname.endsWith(".sandbox.paypal.com")
      )
    )
      throw new PayPalError(
        "Provider approval link is not a Sandbox URL.",
        "SANDBOX_URL_REQUIRED",
        null,
        false,
      );
  }
  return {
    id: data.id,
    status: data.status,
    intent: data.intent ?? null,
    amount: unit?.amount ? fromPayPalMoney(unit.amount) : null,
    payeeId: unit?.payee?.merchant_id ?? null,
    customId: unit?.custom_id ?? null,
    referenceId: unit?.reference_id ?? null,
    authorizationIds: unit?.payments?.authorizations?.map((a) => a.id) ?? [],
    captureIds: unit?.payments?.captures?.map((a) => a.id) ?? [],
    approvalUrl: approval,
  };
}

/** No automatic financial retries. Callers persist the command and reuse its actionId. */
export class PayPalSandboxAdapter {
  private readonly fetcher: typeof fetch;
  private readonly clock: () => number;
  private readonly timeout: number;
  private token: { value: string; validUntil: number } | null = null;
  private tokenPromise: Promise<string> | null = null;
  constructor(private readonly options: PayPalAdapterOptions) {
    if ("window" in globalThis)
      throw new Error("PayPal credentials are server-only.");
    if (!options.clientId?.trim() || !options.clientSecret?.trim())
      throw new Error("PayPal Sandbox credentials are required.");
    this.fetcher = options.fetch ?? fetch;
    this.clock = options.now ?? Date.now;
    this.timeout = options.timeoutMs ?? 20_000;
    if (
      !Number.isSafeInteger(this.timeout) ||
      this.timeout < 1 ||
      this.timeout > 60_000
    )
      throw new Error("Invalid provider timeout.");
  }
  private async network(
    path: string,
    init: RequestInit,
    financial: boolean,
    requestId: string | null,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await this.fetcher(`${PAYPAL_SANDBOX_BASE}${path}`, {
        ...init,
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      });
      const text = await response.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        throw new PayPalError(
          "PayPal returned an unreadable response; reconcile before retrying.",
          "PROVIDER_RESPONSE_INVALID",
          response.status,
          financial,
          requestId,
        );
      }
      if (!response.ok) {
        const error = z
          .object({
            name: z.string().optional(),
            debug_id: z.string().optional(),
          })
          .safeParse(body);
        if (response.status === 401) this.token = null;
        throw new PayPalError(
          `PayPal Sandbox request failed (${response.status}).`,
          error.success
            ? (error.data.name ?? "PROVIDER_ERROR")
            : "PROVIDER_ERROR",
          response.status,
          financial && (response.status >= 500 || response.status === 409),
          requestId,
          error.success ? (error.data.debug_id ?? null) : null,
        );
      }
      return body;
    } catch (error) {
      if (error instanceof PayPalError) throw error;
      throw new PayPalError(
        "PayPal Sandbox connection failed; the request outcome may require reconciliation.",
        "PROVIDER_NETWORK_ERROR",
        null,
        financial,
        requestId,
      );
    } finally {
      clearTimeout(timer);
    }
  }
  private async accessToken(): Promise<string> {
    if (this.token && this.token.validUntil > this.clock())
      return this.token.value;
    if (this.tokenPromise) return this.tokenPromise;
    this.tokenPromise = (async () => {
      const raw = await this.network(
        "/v1/oauth2/token",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        },
        false,
        null,
      );
      const parsed = z
        .object({
          access_token: z.string().min(1),
          expires_in: z.number().positive(),
          token_type: z.string(),
        })
        .parse(raw);
      if (parsed.token_type.toLowerCase() !== "bearer")
        throw new Error("Unsupported token type.");
      this.token = {
        value: parsed.access_token,
        validUntil:
          this.clock() + Math.max(0, parsed.expires_in * 1000 - 60_000),
      };
      return parsed.access_token;
    })();
    try {
      return await this.tokenPromise;
    } finally {
      this.tokenPromise = null;
    }
  }
  private async request(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
    operation?: string,
    actionId?: string,
  ): Promise<unknown> {
    const token = await this.accessToken();
    const requestId =
      operation && actionId ? stableRequestId(operation, actionId) : null;
    return this.network(
      path,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      method === "POST" && operation !== "verify-webhook",
      requestId,
    );
  }
  private async parsedWrite<T>(
    operation: string,
    actionId: string,
    request: () => Promise<unknown>,
    parse: (raw: unknown) => T,
  ): Promise<T> {
    const raw = await request();
    try {
      return parse(raw);
    } catch {
      throw new PayPalError(
        "PayPal accepted the request but its result could not be verified. Reconcile this operation.",
        "PROVIDER_RESULT_UNKNOWN",
        null,
        true,
        stableRequestId(operation, actionId),
      );
    }
  }
  async createOrder(input: CreateOrderInput): Promise<PayPalOrder> {
    if (!input.caseId.trim()) throw new TypeError("Case ID is required.");
    for (const location of [input.returnUrl, input.cancelUrl]) {
      const url = new URL(location);
      if (
        url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        )
      )
        throw new TypeError("Checkout return URLs require HTTPS or localhost.");
      if (url.username || url.password)
        throw new TypeError("Checkout URLs must not contain credentials.");
    }
    const amount: Record<string, unknown> = toPayPalMoney(input.amount);
    if (input.breakdown) {
      const b = input.breakdown;
      if (
        [
          b.itemTotal,
          b.shipping,
          b.taxTotal,
          ...(b.discount ? [b.discount] : []),
        ].some((m) => m.currency !== input.amount.currency)
      )
        throw new TypeError("Breakdown currencies must match.");
      if (
        b.itemTotal.amountMinor +
          b.shipping.amountMinor +
          b.taxTotal.amountMinor -
          (b.discount?.amountMinor ?? 0) !==
        input.amount.amountMinor
      )
        throw new TypeError("Order breakdown must equal its total.");
      amount.breakdown = {
        item_total: toBreakdownMoney(b.itemTotal),
        shipping: toBreakdownMoney(b.shipping),
        tax_total: toBreakdownMoney(b.taxTotal),
        ...(b.discount ? { discount: toBreakdownMoney(b.discount) } : {}),
      };
    }
    if (input.item) {
      if (
        !input.breakdown ||
        !Number.isSafeInteger(input.item.quantity) ||
        input.item.quantity < 1 ||
        input.item.unitAmount.currency !== input.amount.currency ||
        input.item.unitAmount.amountMinor * input.item.quantity !==
          input.breakdown.itemTotal.amountMinor
      )
        throw new TypeError("Item totals require a matching order breakdown.");
    }
    const body = {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: input.referenceId ?? "default",
          custom_id: input.caseId,
          invoice_id: input.actionId,
          amount,
          ...(input.payeeId
            ? { payee: { merchant_id: validId(input.payeeId) } }
            : {}),
          ...(input.item
            ? {
                items: [
                  {
                    name: input.item.name,
                    sku: input.item.sku,
                    quantity: String(input.item.quantity),
                    unit_amount: toPayPalMoney(input.item.unitAmount),
                    category: "PHYSICAL_GOODS",
                    ...(input.item.tax
                      ? { tax: toBreakdownMoney(input.item.tax) }
                      : {}),
                  },
                ],
              }
            : {}),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
            user_action: "CONTINUE",
            shipping_preference: "NO_SHIPPING",
          },
        },
      },
    };
    return this.parsedWrite(
      "create",
      input.actionId,
      () =>
        this.request(
          "/v2/checkout/orders",
          "POST",
          body,
          "create",
          input.actionId,
        ),
      parseOrder,
    );
  }
  async getOrder(orderId: string): Promise<PayPalOrder> {
    const result = parseOrder(
      await this.request(`/v2/checkout/orders/${validId(orderId)}`, "GET"),
    );
    if (result.id !== orderId)
      throw new PayPalError(
        "Provider returned a different order.",
        "PROVIDER_ID_MISMATCH",
        null,
        false,
      );
    return result;
  }
  async authorize(input: {
    orderId: string;
    actionId: string;
  }): Promise<PayPalOrder> {
    return this.parsedWrite(
      "authorize",
      input.actionId,
      () =>
        this.request(
          `/v2/checkout/orders/${validId(input.orderId)}/authorize`,
          "POST",
          {},
          "authorize",
          input.actionId,
        ),
      parseOrder,
    );
  }
  async getAuthorization(
    authorizationId: string,
  ): Promise<PayPalAuthorization> {
    const raw = await this.request(
      `/v2/payments/authorizations/${validId(authorizationId)}`,
      "GET",
    );
    const data = z
      .object({
        id: IdSchema,
        status: z.enum(AUTHORIZATION_STATUSES),
        amount: ProviderMoneySchema,
        payee: z.object({ merchant_id: z.string().optional() }).optional(),
        expiration_time: z.string().optional(),
        supplementary_data: z
          .object({
            related_ids: z
              .object({ order_id: z.string().optional() })
              .optional(),
          })
          .optional(),
      })
      .parse(raw);
    if (data.id !== authorizationId)
      throw new PayPalError(
        "Provider returned a different authorization.",
        "PROVIDER_ID_MISMATCH",
        null,
        false,
      );
    return {
      id: data.id,
      status: data.status,
      amount: fromPayPalMoney(data.amount),
      payeeId: data.payee?.merchant_id ?? null,
      orderId: data.supplementary_data?.related_ids?.order_id ?? null,
      expiresAt: data.expiration_time ?? null,
    };
  }
  private parseCapture(raw: unknown): PayPalCapture {
    const data = z
      .object({
        id: IdSchema,
        status: z.enum(CAPTURE_STATUSES),
        amount: ProviderMoneySchema,
        final_capture: z.boolean(),
        supplementary_data: z
          .object({
            related_ids: z
              .object({
                order_id: z.string().optional(),
                authorization_id: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .parse(raw);
    return {
      id: data.id,
      status: data.status,
      amount: fromPayPalMoney(data.amount),
      finalCapture: data.final_capture,
      orderId: data.supplementary_data?.related_ids?.order_id ?? null,
      authorizationId:
        data.supplementary_data?.related_ids?.authorization_id ?? null,
    };
  }
  async capture(input: {
    authorizationId: string;
    amount: Money;
    actionId: string;
  }): Promise<PayPalCapture> {
    const body = {
      amount: toPayPalMoney(input.amount),
      final_capture: true,
      invoice_id: input.actionId,
    };
    return this.parsedWrite(
      "capture",
      input.actionId,
      () =>
        this.request(
          `/v2/payments/authorizations/${validId(input.authorizationId)}/capture`,
          "POST",
          body,
          "capture",
          input.actionId,
        ),
      (raw) => this.parseCapture(raw),
    );
  }
  async getCapture(captureId: string): Promise<PayPalCapture> {
    const result = this.parseCapture(
      await this.request(`/v2/payments/captures/${validId(captureId)}`, "GET"),
    );
    if (result.id !== captureId)
      throw new PayPalError(
        "Provider returned a different capture.",
        "PROVIDER_ID_MISMATCH",
        null,
        false,
      );
    return result;
  }
  async voidAuthorization(input: {
    authorizationId: string;
    actionId: string;
  }): Promise<void> {
    await this.request(
      `/v2/payments/authorizations/${validId(input.authorizationId)}/void`,
      "POST",
      undefined,
      "void",
      input.actionId,
    );
    // A 204 acknowledgement is not an invented VOIDED snapshot. Retrieve separately.
  }
  async getCheckpoint(input: {
    orderId: string;
    authorizationId: string;
  }): Promise<ProviderCheckpoint> {
    const [order, authorization] = await Promise.all([
      this.getOrder(input.orderId),
      this.getAuthorization(input.authorizationId),
    ]);
    if (!order.amount || !order.customId || !order.payeeId)
      throw new PayPalError(
        "Provider order is missing payment binding evidence.",
        "PROVIDER_EVIDENCE_INCOMPLETE",
        null,
        false,
      );
    const linked =
      order.authorizationIds.includes(authorization.id) &&
      (!authorization.orderId || authorization.orderId === order.id) &&
      (!authorization.payeeId || authorization.payeeId === order.payeeId);
    return {
      environment: "sandbox",
      caseId: order.customId,
      orderId: order.id,
      authorizationId: authorization.id,
      payeeId: order.payeeId,
      authorizationStatus: authorization.status,
      orderAmount: order.amount,
      authorizedAmount: authorization.amount,
      orderAuthorizationLinked: linked,
      observedAt: new Date(this.clock()).toISOString(),
      expiresAt: authorization.expiresAt,
    };
  }
  async verifyWebhook(input: {
    rawBody: string;
    headers: Headers | Record<string, string | undefined>;
    webhookId: string;
  }): Promise<boolean> {
    if (!input.webhookId.trim() || Buffer.byteLength(input.rawBody) > 1_048_576)
      return false;
    const headers =
      input.headers instanceof Headers
        ? input.headers
        : new Headers(
            Object.entries(input.headers).filter(
              (entry): entry is [string, string] => entry[1] !== undefined,
            ),
          );
    const get = (name: string) => headers.get(name);
    const certUrl = get("paypal-cert-url");
    if (!certUrl) return false;
    try {
      const cert = new URL(certUrl);
      if (
        cert.protocol !== "https:" ||
        !["api.sandbox.paypal.com", "api-m.sandbox.paypal.com"].includes(
          cert.hostname,
        ) ||
        !cert.pathname.startsWith("/v1/notifications/certs/") ||
        cert.username ||
        cert.password
      )
        return false;
      const event = JSON.parse(input.rawBody) as unknown;
      if (
        !z
          .object({ id: z.string().min(1), event_type: z.string().min(1) })
          .safeParse(event).success
      )
        return false;
      const transmissionId = get("paypal-transmission-id"),
        transmissionTime = get("paypal-transmission-time"),
        transmissionSig = get("paypal-transmission-sig"),
        authAlgo = get("paypal-auth-algo");
      if (!transmissionId || !transmissionTime || !transmissionSig || !authAlgo)
        return false;
      // Embed the original event JSON bytes unchanged; reserializing may invalidate verification.
      const token = await this.accessToken();
      const prefix = JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        transmission_sig: transmissionSig,
        auth_algo: authAlgo,
        cert_url: certUrl,
        webhook_id: input.webhookId,
      });
      const body = `${prefix.slice(0, -1)},"webhook_event":${input.rawBody}}`;
      const result = await this.network(
        "/v1/notifications/verify-webhook-signature",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body,
        },
        false,
        null,
      );
      return z
        .object({ verification_status: z.literal("SUCCESS") })
        .safeParse(result).success;
    } catch (error) {
      if (error instanceof PayPalError) throw error;
      return false;
    }
  }
}
