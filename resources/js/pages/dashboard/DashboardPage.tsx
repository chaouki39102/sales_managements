import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  Package,
  TrendingUp,
  DollarSign,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Stats {
  total_parties: number;
  total_documents: number;
  total_products: number;
  total_revenue: number;
  pending_amount: number;
}

interface RecentDocument {
  id: number;
  document_number: string;
  document_date: string;
  party: { name: string };
  total_ttc: number;
  document_status: { name: string };
}

export default function DashboardPage() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data;
    },
  });

  const { data: recentDocs } = useQuery<RecentDocument[]>({
    queryKey: ['recent-documents'],
    queryFn: async () => {
      const res = await api.get('/commercial-documents?per_page=5');
      return res.data.data;
    },
  });

  const statCards = [
    {
      name: 'العملاء',
      value: stats?.total_parties || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'الفواتير',
      value: stats?.total_documents || 0,
      icon: FileText,
      color: 'bg-emerald-500',
    },
    {
      name: 'المنتجات',
      value: stats?.total_products || 0,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      name: 'الإيرادات',
      value: formatCurrency(stats?.total_revenue || 0),
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/dashboard/documents/create?type=sale"
          className="bg-emerald-500 hover:bg-emerald-600 text-white p-6 rounded-2xl transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-white/20 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold">فاتورة جديدة</p>
            <p className="text-sm text-emerald-100">إنشاء فاتورة بيع</p>
          </div>
        </Link>

        <Link
          to="/dashboard/parties/create"
          className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-2xl transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-white/20 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold">عميل جديد</p>
            <p className="text-sm text-blue-100">إضافة عميل</p>
          </div>
        </Link>

        <Link
          to="/dashboard/products/create"
          className="bg-purple-500 hover:bg-purple-600 text-white p-6 rounded-2xl transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-white/20 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold">منتج جديد</p>
            <p className="text-sm text-purple-100">إضافة منتج</p>
          </div>
        </Link>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              آخر الفواتير
            </h2>
            <Link
              to="/dashboard/documents"
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              عرض الكل
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  номер
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentDocs?.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {doc.document_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {doc.document_date}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {doc.party?.name}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {formatCurrency(doc.total_ttc)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        doc.document_status?.name === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : doc.document_status?.name === 'draft'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {doc.document_status?.name}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}