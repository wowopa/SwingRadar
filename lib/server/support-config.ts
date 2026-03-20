const DEFAULT_PRESET_AMOUNTS = [5000, 10000, 30000];
const DEFAULT_BANK_NAME = "토스뱅크";
const DEFAULT_SUPPORT_TITLE = "SWING-RADAR 운영 후원";

export type SupportTier = {
  amount: number;
  label: string;
  description: string;
  deepLink: string;
};

export type SupportConfig = {
  enabled: boolean;
  bankName: string;
  accountNumber: string | null;
  accountHolder: string | null;
  supportTitle: string;
  tiers: SupportTier[];
};

function parsePresetAmounts(value: string | undefined) {
  const parsed = (value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.round(item));

  const unique = parsed.length ? Array.from(new Set(parsed)).sort((left, right) => left - right) : DEFAULT_PRESET_AMOUNTS;
  return unique.slice(0, 3);
}

function buildTossDeepLink(bankName: string, accountNumber: string, amount: number) {
  const params = new URLSearchParams({
    amount: String(amount),
    bank: bankName,
    accountNo: accountNumber
  });

  return `supertoss://send?${params.toString()}`;
}

const TIER_COPY = [
  { label: "가볍게 응원", description: "커피 한 잔처럼 가볍게 운영을 응원하는 후원입니다." },
  { label: "든든하게 응원", description: "데이터 갱신과 서버 운영을 조금 더 안정적으로 돕는 후원입니다." },
  { label: "깊게 응원", description: "기능 개선과 장기 운영에 힘을 보태는 후원입니다." }
] as const;

export function getSupportConfig(): SupportConfig {
  const bankName = process.env.SWING_RADAR_SUPPORT_TOSS_BANK_NAME?.trim() || DEFAULT_BANK_NAME;
  const accountNumber = process.env.SWING_RADAR_SUPPORT_TOSS_ACCOUNT_NO?.trim() || null;
  const accountHolder = process.env.SWING_RADAR_SUPPORT_TOSS_ACCOUNT_HOLDER?.trim() || null;
  const supportTitle = process.env.SWING_RADAR_SUPPORT_ORDER_NAME?.trim() || DEFAULT_SUPPORT_TITLE;
  const presetAmounts = parsePresetAmounts(process.env.SWING_RADAR_SUPPORT_PRESET_AMOUNTS);

  const tiers =
    accountNumber == null
      ? []
      : presetAmounts.map((amount, index) => ({
          amount,
          label: TIER_COPY[index]?.label ?? `후원 ${index + 1}`,
          description: TIER_COPY[index]?.description ?? "SWING-RADAR 운영에 보탬이 되는 1회성 후원입니다.",
          deepLink: buildTossDeepLink(bankName, accountNumber, amount)
        }));

  return {
    enabled: accountNumber != null,
    bankName,
    accountNumber,
    accountHolder,
    supportTitle,
    tiers
  };
}
