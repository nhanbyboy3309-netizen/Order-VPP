import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("vpp_order.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    budget REAL DEFAULT 0,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'user', -- 'admin' or 'user'
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT,
    price REAL DEFAULT 0,
    category TEXT,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    department_id INTEGER,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    period TEXT, -- e.g., '2024-Q1'
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    item_id INTEGER, -- NULL if custom item
    custom_name TEXT,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration: Add stock columns to items if they don't exist
const itemTableInfo = db.prepare("PRAGMA table_info(items)").all() as any[];
if (!itemTableInfo.some(col => col.name === 'stock')) {
  try {
    db.exec("ALTER TABLE items ADD COLUMN stock INTEGER DEFAULT 0");
    db.exec("ALTER TABLE items ADD COLUMN min_stock INTEGER DEFAULT 0");
  } catch (e) {
    console.error("Migration failed for stock columns", e);
  }
}

// Migration: Add email and budget columns to departments if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(departments)").all() as any[];
const hasEmail = tableInfo.some(col => col.name === 'email');
const hasBudget = tableInfo.some(col => col.name === 'budget');

if (!hasEmail) {
  try {
    db.exec("ALTER TABLE departments ADD COLUMN email TEXT");
  } catch (e) {
    console.error("Migration failed for email", e);
  }
}

if (!hasBudget) {
  try {
    db.exec("ALTER TABLE departments ADD COLUMN budget REAL DEFAULT 0");
  } catch (e) {
    console.error("Migration failed for budget", e);
  }
}

// Seed initial data if empty
const deptCount = db.prepare("SELECT COUNT(*) as count FROM departments").get() as { count: number };
if (deptCount.count === 0) {
  db.prepare("INSERT INTO departments (name, budget, email) VALUES (?, ?, ?)").run("Phòng Hành chính", 5000000, "admin@company.com");
  db.prepare("INSERT INTO departments (name, budget, email) VALUES (?, ?, ?)").run("Phòng Kỹ thuật", 3000000, "tech@company.com");
  db.prepare("INSERT INTO users (email, role, department_id) VALUES (?, ?, ?)").run("admin@company.com", "admin", 1);
  db.prepare("INSERT INTO items (name, unit, price, category, image_url) VALUES (?, ?, ?, ?, ?)").run("Giấy A4 Double A", "Ram", 85000, "Giấy", "https://picsum.photos/seed/paper/100/100");
  db.prepare("INSERT INTO items (name, unit, price, category, image_url) VALUES (?, ?, ?, ?, ?)").run("Bút bi Thiên Long", "Cây", 5000, "Bút", "https://picsum.photos/seed/pen/100/100");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("order_start", "2024-01-01T00:00:00");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("order_end", "2026-12-31T23:59:59");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- API Routes ---

  // Auth
  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    const user = db.prepare(`
      SELECT u.*, d.name as department_name, d.budget as department_budget 
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id 
      WHERE u.email = ?
    `).get(email) as any;

    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Email không có quyền truy cập." });
    }
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all() as any[];
    const result = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    res.json(result);
  });

  app.post("/api/settings", (req, res) => {
    const { order_start, order_end } = req.body;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'order_start'").run(order_start);
    db.prepare("UPDATE settings SET value = ? WHERE key = 'order_end'").run(order_end);
    res.json({ success: true });
  });

  // Items
  app.get("/api/items", (req, res) => {
    const items = db.prepare("SELECT * FROM items WHERE is_active = 1").all();
    res.json(items);
  });

  app.post("/api/items", (req, res) => {
    const { name, unit, price, category, image_url } = req.body;
    db.prepare("INSERT INTO items (name, unit, price, category, image_url) VALUES (?, ?, ?, ?, ?)").run(name, unit, price, category, image_url);
    res.json({ success: true });
  });

  app.put("/api/items/:id", (req, res) => {
    const { id } = req.params;
    const { name, unit, price, category, image_url, is_active } = req.body;
    db.prepare("UPDATE items SET name = ?, unit = ?, price = ?, category = ?, image_url = ?, is_active = ? WHERE id = ?")
      .run(name, unit, price, category, image_url, is_active ?? 1, id);
    res.json({ success: true });
  });

  app.delete("/api/items/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE items SET is_active = 0 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.delete("/api/departments/:id", (req, res) => {
    const { id } = req.params;
    // Check if users exist in department
    const users = db.prepare("SELECT COUNT(*) as count FROM users WHERE department_id = ?").get(id) as { count: number };
    if (users.count > 0) {
      return res.status(400).json({ error: "Không thể xóa phòng ban đang có nhân viên." });
    }
    db.prepare("DELETE FROM departments WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Users management
  app.get("/api/users", (req, res) => {
    const users = db.prepare(`
      SELECT u.*, d.name as department_name 
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id
    `).all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { email, role, department_id } = req.body;
    try {
      db.prepare("INSERT INTO users (email, role, department_id) VALUES (?, ?, ?)").run(email, role || 'user', department_id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Email đã tồn tại hoặc dữ liệu không hợp lệ" });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Departments & Budgets
  app.get("/api/departments", (req, res) => {
    const depts = db.prepare("SELECT * FROM departments").all();
    res.json(depts);
  });

  app.post("/api/departments", (req, res) => {
    const { name, budget, email } = req.body;
    console.log("Adding department:", { name, budget, email });
    try {
      db.prepare("INSERT INTO departments (name, budget, email) VALUES (?, ?, ?)").run(name, budget || 0, email || '');
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error adding department:", err);
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Tên phòng ban đã tồn tại" });
      } else {
        res.status(500).json({ error: "Lỗi máy chủ khi thêm phòng ban: " + err.message });
      }
    }
  });

  app.put("/api/departments/:id", (req, res) => {
    const { id } = req.params;
    const { name, budget, email } = req.body;
    try {
      db.prepare("UPDATE departments SET name = ?, budget = ?, email = ? WHERE id = ?").run(name, budget, email, id);
      res.json({ success: true });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Tên phòng ban đã tồn tại" });
      } else {
        res.status(500).json({ error: "Lỗi máy chủ khi cập nhật phòng ban" });
      }
    }
  });

  // Orders
  app.get("/api/orders", (req, res) => {
    const { department_id, user_id } = req.query;
    let query = `
      SELECT o.*, d.name as department_name, u.email as user_email 
      FROM orders o 
      JOIN departments d ON o.department_id = d.id 
      JOIN users u ON o.user_id = u.id
    `;
    const params: any[] = [];
    if (department_id) {
      query += " WHERE o.department_id = ?";
      params.push(department_id);
    } else if (user_id) {
      query += " WHERE o.user_id = ?";
      params.push(user_id);
    }
    query += " ORDER BY o.order_date DESC";
    const orders = db.prepare(query).all(...params);
    res.json(orders);
  });

  app.get("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    const items = db.prepare(`
      SELECT oi.*, i.name as item_name, i.unit as item_unit 
      FROM order_items oi 
      LEFT JOIN items i ON oi.item_id = i.id 
      WHERE oi.order_id = ?
    `).all(id);
    res.json({ ...order, items });
  });

  app.post("/api/orders", (req, res) => {
    const { user_id, department_id, items, total_amount, period } = req.body;
    
    // Check time window
    const settings = db.prepare("SELECT * FROM settings").all() as any[];
    const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    const now = new Date();
    if (now < new Date(config.order_start) || now > new Date(config.order_end)) {
      return res.status(403).json({ error: "Hiện không trong thời gian đặt hàng." });
    }

    // Check budget
    const dept = db.prepare("SELECT budget FROM departments WHERE id = ?").get(department_id) as any;
    const spent = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE department_id = ? AND period = ?").get(department_id, period) as any;
    const currentSpent = spent.total || 0;
    if (currentSpent + total_amount > dept.budget) {
      return res.status(403).json({ error: "Vượt quá định mức ngân sách của phòng ban." });
    }

    const transaction = db.transaction(() => {
      const info = db.prepare("INSERT INTO orders (user_id, department_id, total_amount, period) VALUES (?, ?, ?, ?)").run(user_id, department_id, total_amount, period);
      const orderId = info.lastInsertRowid;
      
      const insertItem = db.prepare("INSERT INTO order_items (order_id, item_id, custom_name, quantity, price) VALUES (?, ?, ?, ?, ?)");
      for (const item of items) {
        insertItem.run(orderId, item.item_id || null, item.custom_name || null, item.quantity, item.price);
      }
      return orderId;
    });

    try {
      const orderId = transaction();
      res.json({ success: true, orderId });
    } catch (err) {
      res.status(500).json({ error: "Lỗi khi tạo đơn hàng." });
    }
  });

  app.put("/api/orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ." });
    }
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  // Report Data
  app.get("/api/reports/summary", (req, res) => {
    try {
      const data = db.prepare(`
        SELECT 
          COALESCE(i.name, oi.custom_name) as name,
          COALESCE(i.unit, 'Cái') as unit,
          SUM(oi.quantity) as total_quantity,
          AVG(oi.price) as avg_price,
          SUM(oi.quantity * oi.price) as total_value
        FROM order_items oi
        LEFT JOIN items i ON oi.item_id = i.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'approved'
        GROUP BY name, unit
      `).all();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Lỗi khi tải báo cáo" });
    }
  });

  app.get("/api/reports/monthly", (req, res) => {
    try {
      const data = db.prepare(`
        SELECT 
          strftime('%Y-%m', order_date) as month,
          SUM(total_amount) as total_amount
        FROM orders
        WHERE status = 'approved'
        GROUP BY month
        ORDER BY month ASC
      `).all();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Lỗi khi tải báo cáo tháng" });
    }
  });

  app.get("/api/reports/department", (req, res) => {
    try {
      const data = db.prepare(`
        SELECT 
          d.name as department_name,
          SUM(o.total_amount) as total_amount
        FROM orders o
        JOIN departments d ON o.department_id = d.id
        WHERE o.status = 'approved'
        GROUP BY d.name
      `).all();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Lỗi khi tải báo cáo phòng ban" });
    }
  });

  app.get("/api/reports/procurement", (req, res) => {
    try {
      // Calculate demand as average monthly usage over last 3 months
      const data = db.prepare(`
        SELECT 
          i.id,
          i.name,
          i.unit,
          i.stock,
          i.min_stock,
          COALESCE(usage.avg_monthly_usage, 0) as avg_monthly_usage,
          CASE 
            WHEN i.stock < i.min_stock THEN (i.min_stock - i.stock) + COALESCE(usage.avg_monthly_usage, 0)
            ELSE CASE WHEN i.stock < COALESCE(usage.avg_monthly_usage, 0) THEN COALESCE(usage.avg_monthly_usage, 0) - i.stock ELSE 0 END
          END as needed_quantity
        FROM items i
        LEFT JOIN (
          SELECT 
            item_id,
            SUM(quantity) / 3.0 as avg_monthly_usage
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.status = 'approved' 
            AND o.order_date >= date('now', '-3 months')
          GROUP BY item_id
        ) usage ON i.id = usage.item_id
        WHERE i.is_active = 1
      `).all();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Lỗi khi tải báo cáo mua sắm" });
    }
  });

  // Catch-all for unmatched API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ: " + (err.message || "Unknown error") });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
