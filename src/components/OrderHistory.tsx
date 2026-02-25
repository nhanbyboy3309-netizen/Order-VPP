import React, { useState, useEffect } from 'react';
import { User, Order } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { ClipboardList, ChevronRight } from 'lucide-react';

interface OrderHistoryProps {
  user: User;
}

export default function OrderHistory({ user }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/orders?user_id=${user.id}`);
        if (res.ok) setOrders(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user.id]);

  if (loading) return <div className="p-12 text-center">Đang tải lịch sử...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Lịch sử đơn hàng</h2>
        <p className="text-gray-500 mt-1">Xem lại các đơn hàng đã gửi của bạn</p>
      </header>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Bạn chưa có đơn hàng nào.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {orders.map(order => (
              <div key={order.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Đơn hàng #{order.id}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.order_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500">Tổng cộng</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      order.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {order.status === 'pending' ? 'Chờ duyệt' : order.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
