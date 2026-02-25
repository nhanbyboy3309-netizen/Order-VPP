import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Plus, Save, Trash2, Calendar, DollarSign, Package, Building2, Users, Edit2, X, ClipboardList, BarChart3, PieChart as PieChartIcon, TrendingUp, ShoppingCart, AlertTriangle, CheckSquare } from 'lucide-react';
import { Item, Department, AppSettings, User, Order } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Cell, Pie 
} from 'recharts';

export default function AdminDashboard() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  
  const activeTab = (tab || 'reports') as 'items' | 'departments' | 'settings' | 'reports' | 'users' | 'orders' | 'inventory';
  
  const setActiveTab = (newTab: string) => {
    navigate(`/admin/${newTab}`);
  };

  const [items, setItems] = useState<Item[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ order_start: '', order_end: '' });
  const [reportData, setReportData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [deptReportData, setDeptReportData] = useState<any[]>([]);
  const [procurementData, setProcurementData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'departments') {
      // Fetch users too when in departments tab for sync
      fetch('/api/users')
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch users'))
        .then(setUsers)
        .catch(err => console.error("Error fetching users:", err));
    }
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'items') {
        const res = await fetch('/api/items');
        if (res.ok) setItems(await res.json());
      } else if (activeTab === 'departments') {
        const res = await fetch('/api/departments');
        if (res.ok) setDepartments(await res.json());
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/settings');
        if (res.ok) setSettings(await res.json());
      } else if (activeTab === 'reports') {
        const [summary, monthly, depts] = await Promise.all([
          fetch('/api/reports/summary').then(res => res.json()),
          fetch('/api/reports/monthly').then(res => res.json()),
          fetch('/api/reports/department').then(res => res.json())
        ]);
        setReportData(summary);
        setMonthlyData(monthly);
        setDeptReportData(depts);
      } else if (activeTab === 'inventory') {
        const res = await fetch('/api/reports/procurement');
        if (res.ok) setProcurementData(await res.json());
      } else if (activeTab === 'users') {
        const [usersRes, deptsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/departments')
        ]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (deptsRes.ok) setDepartments(await deptsRes.json());
      } else if (activeTab === 'orders') {
        const res = await fetch('/api/orders');
        if (res.ok) setOrders(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo VPP");
    XLSX.writeFile(wb, `Bao_cao_VPP_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const updateDepartment = async (id: number, name: string, budget: number, email: string) => {
    const res = await fetch(`/api/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, budget, email }),
    });
    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      let errorMessage = 'Có lỗi xảy ra khi cập nhật phòng ban';
      if (contentType && contentType.includes("application/json")) {
        const err = await res.json();
        errorMessage = err.error || errorMessage;
      }
      alert(errorMessage);
    }
    fetchData();
  };

  const saveDepartment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      budget: parseFloat(formData.get('budget') as string) || 0,
      email: formData.get('email') as string,
    };

    const url = editingDept?.id ? `/api/departments/${editingDept.id}` : '/api/departments';
    const method = editingDept?.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setIsDeptModalOpen(false);
        setEditingDept(null);
        fetchData();
      } else {
        const contentType = res.headers.get("content-type");
        let errorMessage = 'Có lỗi xảy ra khi lưu phòng ban';
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        }
        alert(errorMessage);
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ');
    }
  };

  const updateSettings = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    alert('Đã lưu cấu hình');
  };

  const saveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const priceStr = formData.get('price') as string;
    const price = parseFloat(priceStr);

    if (isNaN(price)) {
      alert('Giá sản phẩm phải là số');
      return;
    }

    const data = {
      name: formData.get('name'),
      unit: formData.get('unit'),
      price: price,
      category: formData.get('category'),
      image_url: formData.get('image_url'),
      stock: parseInt(formData.get('stock') as string) || 0,
      min_stock: parseInt(formData.get('min_stock') as string) || 0,
    };

    const url = editingItem?.id ? `/api/items/${editingItem.id}` : '/api/items';
    const method = editingItem?.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setIsItemModalOpen(false);
        setEditingItem(null);
        fetchData();
      } else {
        const contentType = res.headers.get("content-type");
        let errorMessage = 'Có lỗi xảy ra khi lưu sản phẩm';
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        }
        alert(errorMessage);
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ');
    }
  };

  const deleteItem = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const updateOrderStatus = async (id: number, status: 'approved' | 'rejected') => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchData();
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
        setOrderDetails(null);
      }
    }
  };

  const viewOrderDetails = async (order: Order) => {
    const res = await fetch(`/api/orders/${order.id}`);
    if (res.ok) {
      setOrderDetails(await res.json());
      setSelectedOrder(order);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Quản trị hệ thống</h2>
        <div className="flex bg-white rounded-xl p-1 border border-black/5 shadow-sm overflow-x-auto">
          {(['reports', 'orders', 'items', 'inventory', 'departments', 'users', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === t ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {t === 'reports' ? 'Tổng quan' : t === 'orders' ? 'Duyệt đơn' : t === 'items' ? 'Danh mục VPP' : t === 'inventory' ? 'Kho & Mua sắm' : t === 'departments' ? 'Phòng ban' : t === 'users' ? 'Nhân viên' : 'Cấu hình'}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-medium text-gray-500">Tổng chi tiêu</h4>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(reportData.reduce((acc, curr) => acc + curr.total_value, 0))}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <Package className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-medium text-gray-500">Số lượng mặt hàng</h4>
              </div>
              <p className="text-2xl font-bold text-gray-900">{reportData.length}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-medium text-gray-500">Phòng ban đặt hàng</h4>
              </div>
              <p className="text-2xl font-bold text-gray-900">{deptReportData.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <h4 className="text-sm font-bold uppercase text-gray-500 mb-6">Chi tiêu theo tháng</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `${val/1000000}M`} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="total_amount" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <h4 className="text-sm font-bold uppercase text-gray-500 mb-6">Chi tiêu theo phòng ban</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptReportData}
                      dataKey="total_amount"
                      nameKey="department_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {deptReportData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h4 className="text-sm font-bold uppercase text-gray-500">Báo cáo chi tiết mặt hàng</h4>
              <button onClick={exportToExcel} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                <Download className="w-4 h-4" /> Xuất Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Tên mặt hàng</th>
                    <th className="px-6 py-4">Đơn vị</th>
                    <th className="px-6 py-4 text-right">Số lượng</th>
                    <th className="px-6 py-4 text-right">Giá TB</th>
                    <th className="px-6 py-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{row.name}</td>
                      <td className="px-6 py-4 text-gray-500">{row.unit}</td>
                      <td className="px-6 py-4 text-right font-mono">{row.total_quantity}</td>
                      <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(row.avg_price)}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600">{formatCurrency(row.total_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'inventory' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Quản lý Kho & Kế hoạch mua sắm</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-100">
                <AlertTriangle className="w-3 h-3" /> Cần mua: {procurementData.filter(p => p.needed_quantity > 0).length} mặt hàng
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Mặt hàng</th>
                    <th className="px-6 py-4 text-right">Tồn kho</th>
                    <th className="px-6 py-4 text-right">Định mức tối thiểu</th>
                    <th className="px-6 py-4 text-right">Nhu cầu TB (3th)</th>
                    <th className="px-6 py-4 text-right">Số lượng cần mua</th>
                    <th className="px-6 py-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {procurementData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-[10px] text-gray-400">{row.unit}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <span className={row.stock < row.min_stock ? 'text-red-600 font-bold' : 'text-gray-900'}>
                          {row.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 font-mono">{row.min_stock}</td>
                      <td className="px-6 py-4 text-right text-gray-500 font-mono">{row.avg_monthly_usage.toFixed(1)}</td>
                      <td className="px-6 py-4 text-right">
                        {row.needed_quantity > 0 ? (
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold">
                            +{Math.ceil(row.needed_quantity)}
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-medium">Đủ hàng</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.stock < row.min_stock ? (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Dưới định mức
                          </span>
                        ) : row.stock < row.avg_monthly_usage ? (
                          <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                            <TrendingUp className="w-3 h-3" /> Sắp hết
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                            <CheckSquare className="w-3 h-3" /> An toàn
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'orders' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Duyệt đơn hàng phòng ban</h3>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-black/5">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Ngày đặt</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Phòng ban</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Người đặt</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Tổng tiền</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Trạng thái</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-500">{formatDate(order.order_date)}</td>
                    <td className="p-4 text-sm font-medium text-gray-900">{order.department_name}</td>
                    <td className="p-4 text-sm text-gray-500">{order.user_email}</td>
                    <td className="p-4 text-sm font-bold text-indigo-600">{formatCurrency(order.total_amount)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        order.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {order.status === 'approved' ? 'Đã duyệt' : order.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => viewOrderDetails(order)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                        >
                          Chi tiết
                        </button>
                        {order.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'approved')}
                              className="text-emerald-600 hover:text-emerald-800"
                            >
                              Duyệt
                            </button>
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'rejected')}
                              className="text-red-500 hover:text-red-700"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 italic">Chưa có đơn hàng nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && orderDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-black/5 flex justify-between items-center">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng #{selectedOrder.id}</h4>
                <p className="text-xs text-gray-500">{selectedOrder.department_name} - {formatDate(selectedOrder.order_date)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="py-2 text-xs font-bold uppercase text-gray-500">Sản phẩm</th>
                    <th className="py-2 text-xs font-bold uppercase text-gray-500 text-center">SL</th>
                    <th className="py-2 text-xs font-bold uppercase text-gray-500 text-right">Đơn giá</th>
                    <th className="py-2 text-xs font-bold uppercase text-gray-500 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {orderDetails.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 text-sm">
                        <div className="font-medium text-gray-900">{item.item_name || item.custom_name}</div>
                        <div className="text-xs text-gray-500">{item.item_unit || 'Đơn vị'}</div>
                      </td>
                      <td className="py-3 text-sm text-center font-bold">{item.quantity}</td>
                      <td className="py-3 text-sm text-right">{formatCurrency(item.price)}</td>
                      <td className="py-3 text-sm text-right font-bold">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black/5">
                    <td colSpan={3} className="py-4 text-right font-bold text-gray-900">Tổng cộng:</td>
                    <td className="py-4 text-right font-bold text-indigo-600 text-lg">{formatCurrency(selectedOrder.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {selectedOrder.status === 'pending' && (
              <div className="p-6 bg-gray-50 border-t border-black/5 flex gap-4">
                <button 
                  onClick={() => updateOrderStatus(selectedOrder.id, 'approved')}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  Duyệt đơn hàng
                </button>
                <button 
                  onClick={() => updateOrderStatus(selectedOrder.id, 'rejected')}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  Từ chối
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {activeTab === 'items' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Danh mục Văn phòng phẩm</h3>
            <button 
              onClick={() => {
                setEditingItem({});
                setIsItemModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm mới
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
             <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-black/5">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Ảnh</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Tên</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Đơn vị</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Giá</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Phân loại</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-black/5" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="p-4 text-sm text-gray-500">{item.unit}</td>
                    <td className="p-4 text-sm text-gray-900">{formatCurrency(item.price)}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setIsItemModalOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-black/5 flex justify-between items-center">
              <h4 className="text-lg font-bold text-gray-900">
                {editingItem?.id ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h4>
              <button onClick={() => setIsItemModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tên sản phẩm</label>
                <input name="name" defaultValue={editingItem?.name} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Đơn vị</label>
                  <input name="unit" defaultValue={editingItem?.unit} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Giá (VNĐ)</label>
                  <input name="price" type="number" defaultValue={editingItem?.price} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phân loại</label>
                <input name="category" defaultValue={editingItem?.category} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">URL Hình ảnh</label>
                <input name="image_url" defaultValue={editingItem?.image_url} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tồn kho hiện tại</label>
                  <input name="stock" type="number" defaultValue={editingItem?.stock || 0} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Định mức tối thiểu</label>
                  <input name="min_stock" type="number" defaultValue={editingItem?.min_stock || 0} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                Lưu sản phẩm
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {activeTab === 'departments' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Quản lý Phòng ban & Định mức</h3>
            <button 
              onClick={() => {
                setEditingDept({});
                setIsDeptModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm phòng ban
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map(dept => (
              <div key={dept.id} className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-indigo-600" />
                    <h4 className="font-bold text-gray-900">{dept.name}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingDept(dept);
                        setIsDeptModalOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm(`Xóa phòng ban ${dept.name}?`)) {
                          const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' });
                          if (!res.ok) {
                            const err = await res.json();
                            alert(err.error);
                          } else {
                            fetchData();
                          }
                        }
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email phòng ban</label>
                    <input
                      type="email"
                      defaultValue={dept.email}
                      onBlur={(e) => updateDepartment(dept.id, dept.name, dept.budget, e.target.value)}
                      placeholder="email@company.com"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Định mức ngân sách (VNĐ)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        defaultValue={dept.budget}
                        onBlur={(e) => updateDepartment(dept.id, dept.name, parseFloat(e.target.value), dept.email)}
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-500 flex items-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-black/5">
                  <h5 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
                    <Users className="w-3 h-3" /> Nhân viên thuộc phòng ({users.filter(u => u.department_id === dept.id).length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {users.filter(u => u.department_id === dept.id).map(u => (
                      <span key={u.id} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-medium">
                        {u.email.split('@')[0]}
                      </span>
                    ))}
                    {users.filter(u => u.department_id === dept.id).length === 0 && (
                      <span className="text-xs italic text-gray-400">Chưa có nhân viên</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-black/5 flex justify-between items-center">
              <h4 className="text-lg font-bold text-gray-900">
                {editingDept?.id ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'}
              </h4>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveDepartment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tên phòng ban</label>
                <input name="name" defaultValue={editingDept?.name} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Định mức ngân sách (VNĐ)</label>
                <input name="budget" type="number" defaultValue={editingDept?.budget} required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email phòng ban</label>
                <input name="email" type="email" defaultValue={editingDept?.email} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                Lưu phòng ban
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Quản lý nhân viên & Phân quyền</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-black/5">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Email</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Phòng ban</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Vai trò</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-900">{u.email}</td>
                      <td className="p-4 text-sm text-gray-500">{u.department_name}</td>
                      <td className="p-4 text-sm">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={async () => {
                            if (confirm('Xóa nhân viên này?')) {
                              await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
                              fetchData();
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm h-fit space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Thêm nhân viên mới
              </h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  email: formData.get('email'),
                  department_id: formData.get('department_id'),
                  role: formData.get('role')
                };
                const res = await fetch('/api/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (res.ok) {
                  (e.target as HTMLFormElement).reset();
                  fetchData();
                } else {
                  const err = await res.json();
                  alert(err.error);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                  <input name="email" type="email" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phòng ban</label>
                  <select name="department_id" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Vai trò</label>
                  <select name="role" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
                  Thêm nhân viên
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl">
          <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">Thời gian đặt hàng</h3>
            </div>
            <p className="text-sm text-gray-500">Giới hạn khoảng thời gian các phòng ban có thể gửi đơn hàng.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu</label>
                <input
                  type="datetime-local"
                  value={settings.order_start.slice(0, 16)}
                  onChange={e => setSettings({ ...settings, order_start: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
                <input
                  type="datetime-local"
                  value={settings.order_end.slice(0, 16)}
                  onChange={e => setSettings({ ...settings, order_end: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={updateSettings}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              <Save className="w-5 h-5" /> Lưu cấu hình
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
