// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalPublicOrderPage.tsx — صفحة الطلب العام (بدون حساب بوابة)
// ════════════════════════════════════════════════════════════════════════════
// نقطة بيع عامة: أي زائر يحمل الرابط يصفّح الكتالوج، يبني سلة، يرسل بياناته
// (الاسم/الهاتف/العنوان) ويُقبل الطلب. لا يوجد تسجيل دخول ولا شريط تنقّل —
// ترويسة بسيطة تحمل اسم المؤسسة من /portal/info ثم كتالوج + سلة.
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { portalApi, type PortalCompany } from '@/lib/api/portal/portal';
import PortalOrdersPage from './PortalOrdersPage';
import { PortalError } from './portalUtils';

export default function PortalPublicOrderPage() {
  const { slug } = useParams<{ slug: string }>();

  const companyQuery = useQuery({
    queryKey: ['portal', slug, 'info'],
    queryFn: () => portalApi.company(),
  });

  if (companyQuery.isLoading) {
    return (
      <div className="portal-public">
        <div className="portal-public-body">
          <div className="portal-public-logo">…</div>
          <div className="portal-public-name">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
    return (
      <div className="portal-public">
        <div className="portal-public-body">
          <PortalError message="تعذر تحميل بيانات المؤسسة" />
        </div>
      </div>
    );
  }

  const company: PortalCompany | null = companyQuery.data;

  return (
    <div className="portal-public">
      <header className="portal-public-hd">
        <div className="portal-public-body">
          <div className="portal-public-row">
            <div className="portal-public-id">
              {company?.avatar ? (
                <img className="portal-public-logo" src={company.avatar} alt={company?.name ?? ''} />
              ) : (
                <div className="portal-public-logo portal-public-logo--ic"><i className="ti ti-store" /></div>
              )}
              <div>
                <div className="portal-public-name">{company?.name ?? 'اطلب سلعة'}</div>
                <div className="portal-public-sub">اطلب سلعك مباشرة — سعر الكتالوج ونفس الفواتير</div>
              </div>
            </div>
            <div className="portal-public-nav">
              {slug && (
                <Link className="portal-public-login" to={`/portal/${slug}/track`}>
                  <i className="ti ti-truck-delivery" /> تتبع طلبك
                </Link>
              )}
              {slug && (
                <Link className="portal-public-login" to={`/portal/${slug}/login`}>
                  <i className="ti ti-login" /> تسجيل الدخول
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="portal-public-body">
        <PortalOrdersPage mode="public" />
      </main>

      <footer className="portal-public-ft">
        <div className="portal-public-body">
          طلباتك تُستلم مباشرة من المؤسسة — يُرسل لك رقم الطلب فور قبوله
        </div>
      </footer>
    </div>
  );
}
