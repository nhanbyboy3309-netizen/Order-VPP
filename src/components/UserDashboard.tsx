import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, ShoppingCart, AlertCircle, CheckCircle2, Package } from 'lucide-react';
import { User, Item, AppSettings } from '../types';
import { formatCurrency, cn } from '../lib/utils';

interface UserDashboardProps {
  user: User;
}

interface CartItem {
  item_id: number | null;
  name: string;
  quantity: number;
  price: number;
  unit: string;
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom item form
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, settingsRes] = await Promise.all([
          fetch('/api/items'),
          fetch('/api/settings')
        ]);
        if (itemsRes.ok) setItems(await itemsRes.json());
        if (settingsRes.ok) setSettings(await settingsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addToCart = (item: Item) => {
    const existing = cart.find(i => i.item_id === item.id);
    if (existing) {
      setCart(cart.map(i => i.item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { item_id: item.id, name: item.name, quantity: 1, price: item.price, unit: item.unit }]);
    }
  };

  const addCustomItem = () => {
    if (!customName) return;
    setCart([...cart, { item_id: null, name: customName, quantity: customQty, price: customPrice, unit: 'Cái' }]);
    setCustomName('');
    setCustomQty(1);
    setCustomPrice(0);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isWithinTime = settings ? new Date() >= new Date(settings.order_start) && new Date() <= new Date(settings.order_end) : false;

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setMessage(null);

    const period = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          department_id: user.department_id,
          items: cart,
          total_amount: totalAmount,
          period
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Đã gửi đơn hàng thành công!' });
        setCart([]);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Gửi đơn hàng thất bại' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12">Đang tải...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Đặt Văn phòng phẩm</h2>
          <p className="text-gray-500 mt-1">
            Định mức: <span className="font-semibold text-gray-900">{formatCurrency(user.department_budget)}</span>
          </p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider",
          isWithinTime ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        )}>
          {isWithinTime ? "Đang trong thời gian đặt hàng" : "Hết thời gian đặt hàng"}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Item List */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <div className="p-4 border-b border-black/5 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">Danh mục VPP</h3>
            </div>
            <div className="divide-y divide-black/5">
              {items.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-black/5" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.unit} • {formatCurrency(item.price)}</p>
                    </div>
                  </div>
                  <button
                    disabled={!isWithinTime}
                    onClick={() => addToCart(item)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Custom Item */}
          <section className="bg-white rounded-2xl border border-black/5 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Thêm mục ngoài danh mục</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Tên văn phòng phẩm..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <input
                type="number"
                min="1"
                value={customQty}
                onChange={e => setCustomQty(parseInt(e.target.value))}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                disabled={!isWithinTime || !customName}
                onClick={addCustomItem}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-30"
              >
                Thêm
              </button>
            </div>
          </section>
        </div>

        {/* Cart */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-black/5 p-6 sticky top-8">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Đơn hàng của bạn</h3>
            </div>

            <div className="space-y-4 mb-6 max-h-[400px] overflow-auto pr-2">
              {cart.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Chưa có sản phẩm nào</p>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} {item.unit} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                      <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-black/5 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Tổng cộng</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>

              {message && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg text-sm",
                  message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                )}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                disabled={cart.length === 0 || !isWithinTime || submitting}
                onClick={handleSubmit}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                {submitting ? 'Đang gửi...' : 'Gửi đơn hàng'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
