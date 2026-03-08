import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title="운영실"
        description="서비스 상태, 편집 초안 변경, 발행 이력, 롤백 작업을 한 화면에서 확인합니다."
      />
      <AdminDashboard />
    </main>
  );
}
