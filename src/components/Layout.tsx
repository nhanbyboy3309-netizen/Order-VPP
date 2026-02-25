import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Package, ClipboardList, Settings, Building2, BarChart3, Users, CheckSquare } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <>{children}</>;

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    return location.pathname === path;
  };

  const navItemClass = (path: string) => `
    w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all
    ${isActive(path) 
      ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
  `;

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-black/5 flex flex-col">
        <div className="p-6 border-bottom border-black/5">
          <h1 className="text-xl font-bold tracking-tight text-indigo-600 flex items-center gap-2">
            <Package className="w-6 h-6" />
            VPP Order
          </h1>
          <p className="text-xs text-gray-500 mt-1">Hệ thống đặt VPP nội bộ</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {user.role === 'admin' ? (
            <>
              <button onClick={() => navigate('/admin')} className={navItemClass('/admin')}>
                <BarChart3 className="w-4 h-4" /> Tổng quan
              </button>
              <button onClick={() => navigate('/admin/orders')} className={navItemClass('/admin/orders')}>
                <CheckSquare className="w-4 h-4" /> Duyệt đơn
              </button>
              <button onClick={() => navigate('/admin/items')} className={navItemClass('/admin/items')}>
                <ClipboardList className="w-4 h-4" /> Danh mục VPP
              </button>
              <button onClick={() => navigate('/admin/inventory')} className={navItemClass('/admin/inventory')}>
                <Package className="w-4 h-4" /> Kho & Mua sắm
              </button>
              <button onClick={() => navigate('/admin/departments')} className={navItemClass('/admin/departments')}>
                <Building2 className="w-4 h-4" /> Phòng ban
              </button>
              <button onClick={() => navigate('/admin/users')} className={navItemClass('/admin/users')}>
                <Users className="w-4 h-4" /> Nhân viên
              </button>
              <button onClick={() => navigate('/admin/settings')} className={navItemClass('/admin/settings')}>
                <Settings className="w-4 h-4" /> Cấu hình
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/')} className={navItemClass('/')}>
                <Package className="w-4 h-4" /> Đặt hàng
              </button>
              <button onClick={() => navigate('/history')} className={navItemClass('/history')}>
                <ClipboardList className="w-4 h-4" /> Lịch sử đơn hàng
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-black/5">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
              <p className="text-xs text-gray-500 truncate">{user.department_name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
