import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div className="err-bd">
      <i className="ti ti-shield-lock err-bd-ic" />
      <span className="err-bd-msg">غير مصرح لك بالوصول إلى هذه الصفحة</span>
      <Link className="err-bd-btn" to="/">العودة إلى لوحة التحكم</Link>
    </div>
  );
}