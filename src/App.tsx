/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  CheckSquare, 
  BarChart3, 
  Users as UsersIcon, 
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Search,
  Printer,
  ClipboardCopy,
  Trash2,
  Edit,
  Database,
  AlertTriangle,
  User as UserIcon,
  Box,
  Menu,
  X as CloseIcon,
  Sparkles,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLocalStorage } from './hooks/useStorage';
import { cn } from './lib/utils';
import { socket } from './lib/socket';
import { 
  User, 
  Material, 
  Formula, 
  Order, 
  AppConfig, 
  InventoryItem,
  MaterialType
} from './types';
import { 
  DEFAULT_USERS, 
  DEFAULT_CONFIG, 
  MATERIAL_TYPES 
} from './constants';

// Pages
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Formulas from './pages/Formulas';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import UsersPage from './pages/Users';
import Settings from './pages/Settings';
import Analyst from './pages/Analyst';
import Production from './pages/Production';
import Modal from './components/Modal';
import { printOrder } from './lib/print';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Wifi, WifiOff, Cloud, RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useLocalStorage<User | null>('pms_cu', null);
  const [page, setPage] = useState('dash');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [selectedProdOrderId, setSelectedProdOrderId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'syncing'>('connected');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [consumption, setConsumption] = useState<any[]>([]);

  // Auth Logic
  const [loginState, setLoginState] = useState({ username: '', password: '', error: '' });

  const [pendingSync, setPendingSync] = useLocalStorage<{type: string, data: any}[]>('pms_pending_sync', []);

  // Generic Sync Handler with Offline Support
  const syncData = async (type: string, data: any, isRetry = false) => {
    if (!isOnline && !isRetry) {
      console.log(`📡 Offline: Queuing ${type} for later sync`);
      setPendingSync(prev => [...(prev || []), { type, data }]);
      return false;
    }

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
      if (response.ok) return true;
      throw new Error('Server sync failed');
    } catch (err) {
      console.error(`Error syncing ${type} to server:`, err);
      
      // FALLBACK: Try direct Google Sheets sync if server is down and GS is configured
      if (config.gsUrl && !isRetry) {
        console.log(`📡 Server unreachable. Attempting direct sync to Google Sheets for ${type}...`);
        try {
          const gsRes = await fetch(config.gsUrl, {
            method: 'POST',
            body: JSON.stringify({ 
              action: 'full_sync', 
              data: { [type]: data, config } // Send mini-sync payload
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // GAS trick
            mode: 'no-cors' // Allow post to external domain
          });
          toast.info(`تم الحفظ في المتصفح والمزامنة مع جوجل شيت مباشرة`);
          return true;
        } catch (gsErr) {
          console.error("Direct GAS sync failed:", gsErr);
        }
      }

      if (!isRetry) {
        setPendingSync(prev => [...(prev || []), { type, data }]);
        toast.warn(`تم الحفظ محلياً فقط. الخادم غير متصل.`);
      }
      return false;
    }
  };

  // Flush Queue when back online or periodically if online
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const flush = async () => {
      if (isOnline && pendingSync && pendingSync.length > 0 && !isSyncing) {
        setIsSyncing(true);
        const queue = [...pendingSync];
        console.log(`📡 Attempting to flush ${queue.length} pending items...`);
        const successfulIndices: number[] = [];

        for (let i = 0; i < queue.length; i++) {
          const success = await syncData(queue[i].type, queue[i].data, true);
          if (success) successfulIndices.push(i);
        }

        setPendingSync(prev => (prev || []).filter((_, idx) => !successfulIndices.includes(idx)));
        setIsSyncing(false);
        if (successfulIndices.length > 0) {
          toast.success(`تمت مزامنة ${successfulIndices.length} عمليات معلقة`);
        }
      }
    };

    if (isOnline) {
      flush();
      interval = setInterval(flush, 30000); // Check every 30s as a fallback
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, pendingSync?.length]);

  // Wrapped Setters for UI
  const updateUsers = (data: User[]) => { setUsers(data); syncData('users', data); };
  const updateConfig = (data: AppConfig) => { setConfig(data); syncData('config', data); };
  const updateMaterials = (data: Material[]) => { setMaterials(data); syncData('materials', data); };
  const updateFormulas = (data: Formula[]) => { setFormulas(data); syncData('formulas', data); };
  const updateOrders = (data: Order[]) => { setOrders(data); syncData('orders', data); };
  const updateInventory = (data: InventoryItem[]) => { setInventory(data); syncData('inventory', data); };

  const handleStartBatch = async (orderId: string, batchId: string) => {
    const response = await fetch('/api/start-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, batchId })
    });
    if (!response.ok) throw new Error('Failed to start batch');
  };

  const handleFinishBatch = async (orderId: string, batchId: string, actualWeights: Record<string, number>, notes?: string, batchActualWeight?: number) => {
    const response = await fetch('/api/finish-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        batchId,
        actualWeights,
        notes,
        actualWeight: batchActualWeight,
        operator: user?.name || 'Operator',
        role: user?.role
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to finish batch');
    }
  };

  // Fetch Initial Data and Setup WebSockets
  useEffect(() => {
    // Try to load from cache first for zero-latency/offline start
    const cached = localStorage.getItem('pms_db_cache');
    if (cached) {
      try {
        const res = JSON.parse(cached);
        if (res.users?.length) setUsers(res.users);
        if (res.config) setConfig(res.config);
        if (res.materials) setMaterials(res.materials);
        if (res.formulas) setFormulas(res.formulas);
        if (res.orders) setOrders(res.orders);
        if (res.inventory) setInventory(res.inventory);
        if (res.consumption) setConsumption(res.consumption);
      } catch (e) {
        console.error("Cache parse error:", e);
      }
    }

    fetch('/api/data')
      .then(r => r.json())
      .then(res => {
        localStorage.setItem('pms_db_cache', JSON.stringify(res));
        if (res.users?.length) setUsers(res.users);
        if (res.config) setConfig(res.config);
        if (res.materials) setMaterials(res.materials);
        if (res.formulas) setFormulas(res.formulas);
        if (res.orders) setOrders(res.orders);
        if (res.inventory) setInventory(res.inventory);
        if (res.consumption) setConsumption(res.consumption);
      })
      .catch(err => console.error("Initial fetch error:", err));

    socket.on('remote_update', ({ type, data }) => {
      console.log(`📡 Remote update received for ${type}`);
      if (type === 'users') setUsers(data);
      if (type === 'config') setConfig(data);
      if (type === 'materials') setMaterials(data);
      if (type === 'formulas') setFormulas(data);
      if (type === 'orders') setOrders(data);
      if (type === 'inventory') setInventory(data);
    });

    socket.on('batch_finished', (data) => {
      if (user?.role === 'admin') {
        const isWarning = Math.abs(data.totalVariance) > 2;
        
        toast(
          <div className="text-right">
            <div className="font-black text-sm flex items-center justify-between">
              {data.isOrderFinished ? "🎉 تم اكتمال التشغيلة بالكامل!" : "✅ تم انتهاء باتش!"}
              {isWarning && <AlertTriangle className="w-4 h-4 text-red-500" />}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              أمر رقم: <span className="font-black">#{data.rn}</span> | {data.formulaName}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <span className="text-[9px] text-slate-400">المشغل: {data.operator}</span>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-lg",
                isWarning ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-100"
              )}>
                الانحراف: {data.totalVariance.toFixed(2)}%
              </span>
            </div>
          </div>,
          { 
            position: "top-left", 
            autoClose: data.isOrderFinished ? false : 8000,
            style: { borderRight: `4px solid ${isWarning ? '#ef4444' : '#10b981'}` }
          }
        );
      }
    });

    return () => {
      socket.off('remote_update');
      socket.off('batch_finished');
    };
  }, [user]);

  // Automated Stock Alert System
  useEffect(() => {
    const checkServer = async () => {
      try {
        const r = await fetch('/api/data', { 
          method: 'GET',
          cache: 'no-store'
        });
        if (r.ok) {
          setIsOnline(true);
          setServerStatus(isSyncing ? 'syncing' : 'connected');
          const data = await r.json();
          // Merge with local state
          if (data.users && data.users.length > 0) setUsers(data.users);
          if (data.materials && data.materials.length > 0) setMaterials(data.materials);
          if (data.formulas && data.formulas.length > 0) setFormulas(data.formulas);
          if (data.orders && data.orders.length > 0) setOrders(data.orders);
          if (data.inventory && data.inventory.length > 0) setInventory(data.inventory);
          if (data.consumption && data.consumption.length > 0) setConsumption(data.consumption);
          if (data.config) {
            setConfig(data.config);
            localStorage.setItem('pms_config', JSON.stringify(data.config));
          }
        } else {
          throw new Error("Server not ok");
        }
      } catch (err) {
        console.warn("Server unreachable, entering standalone mode");
        setIsOnline(false);
        setServerStatus('disconnected');
        
        // Load from storage
        const savedConfig = localStorage.getItem('pms_config');
        if (savedConfig) {
          const cfg = JSON.parse(savedConfig);
          setConfig(prev => ({ ...prev, ...cfg, autoSave: true }));
          
          // Optionally try direct GS fetch if local server is down
          if (cfg.gsUrl && materials.length === 0) {
            console.log("Empty local state, pulling from Google Sheets...");
            fetch(cfg.gsUrl)
              .then(r => r.json())
              .then(gsData => {
                if (gsData && !gsData.error) {
                  if (gsData.users) setUsers(gsData.users);
                  if (gsData.materials) setMaterials(gsData.materials);
                  if (gsData.formulas) setFormulas(gsData.formulas);
                  if (gsData.orders) setOrders(gsData.orders);
                  if (gsData.inventory) setInventory(gsData.inventory);
                  if (gsData.consumption) setConsumption(gsData.consumption);
                  toast.success("تم جلب البيانات من السحابة بنجاح");
                  setServerStatus('syncing'); // Special state for standalone cloud
                  setTimeout(() => setServerStatus('connected'), 2000);
                  setIsOnline(true); // Treat as online if GS is reachable
                }
              })
              .catch(e => console.error("Standalone GS fetch failed:", e));
          }
        }
      }
    };
    
    const interval = setInterval(checkServer, 15000);
    checkServer();
    return () => clearInterval(interval);
  }, [isSyncing]);

  // Persist current data to localStorage as safety
  useEffect(() => {
    if (materials.length > 0) localStorage.setItem('pms_materials', JSON.stringify(materials));
    if (formulas.length > 0) localStorage.setItem('pms_formulas', JSON.stringify(formulas));
    if (orders.length > 0) localStorage.setItem('pms_orders', JSON.stringify(orders));
    if (inventory.length > 0) localStorage.setItem('pms_inventory', JSON.stringify(inventory));
    if (consumption.length > 0) localStorage.setItem('pms_consumption', JSON.stringify(consumption));
    if (users.length > 0) localStorage.setItem('pms_users', JSON.stringify(users));
  }, [materials, formulas, orders, inventory, consumption, users]);

  // Try to load basic records from storage on first mount
  useEffect(() => {
    const m = localStorage.getItem('pms_materials');
    const f = localStorage.getItem('pms_formulas');
    const o = localStorage.getItem('pms_orders');
    const i = localStorage.getItem('pms_inventory');
    const c = localStorage.getItem('pms_consumption');
    const u = localStorage.getItem('pms_users');
    const cfg = localStorage.getItem('pms_config');

    if (m) setMaterials(JSON.parse(m));
    if (f) setFormulas(JSON.parse(f));
    if (o) setOrders(JSON.parse(o));
    if (i) setInventory(JSON.parse(i));
    if (c) setConsumption(JSON.parse(c));
    if (u) setUsers(JSON.parse(u));
    if (cfg) setConfig(JSON.parse(cfg));
  }, []);

  const handleFullSync = async () => {
    const isStandalone = !isOnline;
    if (isStandalone && !config.gsUrl) {
      toast.error("لا يمكن المزامنة السحابية بدون رابط Google Script");
      return;
    }
    
    setIsSyncing(true);
    try {
      const dbData = { users, materials, formulas, orders, inventory, consumption, config };
      
      if (isStandalone) {
        // Direct to GS
        console.log("📡 Attempting direct full sync to Google Sheets...");
        await fetch(config.gsUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'full_sync', data: dbData }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          mode: 'no-cors'
        });
        toast.success("تم إرسال البيانات للسحابة (Direct Mode)");
      } else {
        // Via server relay
        await fetch('/api/test-gs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: config.gsUrl, 
            payload: { action: 'full_sync', data: dbData } 
          })
        });
        toast.success("تمت المزامنة السحابية عبر الخادم بنجاح");
      }
      
      setLastSync(new Date().toLocaleTimeString('ar-EG'));
    } catch (err) {
      console.error("Full Sync Error:", err);
      toast.error("فشلت المزامنة السحابية");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Try to find in state first, then fallback to defaults if state is empty
    const pool = users.length > 0 ? users : DEFAULT_USERS;
    const found = pool.find(u => u.username === loginState.username && u.password === loginState.password);
    
    if (found) {
      const now = new Date().toISOString();
      const updatedUser = { ...found, lastLogin: now };
      
      // If the user exists in the database pool, update the state and sync
      if (users.length > 0 && users.some(u => u.id === found.id)) {
        updateUsers(users.map(u => u.id === found.id ? updatedUser : u));
      }
      
      setUser(updatedUser);
      setPage(found.role === 'admin' ? 'dash' : 'prod');
      setLoginState({ username: '', password: '', error: '' });
    } else {
      setLoginState(s => ({ ...s, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPage('dash');
  };

  const currentOrderForPrint = (order: Order) => {
    const fm = formulas.find(f => f.id === order.fmId);
    if (!fm) return;
    printOrder(order, fm, config);
  };

  const handleBackup = () => {
    const data = {
      users,
      config,
      materials,
      formulas,
      orders,
      inventory,
      backupDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pms_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleRestore = (data: any) => {
    if (data.users) updateUsers(data.users);
    if (data.config) updateConfig(data.config);
    if (data.materials) updateMaterials(data.materials);
    if (data.formulas) updateFormulas(data.formulas);
    if (data.orders) updateOrders(data.orders);
    if (data.inventory) updateInventory(data.inventory);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2444] via-[#1e40af] to-[#3b82f6] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-blue rounded-3xl flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl shadow-brand-blue/20">
              D
            </div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">الدقهلية للدواجن</h1>
            <p className="text-sm text-slate-500 font-bold mt-1">وحدة الإنتاج الذكي (Smart Production)</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 text-right italic">اسم المستخدم (Username)</label>
              <input 
                type="text" 
                className="input-field text-right font-black" 
                placeholder="2"
                value={loginState.username}
                onChange={e => setLoginState(s => ({ ...s, username: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 text-right italic">كلمة المرور (Password)</label>
              <input 
                type="password" 
                className="input-field text-right font-black" 
                placeholder="••••••"
                value={loginState.password}
                onChange={e => setLoginState(s => ({ ...s, password: e.target.value }))}
              />
            </div>

            {loginState.error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100"
              >
                {loginState.error}
              </motion.div>
            )}

            <button type="submit" className="w-full btn-primary justify-center py-4 text-lg bg-brand-blue shadow-xl shadow-brand-blue/20">
              دخول النظام
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
             <p className="text-[9px] text-slate-300 font-black italic">جميع الحقوق محفوظة - الدقهلية للدواجن ٢٠٢٤</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'prod', label: 'تشغيل المصنع', icon: Play },
    { id: 'dash', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'mats', label: 'الخامات', icon: Package },
    { id: 'fms', label: 'التركيبات', icon: FileText },
    { id: 'ords', label: 'أوامر الإنتاج', icon: CheckSquare, badge: orders.filter(o => o.status === 'run').length },
    { id: 'inv', label: 'رصيد المخزون', icon: Database, badge: materials.filter(m => {
      const inv = inventory.find(i => i.id === m.id);
      return m.minStock > 0 && (Number(inv?.stock) || 0) <= m.minStock;
    }).length },
    { id: 'reps', label: 'التقارير', icon: BarChart3 },
    { id: 'ai', label: 'المحلل الذكي', icon: Sparkles },
    { id: 'usrs', label: 'المستخدمين', icon: UsersIcon, adminOnly: true },
    { id: 'sets', label: 'الإعدادات', icon: SettingsIcon, adminOnly: true },
  ];

  return (
    <>
    <div className="flex min-h-screen bg-slate-50 relative rtl" dir="rtl">
      <ToastContainer rtl position="top-left" />
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 h-screen bg-slate-900 text-white flex flex-col z-50 shrink-0 transition-all duration-300 w-64",
        sidebarOpen ? "right-0" : "-right-64 lg:right-0"
      )}>
        <div className="p-6 border-b border-white/10 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-brand-blue rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
            D
          </div>
          <div className="text-[10px] font-black text-brand-blue-light tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10 italic">smart production</div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg absolute right-4 top-4">
            <CloseIcon className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto font-bold">
          {navItems.map((item) => {
            if (item.adminOnly && user.role !== 'admin') return null;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all",
                  active ? "bg-white/15 text-white shadow-inner" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5", active ? "text-brand-blue-light" : "text-white/40")} />
                  {item.label}
                </div>
                {item.badge && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          
          <div className="pt-4 mt-4 border-t border-white/5">
            <button 
              onClick={() => setIsSummaryOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest text-white/40 hover:bg-brand-blue/10 hover:text-brand-blue-light transition-all font-black"
            >
              <Sparkles className="w-4 h-4" />
              ملخص اليوم السريع
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 mb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-blue-light/20 flex items-center justify-center font-black text-brand-blue-light">
              {user.name[0]}
            </div>
            <div>
              <div className="text-xs font-black">{user.name}</div>
              <div className="text-[10px] text-white/40 font-bold italic">
                {user.role === 'admin' ? 'مدير نظام' : user.role === 'operator' ? 'مشغل إنتاج' : 'إدارة الجودة'}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all text-white/60"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-100 p-4 sticky top-0 z-30 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-50 rounded-xl">
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
             <div className={cn(
               "w-2.5 h-2.5 rounded-full shadow-sm",
               serverStatus === 'connected' ? "bg-emerald-500 animate-pulse" : 
               serverStatus === 'syncing' ? "bg-brand-blue animate-pulse" : "bg-red-500"
             )} />
             <div className="font-black text-slate-800 text-sm">عمليات الإنتاج</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-brand-blue">
            {user.name[0]}
          </div>
        </header>

        <header className="hidden lg:flex bg-white border-b border-slate-100 p-4 sticky top-0 z-30 items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  serverStatus === 'connected' ? "bg-emerald-500" : 
                  serverStatus === 'syncing' ? "bg-brand-blue animate-pulse" : "bg-red-500"
                )} />
                <span className={cn(
                  serverStatus === 'connected' ? "text-emerald-600" :
                  serverStatus === 'syncing' ? "text-brand-blue" : "text-red-600"
                )}>
                  {serverStatus === 'connected' ? "متصل بقاعدة البيانات (Active)" : 
                   serverStatus === 'syncing' ? "جاري المزامنة... (Syncing)" : "فشل الاتصال بالخادم الرئيسي (Offline Mode)"}
                </span>
              </div>
              
              {!isOnline && (
                <div className="bg-red-50 text-red-600 text-[9px] font-black px-3 py-1 rounded-full border border-red-100 animate-pulse">
                  ⚠️ تنبيه: النظام يعمل محلياً فقط. سيتم حفظ البيانات في المتصفح.
                </div>
              )}
              
              {config.gsUrl && (
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                  <Cloud className={cn("w-4 h-4", (isSyncing || serverStatus === 'syncing') && "animate-bounce text-brand-blue")} />
                  <span>مزامنة تلقائية: </span>
                  <span className="text-slate-800">{isSyncing || serverStatus === 'syncing' ? 'جاري الرفع...' : 'مفعلة ✅'}</span>
                  {lastSync && <span className="text-slate-300">| آخر تحديث: {lastSync}</span>}
                </div>
              )}
           </div>
           
           <div className="text-xs font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
             {config.co} — {config.fa}
           </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {/* Daily Status Banner */}
          {orders.some(o => o.status === 'run') && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Play className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-800">هناك أوامر إنتاج جارية</div>
                  <div className="text-[10px] text-blue-600">يوجد {orders.filter(o => o.status === 'run').length} أمر قيد التنفيذ حالياً</div>
                </div>
              </div>
              <button onClick={() => setPage('ords')} className="text-xs font-black text-blue-600 hover:underline">عرض الأوامر ←</button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
            {page === 'dash' && <Dashboard orders={orders} formulas={formulas} materials={materials} inventory={inventory} setPage={(p) => {
              setPage(p);
              if (p === 'prod' && orders.some(o => o.status === 'run')) {
                setSelectedProdOrderId(orders.find(o => o.status === 'run')?.id || null);
              }
            }} />}
            {page === 'prod' && <Production 
              orders={orders} 
              formulas={formulas} 
              materials={materials} 
              currentUser={user} 
              onStartBatch={handleStartBatch} 
              onFinishBatch={handleFinishBatch} 
              initialOrderId={selectedProdOrderId || undefined}
            />}
            {page === 'mats' && <Materials materials={materials} setMaterials={updateMaterials} inventory={inventory} isAdmin={user.role === 'admin'} />}
            {page === 'fms' && <Formulas formulas={formulas} setFormulas={updateFormulas} materials={materials} isAdmin={user.role === 'admin'} />}
            {page === 'ords' && <Orders 
              orders={orders} 
              setOrders={updateOrders} 
              formulas={formulas} 
              isAdmin={user.role === 'admin'} 
              currentUser={user} 
              onPrint={currentOrderForPrint} 
              onRun={(id) => {
                setSelectedProdOrderId(id);
                setPage('prod');
              }}
            />}
            {page === 'inv' && <Inventory materials={materials} inventory={inventory} setInventory={updateInventory} />}
            {page === 'reps' && <Reports orders={orders} formulas={formulas} materials={materials} consumption={consumption} />}
            {page === 'ai' && <Analyst orders={orders} formulas={formulas} materials={materials} inventory={inventory} />}
            {page === 'usrs' && <UsersPage users={users} setUsers={updateUsers} currentUser={user} />}
            {page === 'sets' && <Settings config={config} setConfig={updateConfig} currentUser={user} setUsers={updateUsers} users={users} onBackup={handleBackup} onRestore={handleRestore} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  </div>

  {/* Summary Modal */}
  <Modal 
    isOpen={isSummaryOpen} 
    onClose={() => setIsSummaryOpen(false)} 
    title="ملخص الأداء اليومي"
    width="max-w-md"
  >
    <div className="space-y-6">
      {(() => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const todayOrders = orders.filter(o => o.date === todayStr);
        const totalTonsToday = todayOrders.reduce((acc, o) => acc + (Number(o.qty) || 0), 0);
        const completedToday = todayOrders.filter(o => o.status === 'done').length;
        const lowMaterialsCount = materials.filter(m => {
          const inv = inventory.find(i => i.id === m.id);
          return m.minStock > 0 && (Number(inv?.stock) || 0) <= m.minStock;
        }).length;

        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-5 rounded-[2rem] text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10" />
                <div className="relative z-10">
                  <div className="text-[9px] font-black text-white/40 uppercase mb-2 tracking-widest">Orders</div>
                  <div className="text-3xl font-black">{todayOrders.length}</div>
                </div>
              </div>
              <div className="bg-brand-blue p-5 rounded-[2rem] text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10" />
                <div className="relative z-10">
                  <div className="text-[9px] font-black text-white/40 uppercase mb-2 tracking-widest">Tons Produced</div>
                  <div className="text-3xl font-black">{totalTonsToday.toFixed(1)} <span className="text-xs">ط</span></div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-[2rem] flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Production Readiness</div>
                <div className="text-xl font-black text-emerald-900">{completedToday} / {todayOrders.length} أوامر مكتملة</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            {lowMaterialsCount > 0 && (
              <div className="bg-red-50 border border-red-100 p-5 rounded-[2rem] flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">Stock Alerts</div>
                  <div className="text-xl font-black text-red-900">{lowMaterialsCount} صنف بالمستوى الحرج</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 animate-pulse">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            )}
          </>
        );
      })()}

      <button 
        onClick={() => setIsSummaryOpen(false)}
        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm transition-all hover:bg-slate-800 shadow-xl shadow-slate-900/10"
      >
        إغلاق الملخص
      </button>
    </div>
  </Modal>
    </>
  );
}
