import React, { useState } from 'react';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, Thermometer, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { Material, MaterialType, InventoryItem } from '../types';
import { MATERIAL_TYPES } from '../constants';
import { cn } from '../lib/utils';
import Modal from '../components/Modal';

interface MaterialsProps {
  materials: Material[];
  setMaterials: (m: Material[]) => void;
  inventory: InventoryItem[];
  isAdmin: boolean;
}

export default function Materials({ materials, setMaterials, inventory, isAdmin }: MaterialsProps) {
  const [filter, setFilter] = useState<MaterialType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const filteredMaterials = materials.filter(m => {
    const s = search.toLowerCase();
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSearch = !s || 
      m.name.toLowerCase().includes(s) || 
      (m.code && m.code.toLowerCase().includes(s));
    return matchesFilter && matchesSearch;
  });

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الخامة؟')) {
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const materialData: Partial<Material> = {
      name: formData.get('name') as string,
      type: formData.get('type') as MaterialType,
      code: formData.get('code') as string,
      minStock: Number(formData.get('minStock')) || 0,
    };

    if (editingMaterial) {
      setMaterials(materials.map(m => m.id === editingMaterial.id ? { ...m, ...materialData } : m));
    } else {
      setMaterials([...materials, { ...materialData, id: Date.now().toString() } as Material]);
    }
    
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  const tabs: { id: MaterialType | 'all'; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'raw', label: 'خامات' },
    { id: 'med', label: 'أدوية' },
    { id: 'add', label: 'إضافات اعلاف' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            الخامات
            <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
              {materials.length}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="btn-primary bg-slate-800 hover:bg-slate-900 border-none print:hidden"
          >
            <Printer className="w-4 h-4" />
            طباعة القائمة
          </button>
          {isAdmin && (
            <button 
              onClick={() => { setEditingMaterial(null); setIsModalOpen(true); }}
              className="btn-primary print:hidden"
            >
              <Plus className="w-4 h-4" />
              إضافة خامة
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all",
                filter === tab.id ? "bg-brand-blue text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="بحث بالاسم، الكود، أو الحالة..."
            className="input-field pr-10 border-slate-100"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Printable Inventory Report Header (Hidden in UI) */}
      <div className="hidden print:flex flex-row-reverse items-center justify-between mb-8 border-b-2 border-slate-900 pb-4">
        <div className="text-right">
          <h1 className="text-2xl font-black text-brand-blue">تقرير رصيد الخامات</h1>
          <p className="text-slate-900 font-black text-lg mt-1">الدقهلية للدواجن</p>
          <p className="text-slate-500 font-bold">مصنع اعلاف دماص - ادارة الامهات</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 italic">{new Date().toLocaleString('ar-EG')}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center text-white text-2xl font-black">D</div>
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic">Smart Production</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMaterials.map((m, i) => {
          const typeInfo = MATERIAL_TYPES[m.type];
          const invItem = inventory.find(inv => inv.id === m.id);
          const currentStock = Number(invItem?.stock) || 0;
          const isLowStock = m.minStock > 0 && currentStock <= m.minStock;
          const isCritical = m.minStock > 0 && currentStock <= (m.minStock * 0.3); // 30% or less

          return (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "bg-white rounded-3xl p-5 border shadow-sm transition-all relative overflow-hidden group",
                isLowStock ? "border-brand-amber bg-amber-50/20" : "border-slate-100",
                isCritical && "border-red-500 bg-red-50/20 shadow-lg shadow-red-500/10"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={cn("text-[9px] font-black px-2 py-1 rounded-full", typeInfo.bg, `text-${typeInfo.color}`)}>
                  {typeInfo.label}
                </span>
                <div className="flex items-center gap-2">
                  {isLowStock && (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                      <AlertTriangle className={cn("w-4 h-4", isCritical ? "text-red-500" : "text-brand-amber")} />
                    </motion.div>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditingMaterial(m); setIsModalOpen(true); }}
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {m.code && <div className="text-[10px] text-slate-400 font-bold mb-1">{m.code}</div>}
              <div className="font-black text-slate-800 text-lg">{m.name}</div>
              
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded-2xl">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">المخزون الحالي</div>
                  <div className={cn(
                    "text-sm font-black",
                    isCritical ? "text-red-600" : isLowStock ? "text-brand-amber" : "text-slate-800"
                  )}>
                    {(currentStock || 0).toLocaleString()} كجم
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-2xl">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">الحد الأدنى</div>
                  <div className="text-sm font-black text-slate-500">{(m.minStock || 0).toLocaleString()} كجم</div>
                </div>
              </div>

              <div className={cn(
                "absolute right-0 bottom-0 w-16 h-16 -mr-4 -mb-4 opacity-5 transition-transform group-hover:scale-110",
                isCritical ? "text-red-500" : isLowStock ? "text-brand-amber" : `text-${typeInfo.color}`
              )}>
                <Package className="w-full h-full" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <Package className="w-16 h-16 mx-auto mb-4 text-slate-100" />
          <p className="text-slate-400 font-bold">لا توجد خامات تطابق بحثك</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMaterial ? 'تعديل خامة' : 'إضافة خامة جديدة'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">نوع المادة *</label>
            <select name="type" className="input-field" defaultValue={editingMaterial?.type || 'raw'}>
              <option value="raw">خامات</option>
              <option value="med">أدوية</option>
              <option value="add">إضافات اعلاف</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">كود الخامة</label>
            <input 
              name="code" 
              type="text" 
              className="input-field" 
              placeholder="مثال: RM-001"
              defaultValue={editingMaterial?.code}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم الخامة *</label>
            <input 
              name="name" 
              type="text" 
              className="input-field" 
              placeholder="مثال: ذرة صفراء"
              required
              defaultValue={editingMaterial?.name}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الحد الأدنى للمخزون (كجم)</label>
            <input 
              name="minStock" 
              type="number" 
              className="input-field" 
              placeholder="0"
              defaultValue={editingMaterial?.minStock}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="submit" className="flex-1 btn-primary justify-center">حفظ</button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-100 transition-all">إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
