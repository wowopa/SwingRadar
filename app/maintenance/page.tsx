import { getMaintenanceMode } from "@/lib/server/maintenance-mode";

export const dynamic = "force-dynamic";

function formatEta(etaMinutes: number | null) {
  if (!etaMinutes || etaMinutes < 1) {
    return "예상 시간을 계산하는 중입니다.";
  }

  if (etaMinutes < 60) {
    return `약 ${etaMinutes}분 뒤에 다시 열릴 예정입니다.`;
  }

  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;

  if (minutes === 0) {
    return `약 ${hours}시간 뒤에 다시 열릴 예정입니다.`;
  }

  return `약 ${hours}시간 ${minutes}분 뒤에 다시 열릴 예정입니다.`;
}

export default async function MaintenancePage() {
  const maintenance = await getMaintenanceMode();

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-[32px] border border-black/10 bg-white/95 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-12">
        <div className="mb-8 inline-flex rounded-full border border-amber-300 bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
          데이터 갱신 중
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          잠시만 기다려 주세요
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          {maintenance.message}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-black/8 bg-slate-50 px-5 py-4">
            <p className="text-sm font-medium text-slate-500">예상 재개 시간</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatEta(maintenance.etaMinutes)}</p>
          </div>
          <div className="rounded-3xl border border-black/8 bg-slate-50 px-5 py-4">
            <p className="text-sm font-medium text-slate-500">안내</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              배치가 끝나면 최신 스냅샷으로 자동 전환됩니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
