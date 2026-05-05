import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Package, Download, Calendar, Filter, FileSpreadsheet, FileText as FilePdf, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { Order, Formula, Material } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  orders: Order[];
  formulas: Formula[];
  materials: Material[];
  consumption: any[];
}

export default function Reports({ orders, formulas, materials, consumption }: ReportsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'consumption'>('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredConsumption = useMemo(() => {
    return consumption.filter(c => {
      const date = c.timestamp.split(' ')[0];
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    });
  }, [consumption, dateFrom, dateTo]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (dateFrom && o.date < dateFrom) return false;
      if (dateTo && o.date > dateTo) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalTons = filteredOrders.reduce((acc, o) => acc + (Number(o.qty) || 0), 0);
    
    const clients = new Set(filteredOrders.map(o => o.client));
    const breedUsage: Record<string, number> = {};
    const formulaUsage: Record<string, { n: string, c: number, t: number }> = {};
    const materialUsage: Record<string, { n: string, kg: number }> = {};

    filteredOrders.forEach(o => {
      // Breed stats
      if (o.breed) {
        breedUsage[o.breed] = (breedUsage[o.breed] || 0) + (Number(o.qty) || 0);
      }
      
      // Formula stats
      if (!formulaUsage[o.fmName]) formulaUsage[o.fmName] = { n: o.fmName, c: 0, t: 0 };
      formulaUsage[o.fmName].c++;
      formulaUsage[o.fmName].t += Number(o.qty) || 0;

      // Material stats
      const fm = formulas.find(f => f.id === o.fmId);
      if (fm) {
        const numBatches = o.bw > 0 ? (o.qty * 1000) / o.bw : 0;
        fm.items.forEach(it => {
          if (it.mt === 'raw') {
            if (!materialUsage[it.mn]) materialUsage[it.mn] = { n: it.mn, kg: 0 };
            materialUsage[it.mn].kg += it.w * numBatches;
          }
        });
      }
    });

    const topClients: Record<string, { n: string, c: number, t: number, last: string }> = {};
    filteredOrders.forEach(o => {
      if (!topClients[o.client]) topClients[o.client] = { n: o.client, c: 0, t: 0, last: o.date };
      topClients[o.client].c++;
      topClients[o.client].t += Number(o.qty) || 0;
      if (o.date > topClients[o.client].last) topClients[o.client].last = o.date;
    });

    return {
      totalTons,
      orderCount: filteredOrders.length,
      clientCount: clients.size,
      breedUsage,
      formulaUsage: Object.values(formulaUsage).sort((a, b) => b.t - a.t),
      topClients: Object.values(topClients).sort((a, b) => b.t - a.t),
      materialUsage: Object.values(materialUsage).sort((a, b) => b.kg - a.kg)
    };
  }, [filteredOrders, formulas]);

  const exportExcel = () => {
    // 1. Orders Detail Sheet
    const ordersData = filteredOrders.map(o => ({
      'رقم التشغيل': o.rn,
      'التاريخ': o.date,
      'العميل': o.client,
      'التركيبة': o.fmName,
      'السلالة': o.breed || '-',
      'العمر (أسبوع)': o.ageWeek || '-',
      'الكمية (ط)': o.qty,
      'وزن الباتشة (كجم)': o.bw,
      'الحالة': o.status === 'done' ? 'مكتمل' : o.status === 'canceled' ? 'ملغي' : 'قيد التشغيل',
    }));

    // 2. Formulas Summary Sheet
    const formulasData = stats.formulaUsage.map(f => ({
      'اسم التركيبة': f.n,
      'عدد الأوامر': f.c,
      'إجمالي الكمية (طن)': f.t.toFixed(2)
    }));

    // 3. Materials Summary Sheet
    const materialsData = stats.materialUsage.map(m => ({
      'اسم الخامة': m.n,
      'إجمالي السحب (طن)': (m.kg / 1000).toFixed(3),
      'إجمالي السحب (كجم)': m.kg.toFixed(0)
    }));

    const wb = XLSX.utils.book_new();
    
    const wsOrders = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, wsOrders, "تفاصيل الأوامر");
    
    const wsFormulas = XLSX.utils.json_to_sheet(formulasData);
    XLSX.utils.book_append_sheet(wb, wsFormulas, "إجمالي التركيبات");
    
    const wsMaterials = XLSX.utils.json_to_sheet(materialsData);
    XLSX.utils.book_append_sheet(wb, wsMaterials, "تفصيلي الخامات");

    XLSX.writeFile(wb, `تقرير_إنتاج_تفصيلي_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Add title (Arabic might need font embedding for perfect rendering, fallback to standard table)
    doc.text('Production Report - Dakahlia Poultry', 14, 15);
    
    const tableData = filteredOrders.map(o => [
      o.rn,
      o.date,
      o.client,
      o.fmName,
      o.breed || '-',
      o.ageWeek || '-',
      o.qty.toString(),
      o.status
    ]);

    autoTable(doc, {
      head: [['Run #', 'Date', 'Client', 'Formula', 'Breed', 'Age', 'Qty (T)', 'Status']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] }
    });

    // 2. Formulas Summary Section
    const lastY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Summary by Formula', 14, lastY);
    
    autoTable(doc, {
      head: [['Formula Name', 'Total Orders', 'Total Qty (Tons)']],
      body: stats.formulaUsage.map(f => [f.n, f.c.toString(), f.t.toFixed(2)]),
      startY: lastY + 5,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    // 3. Materials Summary Section (on new page if needed, but jspdf handles it)
    const materialsY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Total Material Consumption', 14, materialsY);

    autoTable(doc, {
      head: [['Material Name', 'Qty (Tons)', 'Qty (Kg)']],
      body: stats.materialUsage.map(m => [m.n, (m.kg / 1000).toFixed(3), m.kg.toFixed(0)]),
      startY: materialsY + 5,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 150, 105] }
    });

    doc.save(`detailed_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Printable Header */}
      <div className="hidden print:flex flex-row-reverse items-center justify-between mb-8 border-b-2 border-slate-900 pb-4">
        <div className="text-right">
          <h1 className="text-2xl font-black text-brand-blue">تقرير الاستهلاك والإنتاج</h1>
          <p className="text-slate-900 font-black text-lg mt-1">الدقهلية للدواجن</p>
          <p className="text-slate-500 font-bold">مصنع اعلاف دماص - إدارة الإنتاج</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 italic">{new Date().toLocaleString('ar-EG')}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">D</div>
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic">Smart Production</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <h2 className="text-2xl font-black text-slate-800">التقارير والإحصائيات</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportExcel} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
            <FileSpreadsheet className="w-4 h-4" />
            تصدير Excel
          </button>
          <button onClick={exportPDF} className="btn-primary bg-rose-600 hover:bg-rose-700">
            <FilePdf className="w-4 h-4" />
            تصدير PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 no-print">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-blue" />
            فلترة النتائج
          </h3>
          <div className="flex bg-slate-50 p-1 rounded-xl">
             <button 
               onClick={() => setActiveTab('summary')}
               className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black transition-all", activeTab === 'summary' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
             >ملخص الإنتاج</button>
             <button 
               onClick={() => setActiveTab('consumption')}
               className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black transition-all", activeTab === 'consumption' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
             >تقرير الاستهلاك الفعلي</button>
          </div>
          {activeTab === 'consumption' && (
            <button 
              onClick={() => window.print()}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all no-print"
            >
              <Printer className="w-4 h-4" />
              طباعة التقرير
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-black text-slate-400">من تاريخ</label>
            <input 
              type="date" 
              className="input-field text-xs" 
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-black text-slate-400">إلى تاريخ</label>
            <input 
              type="date" 
              className="input-field text-xs" 
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="px-6 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 transition-all"
          >
            مسح التاريخ
          </button>
        </div>
      </div>

      {activeTab === 'summary' ? (
      <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'عدد الأوامر', value: stats.orderCount, color: '#3b82f6', bg: 'bg-blue-50' },
          { label: 'إجمالي الأطنان', value: `${stats.totalTons.toFixed(2)} ط`, color: '#10b981', bg: 'bg-emerald-50' },
          { label: 'عدد العملاء', value: stats.clientCount, color: '#7c3aed', bg: 'bg-purple-50' },
          { label: 'تركيبات منفذة', value: stats.formulaUsage.length, color: '#f59e0b', bg: 'bg-amber-50' },
          { label: 'خامات مستهلكة', value: stats.materialUsage.length, color: '#0f766e', bg: 'bg-teal-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border-t-2 shadow-sm" style={{ borderTopColor: s.color }}>
            <div className={cn("inline-flex p-1.5 rounded-lg mb-2", s.bg)}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            </div>
            <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-slate-400 font-bold">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            استهلاك السلالات (Breeds Analysis)
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.breedUsage).length > 0 ? Object.entries(stats.breedUsage).map(([breed, tons]) => {
              const max = Math.max(...Object.values(stats.breedUsage), 1);
              const pct = (tons / max) * 100;
              return (
                <div key={breed} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>{breed}</span>
                    <span className="text-indigo-600">{tons.toFixed(1)} ط</span>
                  </div>
                  <div className="h-4 bg-indigo-50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-gradient-to-l from-indigo-500 to-indigo-400" />
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8 text-slate-300 text-xs italic font-bold">
                لا توجد بيانات سلالات مسجلة بعد
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            توزيع العميل (إجمالي الأطنان)
          </h3>
          <div className="space-y-4">
            {stats.topClients.slice(0, 8).map(c => {
              const max = stats.topClients[0]?.t || 1;
              const pct = (c.t / max) * 100;
              return (
                <div key={c.n} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>{c.n}</span>
                    <span className="text-purple-600">{c.t.toFixed(1)} ط</span>
                  </div>
                  <div className="h-4 bg-purple-50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-gradient-to-l from-purple-500 to-purple-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            استهلاك الخامات (تقديري)
          </h3>
          <div className="space-y-4">
            {stats.materialUsage.slice(0, 6).map(m => {
              const max = stats.materialUsage[0]?.kg || 1;
              const pct = (m.kg / max) * 100;
              return (
                <div key={m.n} className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-black text-slate-600">
                    <span>{m.n}</span>
                    <span className="text-teal-600">{(m.kg / 1000).toFixed(2)} ط</span>
                  </div>
                  <div className="h-2 bg-teal-50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-teal-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm overflow-hidden">
        <h3 className="text-sm font-black text-slate-800 mb-6">الإنتاج حسب التركيبة</h3>
        <table className="w-full text-right italic">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 border-b border-slate-50 uppercase tracking-wider">
              <th className="pb-4 px-4">التركيبة</th>
              <th className="pb-4 px-4">عدد الأوامر</th>
              <th className="pb-4 px-4">إجمالي الكمية (طن)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 not-italic">
            {stats.formulaUsage.map(f => (
              <tr key={f.n} className="text-xs hover:bg-slate-50">
                <td className="py-4 px-4 font-black">{f.n}</td>
                <td className="py-4 px-4 font-bold text-slate-500">{f.c}</td>
                <td className="py-4 px-4 font-black text-brand-amber text-sm">{f.t.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
               <thead>
                 <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                   <th className="py-4 px-6 text-center">التاريخ والوقت</th>
                   <th className="py-4 px-6">المادة الخام</th>
                   <th className="py-4 px-6 text-center">المستهدف (كجم)</th>
                   <th className="py-4 px-6 text-center">الفعلي (كجم)</th>
                   <th className="py-4 px-6 text-center">الفرق</th>
                   <th className="py-4 px-6 text-center">الانحراف %</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {filteredConsumption.slice().reverse().map(c => (
                   <tr key={c.id} className="text-xs hover:bg-slate-50 transition-colors">
                     <td className="py-4 px-6 text-center font-bold text-slate-400">
                        {new Date(c.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                     </td>
                     <td className="py-4 px-6">
                        <div className="font-black text-slate-800">{c.materialName}</div>
                     </td>
                     <td className="py-4 px-6 text-center font-bold text-slate-400">{c.targetWeight.toFixed(2)}</td>
                     <td className="py-4 px-6 text-center font-black text-slate-900">{c.actualWeight.toFixed(2)}</td>
                     <td className="py-4 px-6 text-center font-bold text-slate-600">{(c.actualWeight - c.targetWeight).toFixed(2)}</td>
                     <td className="py-4 px-6 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full font-black text-[10px]",
                          Math.abs(c.variance) > 2 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {c.variance > 0 ? '+' : ''}{c.variance.toFixed(2)}%
                        </span>
                     </td>
                   </tr>
                 ))}
                 {filteredConsumption.length === 0 && (
                   <tr>
                     <td colSpan={6} className="py-12 text-center text-slate-300 font-bold italic">لا توجد بيانات استهلاك جارية للفترة المحددة</td>
                   </tr>
                 )}
               </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
