export interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
  department_id: number;
  department_name: string;
  department_budget: number;
}

export interface Item {
  id: number;
  name: string;
  unit: string;
  price: number;
  category: string;
  image_url?: string;
  is_active: number;
  stock: number;
  min_stock: number;
}

export interface Order {
  id: number;
  user_id: number;
  department_id: number;
  order_date: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  period: string;
  department_name?: string;
  user_email?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_id: number | null;
  custom_name: string | null;
  quantity: number;
  price: number;
  item_name?: string;
  item_unit?: string;
}

export interface Department {
  id: number;
  name: string;
  budget: number;
  email: string;
}

export interface AppSettings {
  order_start: string;
  order_end: string;
}
