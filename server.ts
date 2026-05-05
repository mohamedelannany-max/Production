import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import fs from "fs";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

async function startServer() {
  console.log("Starting server initialization...");
  try {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
    });

    const db = new Database("pms.db");
    db.pragma("journal_mode = WAL");

  // Initialize DB
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS formulas (
      id TEXT PRIMARY KEY,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS config (
      id TEXT PRIMARY KEY,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS consumption (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId TEXT,
      batchId TEXT,
      materialId TEXT,
      materialName TEXT,
      targetWeight REAL,
      actualWeight REAL,
      variance REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default users if empty
  const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    db.prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)").run('1', 'admin', 'admin123', 'مدير النظام', 'admin');
    db.prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)").run('2', '2', '2', 'مستخدم التشغيل', 'operator');
    db.prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)").run('3', 'qc', 'qc', 'إدارة الجودة', 'quality');
  }

  // Seed default config if empty
  const configCount = db.prepare("SELECT count(*) as count FROM config").get() as { count: number };
  if (configCount.count === 0) {
    const defaultConfig = {
      co: 'شركة الدقهلية للدواجن',
      fa: 'مصنع اعلاف دماص',
      de: 'إدارة الإنتاج',
      fc: 'PROD-P02-F05',
      fv: 'Ver.1',
      gsId: '1VLf0w7MRNhoZnEE-ip2YJYKYm5Kwi0DoReaWvH2GqZY',
      gsKey: 'AIzaSyAGtNpNM_Bh0BDH9Jrn56OqNlshKtT7hOA',
      gsUrl: 'https://script.google.com/macros/s/AKfycbzO6neXwNbgtHuHcOphcmDjBhKb8hug-6XsNaXV63g6p1Z1oSBxwbkhLmWKH8tpou7zMg/exec',
      autoSave: true
    };
    db.prepare("INSERT INTO config (id, data) VALUES (?, ?)").run('default', JSON.stringify(defaultConfig));
  } else {
    // Force update URL if it's the old one to assist the user
    const currentConfigData = db.prepare("SELECT data FROM config WHERE id = 'default'").get() as any;
    if (currentConfigData) {
      const currentConfig = JSON.parse(currentConfigData.data);
      const oldKeys = [
        "AKfycbxm14VPoLZD4t1g-u4LoinB3klTFpRyk3SeX-cSfMQ1OWryJctq26J8zTnupIOIKbB7",
        "AKfycbyktPK3ghKwykNNBs5SXyGpEEW06hkaBAFf71ygx5MMFLhwsBiLuHuRfcXbSBcb963ZfA"
      ];
      if (currentConfig.gsUrl && oldKeys.some(k => currentConfig.gsUrl.includes(k))) {
        currentConfig.gsUrl = "https://script.google.com/macros/s/AKfycbzO6neXwNbgtHuHcOphcmDjBhKb8hug-6XsNaXV63g6p1Z1oSBxwbkhLmWKH8tpou7zMg/exec";
        currentConfig.gsId = "1VLf0w7MRNhoZnEE-ip2YJYKYm5Kwi0DoReaWvH2GqZY";
        db.prepare("UPDATE config SET data = ? WHERE id = 'default'").run(JSON.stringify(currentConfig));
      }
    }
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/data", (req, res) => {
    console.log("GET /api/data requested");
    try {
      const users = db.prepare("SELECT * FROM users").all();
      const materials = db.prepare("SELECT * FROM materials").all().map((r: any) => JSON.parse(r.data));
      const formulas = db.prepare("SELECT * FROM formulas").all().map((r: any) => JSON.parse(r.data));
      const orders = db.prepare("SELECT * FROM orders").all().map((r: any) => JSON.parse(r.data));
      const inventory = db.prepare("SELECT * FROM inventory").all().map((r: any) => JSON.parse(r.data));
      const consumption = db.prepare("SELECT * FROM consumption").all();
      const configData = db.prepare("SELECT * FROM config WHERE id = 'default'").get() as any;
      const config = configData ? JSON.parse(configData.data) : null;

      res.json({ users, materials, formulas, orders, inventory, consumption, config });
    } catch (err: any) {
      console.error("API Data Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  
  app.post("/api/start-batch", (req, res) => {
    const { orderId, batchId } = req.body;
    try {
      db.transaction(() => {
        const orderData = db.prepare("SELECT data FROM orders WHERE id = ?").get(orderId) as any;
        if (!orderData) throw new Error("Order not found");
        const order = JSON.parse(orderData.data);
        
        const batch = order.batches.find((b: any) => b.id === batchId);
        if (!batch) throw new Error("Batch not found");
        
        batch.status = 'running';
        batch.startTime = new Date().toISOString();
        
        db.prepare("INSERT OR REPLACE INTO orders (id, data) VALUES (?, ?)").run(orderId, JSON.stringify(order));
        
        // Broadcast update
        const allOrders = db.prepare("SELECT * FROM orders").all().map((r: any) => JSON.parse(r.data));
        io.emit('remote_update', { type: 'orders', data: allOrders });
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/finish-batch", (req, res) => {
    const { orderId, batchId, actualWeights, operator, notes, actualWeight, role } = req.body;
    
    // Security Check
    if (role !== 'admin' && role !== 'quality') {
      return res.status(403).json({ error: "عذراً، يجب أن تكون مديراً أو في قسم الجودة لإنهاء الباتشة" });
    }
    
    try {
      db.transaction(() => {
        // 1. Get original order data
        const orderData = db.prepare("SELECT data FROM orders WHERE id = ?").get(orderId) as any;
        if (!orderData) throw new Error("Order not found");
        const order = JSON.parse(orderData.data);
        
        // 2. Find and update the batch
        const batchIndex = order.batches.findIndex((b: any) => b.id === batchId);
        if (batchIndex === -1) throw new Error("Batch not found");
        
        const batch = order.batches[batchIndex];
        batch.status = 'completed';
        batch.endTime = new Date().toISOString();
        batch.actualWeights = actualWeights;
        batch.operator = operator;
        batch.notes = notes;
        
        // Use provided actualWeight or calculate from actualWeights
        const calculatedTotal = Object.values(actualWeights as Record<string, number>).reduce((sum, v) => sum + v, 0);
        batch.actualWeight = actualWeight !== undefined ? actualWeight : calculatedTotal;
        
        // 3. Deduct from inventory & log consumption
        // We need the formula items to know target weights
        const formulaData = db.prepare("SELECT data FROM formulas WHERE id = ?").get(order.fmId) as any;
        const formula = JSON.parse(formulaData.data);
        
        for (const item of formula.items) {
          const target = item.w; // theoretical per batch
          const actual = actualWeights[item.mi] || 0;
          const variance = target > 0 ? ((actual - target) / target) * 100 : 0;
          
          // Log consumption
          db.prepare(`
            INSERT INTO consumption (orderId, batchId, materialId, materialName, targetWeight, actualWeight, variance)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(orderId, batchId, item.mi, item.mn, target, actual, variance);
          
          // Update inventory
          const invData = db.prepare("SELECT data FROM inventory WHERE id = ?").get(item.mi) as any;
          if (invData) {
            const inv = JSON.parse(invData.data);
            const currentStock = parseFloat(inv.stock || '0');
            inv.stock = (currentStock - actual).toFixed(3);
            db.prepare("INSERT OR REPLACE INTO inventory (id, data) VALUES (?, ?)").run(item.mi, JSON.stringify(inv));
          }
        }
        
        // 4. Check if all batches are completed to close the order
        const totalExpectedBatches = Math.ceil((order.qty * 1000) / order.bw);
        const completedBatches = order.batches.filter((b: any) => b.status === 'completed').length;
        
        if (completedBatches >= totalExpectedBatches) {
          order.status = 'completed';
          order.completedAt = new Date().toISOString();
        }

        // 5. Update order data
        db.prepare("INSERT OR REPLACE INTO orders (id, data) VALUES (?, ?)").run(orderId, JSON.stringify(order));
        
        // 6. Sync to Google Sheets if configured
        const configData = db.prepare("SELECT * FROM config WHERE id = 'default'").get() as any;
        if (configData) {
          const config = JSON.parse(configData.data);
          if (config.gsUrl) {
            const syncPayload = {
              action: 'log_consumption',
              orderId,
              batchId,
              runNumber: order.rn,
              formulaName: order.fmName,
              operator,
              timestamp: new Date().toISOString(),
              items: formula.items.map((item: any) => ({
                materialName: item.mn,
                targetWeight: item.w,
                actualWeight: actualWeights[item.mi] || 0,
                variance: item.w > 0 ? (((actualWeights[item.mi] || 0) - item.w) / item.w) * 100 : 0
              }))
            };

            console.log(`Syncing to Google Sheets URL: ${config.gsUrl}`);
            fetch(config.gsUrl, {
              method: 'POST',
              body: JSON.stringify(syncPayload),
              headers: { 'Content-Type': 'application/json' },
              redirect: 'follow'
            })
            .then(async r => {
              const text = await r.text();
              console.log(`Google Sheets Sync Response [${r.status}]: ${text}`);
            })
            .catch(err => console.error("Google Sheets Sync Connection Error:", err.message));
          }
        }

        // Summary for notification
        const batchTotalTarget = formula.items.reduce((sum: number, i: any) => sum + i.w, 0);
        const batchTotalActual = Object.values(actualWeights).reduce((sum: any, v: any) => sum + v, 0) as number;
        const batchVariance = batchTotalTarget > 0 ? ((batchTotalActual - batchTotalTarget) / batchTotalTarget) * 100 : 0;

        io.emit('batch_finished', {
          orderId,
          batchId,
          rn: order.rn,
          formulaName: order.fmName,
          totalVariance: batchVariance,
          operator,
          isOrderFinished: order.status === 'completed'
        });
        
        // Also emit remote_update for orders and inventory
        const allOrders = db.prepare("SELECT * FROM orders").all().map((r: any) => JSON.parse(r.data));
        const allInventory = db.prepare("SELECT * FROM inventory").all().map((r: any) => JSON.parse(r.data));
        io.emit('remote_update', { type: 'orders', data: allOrders });
        io.emit('remote_update', { type: 'inventory', data: allInventory });
      })();
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Finish batch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/test-gs", async (req, res) => {
    const { url, payload } = req.body;
    try {
      console.log(`Testing Google Sheets sync to: ${url}`);
      // @ts-ignore
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload || { action: 'test', timestamp: new Date().toISOString() }),
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow'
      });
      
      const text = await response.text();
      console.log(`Test Sync Response [${response.status}]: ${text.substring(0, 500)}`);
      
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        res.json({ success: true, message: text });
      } else {
        let errorMsg = `جوجل أعاد خطأ ${response.status}`;
        if (text.includes("<!DOCTYPE html>")) {
          errorMsg = "❌ خطأ 401: الرابط يتطلب تسجيل دخول. يرجى التأكد من اختيار Anyone في إعدادات النشر (Deploy).";
        }
        res.status(response.status).json({ error: errorMsg });
      }
    } catch (err: any) {
      console.error("Test GS Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Background Full Sync Relay Logic
  let syncTimeout: NodeJS.Timeout | null = null;
  const triggerAutoSync = async () => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
      try {
        const configData = db.prepare("SELECT * FROM config WHERE id = 'default'").get() as any;
        if (!configData) return;
        const config = JSON.parse(configData.data);
        if (!config.gsUrl) return;

        console.log("🔄 Background Sync: Relaying latest changes to Google Sheets...");
        
        const users = db.prepare("SELECT * FROM users").all();
        const materials = db.prepare("SELECT * FROM materials").all().map((r: any) => JSON.parse(r.data));
        const formulas = db.prepare("SELECT * FROM formulas").all().map((r: any) => JSON.parse(r.data));
        const orders = db.prepare("SELECT * FROM orders").all().map((r: any) => JSON.parse(r.data));
        const inventory = db.prepare("SELECT * FROM inventory").all().map((r: any) => JSON.parse(r.data));
        const consumption = db.prepare("SELECT * FROM consumption").all();
        const dbData = { users, materials, formulas, orders, inventory, consumption, config };

        await fetch(config.gsUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'full_sync', data: dbData }),
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow'
        });
        console.log(`✅ Background Sync: Successfully relayed data.`);
      } catch (err: any) {
        console.error("❌ Background Sync Error:", err.message);
      }
    }, 10000); // 10 second debounce
  };

  app.post("/api/sync", (req, res) => {
    const { type, data } = req.body;
    try {
      if (type === 'users') {
        const stmt = db.prepare("INSERT OR REPLACE INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)");
        const ids = data.map((u: any) => u.id);
        db.transaction(() => {
          if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            db.prepare(`DELETE FROM users WHERE id NOT IN (${placeholders})`).run(...ids);
          } else {
            db.prepare("DELETE FROM users").run();
          }
          for (const u of data) {
            stmt.run(u.id, u.username, u.password, u.name, u.role);
          }
        })();
      } else if (type === 'config') {
        db.prepare("INSERT OR REPLACE INTO config (id, data) VALUES (?, ?)").run('default', JSON.stringify(data));
      } else {
        const table = type; // materials, formulas, orders, inventory
        const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
        const ids = data.map((item: any) => item.id);
        db.transaction(() => {
          if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            db.prepare(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`).run(...ids);
          } else {
            db.prepare(`DELETE FROM ${table}`).run();
          }
          for (const item of data) {
            stmt.run(item.id, JSON.stringify(item));
          }
        })();
      }
      
      io.emit('remote_update', { type, data });
      triggerAutoSync(); // Trigger the relay to Google Sheets
      res.json({ success: true });
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Dist path not found, falling back to Vite middleware (dev mode?)");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Low-frequency safety sync
    setInterval(triggerAutoSync, 1000 * 60 * 10); 
  });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
