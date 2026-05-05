import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Package, 
  Users, 
  CheckCircle2, 
  FileText,
  AlertCircle,
  Plus,
  CheckSquare,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { Order, Formula, Material, InventoryItem } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  orders: Order[];
  formulas: Formula[];
  materials: Material[];
  inventory: InventoryItem[];
  setPage: (p: string) => void;
}

const StatCard = ({ label, value, icon: Icon, color, subText }: any) => (
  <div className="bg-white rounded-2xl p-6 border-t-4 border-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ borderTopColor: color }}>
    <div className="flex justify-between items-start">
      <div>
        <div className="text-[11px] text-slate-500 mb-1 font-bold">{label}</div>
        <div className="text-2xl font-black" style={{ color }}>{value}</div>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
    {subText && (
      <div className="mt-4 px-2 py-1 rounded-full text-[10px] font-bold inline-block" style={{ backgroundColor: `${color}15`, color }}>
        {subText}
      </div>
    )}
  </div>
);

export default function Dashboard({ orders, formulas, materials, inventory, setPage }: DashboardProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const lowStockItems = useMemo(() => {
    return materials
      .map(m => {
        const inv = inventory.find(i => i.id === m.id);
        const stock = Number(inv?.stock) || 0;
        const isCritical = m.minStock > 0 && stock <= (m.minStock * 0.3);
        const isLow = m.minStock > 0 && stock <= m.minStock;
        return { ...m, stock, isCritical, isLow };
      })
      .filter(m => m.isLow)
      .sort((a, b) => (a.isCritical === b.isCritical ? 0 : a.isCritical ? -1 : 1));
  }, [materials, inventory]);
  const stats = useMemo(() => {
    const totalTons = orders.reduce((acc, o) => acc + (Number(o.qty) || 0), 0);
    const todayOrders = orders.filter(o => o.date === today);
    const todayQty = todayOrders.reduce((acc, o) => acc + (Number(o.qty) || 0), 0);
    const running = orders.filter(o => o.status === 'run').length;
    const done = orders.filter(o => o.status === 'done').length;
    const canceled = orders.filter(o => o.status === 'canceled').length;
    const completionRate = orders.length ? Math.round((done / orders.length) * 100) : 0;

    return [
      { label: 'أوامر الإنتاج', value: orders.length, icon: FileText, color: '#1e40af', subText: `اليوم: ${todayOrders.length}` },
      { label: 'إجمالي الأطنان', value: `${totalTons.toFixed(1)} ط`, icon: TrendingUp, color: '#10b981', subText: `اليوم: ${todayQty.toFixed(1)} ط` },
      { label: 'قيد التشغيل', value: running, icon: AlertCircle, color: '#f59e0b', subText: `معدل الإنجاز: ${completionRate}%` },
      { label: 'التركيبات', value: formulas.length, icon: Package, color: '#7c3aed', subText: `الخامات: ${materials.length}` },
      { label: 'مكتملة', value: done, icon: CheckCircle2, color: '#0f766e', subText: `ملغي: ${canceled}` },
    ];
  }, [orders, formulas, materials, today]);

  // Last 7 days production logic
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const data = days.map(day => {
      const qty = orders.filter(o => o.date === day).reduce((acc, o) => acc + (Number(o.qty) || 0), 0);
      return { day, qty };
    });

    const max = Math.max(...data.map(d => d.qty), 0.1);
    return data.map(d => ({ ...d, pct: Math.round((d.qty / max) * 100) }));
  }, [orders]);

  const topFormulas = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.fmName] = (counts[o.fmName] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ 
        name, 
        count, 
        pct: Math.round((count / orders.length) * 100) 
      }));
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...orders].sort((a, b) => Number(b.rn) - Number(a.rn)).slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded-xl shadow-md border-t-2 border-brand-blue">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white text-lg font-black italic">D</div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">عمليات مصنع الامهات</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Smart Production | Dashboard</p>
          </div>
        </div>
        <button onClick={() => setPage('ords')} className="btn-primary shadow-lg shadow-brand-blue/20">
          <Plus className="w-4 h-4" />
          أمر جديد
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-3xl p-6 relative overflow-hidden border shadow-xl shadow-red-500/10",
            lowStockItems.some(i => i.isCritical) 
              ? "bg-red-600 text-white border-red-500 shadow-red-500/20" 
              : "bg-brand-amber text-white border-amber-500 shadow-amber-500/20"
          )}
        >
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <AlertCircle className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black flex items-center gap-2 text-lg">
                <AlertCircle className="w-6 h-6" />
                تنبيه المخزون: {lowStockItems.some(i => i.isCritical) ? 'مستويات حرجة' : 'خامات قاربت على النفاد'}
              </h3>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-black backdrop-blur-md">
                {lowStockItems.length} صنف متأثر
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.map(item => (
                <div key={item.id} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/20">
                  <div>
                    <div className="text-xs font-black mb-1">{item.name}</div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                        item.isCritical ? "bg-red-500 text-white" : "bg-brand-amber text-white"
                      )}>
                        {(item.stock || 0).toLocaleString()} كجم
                      </span>
                      {item.isCritical && (
                        <span className="text-[8px] font-black uppercase bg-white text-red-600 px-1 rounded animate-pulse">Critical</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] opacity-60 font-black uppercase">الحد الأدنى</div>
                    <div className="text-[10px] font-black">{(item.minStock || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-4">
              <button 
                onClick={() => setPage('inv')}
                className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-xs font-black shadow-lg hover:scale-105 transition-all"
              >
                تحديث الكميات بالمخزن
              </button>
              {lowStockItems.some(i => i.isCritical) && (
                <div className="text-[10px] font-black text-white/80 animate-bounce">
                  🚩 يرجى التواصل مع قسم المشتريات فوراً لتجنب توقف الإنتاج
                </div>
              )}
            </div>
            <button 
              onClick={() => setPage('ords')} 
              className="mt-6 text-xs font-black text-white/80 hover:underline flex items-center gap-1"
            >
              عرض تفاصيل أوامر الإنتاج ←
            </button>
          </div>
        </motion.div>
      )}

      {/* Operator Active Control */}
      {orders.some(o => o.status === 'run') && (
        <section className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-brand-blue/20 p-3 rounded-2xl">
                  <Play className="w-6 h-6 text-brand-blue-light animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black italic">لوحة تحكم المشغل (Active Shift)</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Real-time Production Control</p>
                </div>
              </div>
              <button onClick={() => setPage('ords')} className="text-xs font-black text-white/60 hover:text-white border-b border-white/20 pb-1">إلى قائمة الأوامر ←</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {orders.filter(o => o.status === 'run').slice(0, 2).map(order => {
                const totalBatches = Math.ceil((order.qty * 1000) / order.bw);
                const completedBatches = (order.batches || []).filter(b => b.status === 'completed').length;
                const progress = (completedBatches / totalBatches) * 100;
                
                return (
                  <div key={order.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black text-brand-blue-light bg-brand-blue/20 px-2 py-1 rounded-lg uppercase italic mb-2 inline-block">Order #{order.rn}</span>
                        <h4 className="text-lg font-black">{order.client}</h4>
                        <p className="text-xs text-white/60 font-bold">{order.fmName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-brand-green">{progress.toFixed(0)}%</div>
                        <div className="text-[10px] text-white/40">تم الإنجاز</div>
                      </div>
                    </div>

                    <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-6">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-brand-green"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="text-sm font-black">{completedBatches}</div>
                          <div className="text-[9px] text-white/40 uppercase">Batches</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-black text-brand-blue-light">{order.qty}</div>
                          <div className="text-[9px] text-white/40 uppercase">Tons</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setPage('ords')}
                        className="bg-brand-blue-light text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black hover:scale-105 transition-all"
                      >
                        إدارة الباتشات
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Production Chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-black flex items-center gap-2 mb-6 text-slate-800">
            <TrendingUp className="w-5 h-5 text-brand-blue" />
            الإنتاج اليومي (7 أيام)
          </h3>
          <div className="space-y-4">
            {chartData.map((d, i) => {
              const dObj = new Date(d.day);
              const isToday = d.day === today;
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-400 w-8">{['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][dObj.getDay()].substring(0, 3)}</span>
                  <div className="flex-1 h-6 bg-slate-50 rounded-full overflow-hidden relative border border-slate-100">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      className={cn("h-full rounded-full flex items-center justify-end px-3", isToday ? "bg-brand-green" : "bg-brand-blue-light")}
                    >
                      {d.qty > 0 && <span className="text-[9px] font-black text-white">{d.qty.toFixed(1)}</span>}
                    </motion.div>
                  </div>
                  <span className="text-[10px] font-black w-8 text-center">{d.qty > 0 ? d.qty.toFixed(1) : '-'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Formulas */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-black flex items-center gap-2 mb-6 text-slate-800">
            <Package className="w-5 h-5 text-brand-purple" />
            أعلى التركيبات طلباً
          </h3>
          <div className="space-y-4">
            {topFormulas.length > 0 ? topFormulas.map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 italic">
                  <span>{f.name}</span>
                  <span>{f.count} أمر</span>
                </div>
                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${f.pct}%` }}
                    className="h-full bg-brand-purple"
                  />
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Package className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-xs">لا توجد بيانات كافية</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black flex items-center gap-2 text-slate-800">
            <CheckSquare className="w-5 h-5 text-brand-blue" />
            آخر أوامر الإنتاج
          </h3>
          <button onClick={() => setPage('ords')} className="text-[10px] font-black text-brand-blue hover:underline">عرض الكل</button>
        </div>
        
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-[11px] font-black text-slate-400 border-b border-slate-50">
                  <th className="pb-3 px-2">رقم التشغيل</th>
                  <th className="pb-3 px-2">العميل</th>
                  <th className="pb-3 px-2">التركيبة</th>
                  <th className="pb-3 px-2">الكمية</th>
                  <th className="pb-3 px-2">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="text-xs group hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-2">
                      <span className="bg-blue-50 text-brand-blue px-2 py-0.5 rounded font-black text-[10px]">{o.rn}</span>
                    </td>
                    <td className="py-4 px-2 font-bold">{o.client}</td>
                    <td className="py-4 px-2 text-slate-500">{o.fmName}</td>
                    <td className="py-4 px-2 font-black text-brand-green">{o.qty} ط</td>
                    <td className="py-4 px-2">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[9px] font-black",
                        o.status === 'done' ? "bg-green-50 text-green-600" : 
                        o.status === 'canceled' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {o.status === 'done' ? 'مكتمل' : o.status === 'canceled' ? 'ملغي' : 'قيد التشغيل'}
                      </span>
                      {o.qc && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-[8px] bg-slate-100 px-1 rounded">P:{o.qc.protein}%</span>
                          <span className="text-[8px] bg-slate-100 px-1 rounded">F:{o.qc.fat}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-xs">لا توجد أوامر بعد</p>
          </div>
        )}
      </div>
    </div>
  );
}
