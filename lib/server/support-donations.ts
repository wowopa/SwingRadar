import { randomUUID } from "crypto";

import { ApiError } from "@/lib/server/api-error";
import { getPostgresPool } from "@/lib/server/postgres";

const DEFAULT_PRESET_AMOUNTS = [5000, 10000, 30000, 50000];
const DEFAULT_ORDER_NAME = "SWING-RADAR 운영 후원";

export type SupportConfig = {
  enabled: boolean;
  clientKey: string | null;
  paymentMethodVariantKey: string | null;
  agreementVariantKey: string | null;
  presetAmounts: number[];
  minimumAmount: number;
  maximumAmount: number;
  orderName: string;
  isTestMode: boolean;
};

export type SupportDonationRecord = {
  orderId: string;
  amount: number;
  orderName: string;
  donorName: string | null;
  message: string | null;
  status: "pending" | "paid" | "failed";
  paymentKey: string | null;
  method: string | null;
  provider: string | null;
  receiptUrl: string | null;
  approvedAt: string | null;
  createdAt: string;
};

function parsePresetAmounts(value: string | undefined) {
  const parsed = (value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.round(item));

  return parsed.length ? Array.from(new Set(parsed)).sort((left, right) => left - right) : DEFAULT_PRESET_AMOUNTS;
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeAmount(rawAmount: unknown, config: SupportConfig) {
  const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new ApiError(400, "SUPPORT_AMOUNT_INVALID", "후원 금액을 다시 확인해주세요.");
  }

  if (amount < config.minimumAmount || amount > config.maximumAmount) {
    throw new ApiError(
      400,
      "SUPPORT_AMOUNT_OUT_OF_RANGE",
      `후원 금액은 ${config.minimumAmount.toLocaleString("ko-KR")}원부터 ${config.maximumAmount.toLocaleString("ko-KR")}원 사이여야 합니다.`
    );
  }

  return amount;
}

export function getSupportConfig(): SupportConfig {
  const clientKey = process.env.SWING_RADAR_SUPPORT_TOSS_CLIENT_KEY?.trim() || null;
  const secretKey = process.env.SWING_RADAR_SUPPORT_TOSS_SECRET_KEY?.trim() || null;
  const minimumAmount = Number(process.env.SWING_RADAR_SUPPORT_MIN_AMOUNT ?? 3000);
  const maximumAmount = Number(process.env.SWING_RADAR_SUPPORT_MAX_AMOUNT ?? 300000);
  const presetAmounts = parsePresetAmounts(process.env.SWING_RADAR_SUPPORT_PRESET_AMOUNTS).filter(
    (amount) => amount >= minimumAmount && amount <= maximumAmount
  );

  return {
    enabled: Boolean(clientKey && secretKey),
    clientKey,
    paymentMethodVariantKey: process.env.SWING_RADAR_SUPPORT_TOSS_PAYMENT_VARIANT_KEY?.trim() || null,
    agreementVariantKey: process.env.SWING_RADAR_SUPPORT_TOSS_AGREEMENT_VARIANT_KEY?.trim() || null,
    presetAmounts: presetAmounts.length ? presetAmounts : DEFAULT_PRESET_AMOUNTS,
    minimumAmount,
    maximumAmount,
    orderName: process.env.SWING_RADAR_SUPPORT_ORDER_NAME?.trim() || DEFAULT_ORDER_NAME,
    isTestMode: Boolean(clientKey?.startsWith("test_") || secretKey?.startsWith("test_"))
  };
}

async function ensureSupportDonationsTable() {
  const pool = getPostgresPool();
  await pool.query(`
    create table if not exists support_donations (
      order_id text primary key,
      amount integer not null,
      order_name text not null,
      donor_name text,
      message text,
      customer_key text not null,
      status text not null default 'pending',
      payment_key text unique,
      method text,
      provider text,
      receipt_url text,
      failure_code text,
      failure_message text,
      approved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create index if not exists support_donations_status_created_idx
    on support_donations (status, created_at desc)
  `);
}

function toDonationRecord(row: {
  order_id: string;
  amount: number;
  order_name: string;
  donor_name: string | null;
  message: string | null;
  status: "pending" | "paid" | "failed";
  payment_key: string | null;
  method: string | null;
  provider: string | null;
  receipt_url: string | null;
  approved_at: string | null;
  created_at: string;
}): SupportDonationRecord {
  return {
    orderId: row.order_id,
    amount: Number(row.amount),
    orderName: row.order_name,
    donorName: row.donor_name,
    message: row.message,
    status: row.status,
    paymentKey: row.payment_key,
    method: row.method,
    provider: row.provider,
    receiptUrl: row.receipt_url,
    approvedAt: row.approved_at,
    createdAt: row.created_at
  };
}

export async function createSupportDonationOrder(input: {
  amount: unknown;
  donorName?: unknown;
  message?: unknown;
}) {
  const config = getSupportConfig();
  if (!config.enabled) {
    throw new ApiError(503, "SUPPORT_NOT_CONFIGURED", "후원 결제 설정이 아직 준비되지 않았습니다.");
  }

  await ensureSupportDonationsTable();

  const amount = normalizeAmount(input.amount, config);
  const donorName = normalizeOptionalText(input.donorName, 50);
  const message = normalizeOptionalText(input.message, 200);
  const orderId = `support-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const customerKey = `support.${randomUUID()}`;

  const pool = getPostgresPool();
  await pool.query(
    `
      insert into support_donations (
        order_id,
        amount,
        order_name,
        donor_name,
        message,
        customer_key,
        status
      )
      values ($1, $2, $3, $4, $5, $6, 'pending')
    `,
    [orderId, amount, config.orderName, donorName, message, customerKey]
  );

  return {
    orderId,
    amount,
    orderName: config.orderName,
    customerKey
  };
}

export async function confirmSupportDonation(input: {
  orderId: string;
  paymentKey: string;
  amount: unknown;
}) {
  const config = getSupportConfig();
  if (!config.enabled) {
    throw new ApiError(503, "SUPPORT_NOT_CONFIGURED", "후원 결제 설정이 아직 준비되지 않았습니다.");
  }

  const orderId = input.orderId.trim();
  const paymentKey = input.paymentKey.trim();
  if (!orderId || !paymentKey) {
    throw new ApiError(400, "SUPPORT_CONFIRM_INVALID", "결제 확인 정보가 부족합니다.");
  }

  const amount = normalizeAmount(input.amount, config);
  await ensureSupportDonationsTable();

  const pool = getPostgresPool();
  const existingResult = await pool.query<{
    order_id: string;
    amount: number;
    order_name: string;
    donor_name: string | null;
    message: string | null;
    customer_key: string;
    status: "pending" | "paid" | "failed";
    payment_key: string | null;
    method: string | null;
    provider: string | null;
    receipt_url: string | null;
    approved_at: string | null;
    created_at: string;
  }>(
    `
      select
        order_id,
        amount,
        order_name,
        donor_name,
        message,
        customer_key,
        status,
        payment_key,
        method,
        provider,
        receipt_url,
        approved_at,
        created_at
      from support_donations
      where order_id = $1
      limit 1
    `,
    [orderId]
  );

  const existing = existingResult.rows[0];
  if (!existing) {
    throw new ApiError(404, "SUPPORT_ORDER_NOT_FOUND", "후원 주문을 찾을 수 없습니다.");
  }

  if (Number(existing.amount) !== amount) {
    throw new ApiError(400, "SUPPORT_AMOUNT_MISMATCH", "후원 금액이 주문 정보와 일치하지 않습니다.");
  }

  if (existing.status === "paid" && existing.payment_key === paymentKey) {
    return toDonationRecord(existing);
  }

  if (existing.status === "paid" && existing.payment_key && existing.payment_key !== paymentKey) {
    throw new ApiError(409, "SUPPORT_ALREADY_CONFIRMED", "이미 다른 결제 정보로 승인된 주문입니다.");
  }

  const authorization = Buffer.from(`${process.env.SWING_RADAR_SUPPORT_TOSS_SECRET_KEY}:`).toString("base64");
  const approvalResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount
    }),
    cache: "no-store"
  });

  const approvalPayload = (await approvalResponse.json().catch(() => null)) as
    | {
        method?: string;
        easyPay?: { provider?: string | null } | null;
        receipt?: { url?: string | null } | null;
        approvedAt?: string | null;
        code?: string;
        message?: string;
      }
    | null;

  if (!approvalResponse.ok) {
    await pool.query(
      `
        update support_donations
        set
          status = 'failed',
          payment_key = $2,
          failure_code = $3,
          failure_message = $4,
          updated_at = now()
        where order_id = $1
      `,
      [
        orderId,
        paymentKey,
        approvalPayload?.code ?? "TOSS_CONFIRM_FAILED",
        approvalPayload?.message ?? "후원 결제 승인에 실패했습니다."
      ]
    );

    throw new ApiError(
      approvalResponse.status >= 400 && approvalResponse.status < 500 ? 400 : 502,
      approvalPayload?.code ?? "TOSS_CONFIRM_FAILED",
      approvalPayload?.message ?? "후원 결제 승인에 실패했습니다."
    );
  }

  const method = approvalPayload?.method ?? null;
  const provider = approvalPayload?.easyPay?.provider ?? null;
  const receiptUrl = approvalPayload?.receipt?.url ?? null;
  const approvedAt = approvalPayload?.approvedAt ?? new Date().toISOString();

  const updatedResult = await pool.query<{
    order_id: string;
    amount: number;
    order_name: string;
    donor_name: string | null;
    message: string | null;
    status: "pending" | "paid" | "failed";
    payment_key: string | null;
    method: string | null;
    provider: string | null;
    receipt_url: string | null;
    approved_at: string | null;
    created_at: string;
  }>(
    `
      update support_donations
      set
        status = 'paid',
        payment_key = $2,
        method = $3,
        provider = $4,
        receipt_url = $5,
        approved_at = $6,
        failure_code = null,
        failure_message = null,
        updated_at = now()
      where order_id = $1
      returning
        order_id,
        amount,
        order_name,
        donor_name,
        message,
        status,
        payment_key,
        method,
        provider,
        receipt_url,
        approved_at,
        created_at
    `,
    [orderId, paymentKey, method, provider, receiptUrl, approvedAt]
  );

  return toDonationRecord(updatedResult.rows[0]);
}
