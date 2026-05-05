import React from 'react';
import { Database, Printer, Save, AlertCircle, Package } from 'lucide-react';
import { Material, InventoryItem } from '../types';
import { MATERIAL_TYPES } from '../constants';

interface InventoryProps {
  materials: Material[];
  inventory: InventoryItem[];
  setInventory: (inv: InventoryItem[]) => void;
}

export default function Inventory({ materials, inventory, setInventory }: InventoryProps) {
  const handleStockChange = (id: string, value: string) => {
    const existing = inventory.find(i => i.id === id);
    if (existing) {
      setInventory(inventory.map(i => i.id === id ? { ...i, stock: value } : i));
    } else {
      setInventory([...inventory, { id, stock: value }]);
    }
  };

  const categories = [
    { title: 'الخامات الأساسية', type: 'raw', color: 'bg-blue-50 text-blue-800' },
    { title: 'الأدوية', type: 'med', color: 'bg-purple-50 text-purple-800' },
    { title: 'إضافات الاعلاف', type: 'add', color: 'bg-emerald-50 text-emerald-800' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-800">رصيد المخزون</h2>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="btn-primary bg-slate-800 hover:bg-slate-900 border-none">
            <Printer className="w-4 h-4" />
            طباعة
          </button>
          <button className="btn-primary shadow-lg shadow-brand-blue/20">
            <Save className="w-4 h-4" />
            حفظ الأرصدة
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700 text-xs font-bold shadow-sm">
        <AlertCircle className="w-5 h-5 shrink-0" />
        يرجى إدخال رصيد بداية اليوم لكل خامة يدوياً لضمان دقة التقارير.
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-none">
        <div className="p-8 hidden print:block border-b-2 border-brand-blue mb-6">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <h1 className="text-2xl font-black text-brand-blue">رصيد المخزون</h1>
              <p className="text-slate-900 font-black text-lg mt-1">الدقهلية للدواجن</p>
              <p className="text-slate-500 font-bold">مصنع اعلاف دماص - ادارة الامهات</p>
              <div className="text-xs text-slate-400 mt-2 italic">{new Date().toLocaleDateString('ar-EG', { dateStyle: 'full' })}</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 bg-brand-blue rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-lg">D</div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Smart Production</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-brand-blue text-white">
                <th className="py-4 px-4 text-center rounded-r-2xl border-none">م</th>
                <th className="py-4 px-4 text-center">الكود</th>
                <th className="py-4 px-4">اسم الصنف</th>
                <th className="py-4 px-4 text-center rounded-l-2xl border-none">رصيد البداية (كجم)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, catIdx) => {
                const catMaterials = materials.filter(m => m.type === cat.type);
                if (catMaterials.length === 0) return null;

                return (
                  <React.Fragment key={cat.type}>
                    <tr className={cat.color}>
                      <td colSpan={4} className="py-3 px-6 text-sm font-black border-none">
                        {cat.title}
                      </td>
                    </tr>
                    {catMaterials.map((m, mIdx) => {
                      const inv = inventory.find(i => i.id === m.id);
                      return (
                        <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">{mIdx + 1}</td>
                          <td className="py-4 px-4 text-center font-bold text-brand-blue-light">{m.code || '-'}</td>
                          <td className="py-4 px-4 font-black">{m.name}</td>
                          <td className="py-4 px-4 text-center">
                            <input 
                              type="number" 
                              className="w-32 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-center font-black focus:outline-none focus:border-brand-blue transition-all"
                              placeholder="0"
                              value={inv?.stock || ''}
                              onChange={e => handleStockChange(m.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          
          {materials.length === 0 && (
            <div className="py-24 text-center">
              <Database className="w-16 h-16 text-slate-100 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">لا توجد خامات مضافة حالياً</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
