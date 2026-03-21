import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title="운영 콘솔"
        description="시스템 운영 상태를 확인하고, 사이트 팝업 공지와 예외 편입 설정을 관리하는 페이지입니다."
      />
      <AdminDashboard />
    </main>
  );
}
