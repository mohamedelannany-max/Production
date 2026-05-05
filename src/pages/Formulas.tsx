import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Copy, 
  Info,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Formula, Material, FormulaItem, MaterialType } from '../types';
import { MATERIAL_TYPES } from '../constants';
import { cn } from '../lib/utils';
import Modal from '../components/Modal';

interface FormulasProps {
  formulas: Formula[];
  setFormulas: (f: Formula[]) => void;
  materials: Material[];
  isAdmin: boolean;
}

export default function Formulas({ formulas, setFormulas, materials, isAdmin }: FormulasProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [items, setItems] = useState<FormulaItem[]>([]);
  const [search, setSearch] = useState('');

  const filteredFormulas = formulas.filter(f => 
    f.name.includes(search) || (f.code && f.code.includes(search))
  );

  const handleOpenModal = (formula: Formula | null) => {
    setEditingFormula(formula);
    setItems(formula ? [...formula.items] : []);
    setIsModalOpen(true);
  };

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const mId = formData.get('materialId') as string;
    const weight = parseFloat(formData.get('weight') as string);

    if (!mId || !weight) return;

    const mat = materials.find(m => m.id === mId);
    if (!mat) return;

    const existingIdx = items.findIndex(it => it.mi === mId);
    const newItem: FormulaItem = {
      mi: mat.id,
      mn: mat.name,
      mc: mat.code || '',
      mt: mat.type,
      w: weight
    };

    if (existingIdx > -1) {
      const newItems = [...items];
      newItems[existingIdx] = newItem;
      setItems(newItems);
    } else {
      setItems([...items, newItem]);
    }

    e.currentTarget.reset();
  };

  const handleSaveFormula = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formulaData: Partial<Formula> = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      notes: formData.get('notes') as string,
      items: [...items]
    };

    if (editingFormula) {
      setFormulas(formulas.map(f => f.id === editingFormula.id ? { ...f, ...formulaData } : f));
    } else {
      setFormulas([...formulas, { ...formulaData, id: Date.now().toString() } as Formula]);
    }

    setIsModalOpen(false);
  };

  const handleClone = (formula: Formula) => {
    const clone: Formula = {
      ...JSON.parse(JSON.stringify(formula)),
      id: Date.now().toString(),
      name: `${formula.name} (نسخة)`,
      code: formula.code ? `${formula.code}-C` : ''
    };
    setFormulas([...formulas, clone]);
  };

  const handleDelete = (id: string) => {
    if (confirm('حذف هذه التركيبة؟')) {
      setFormulas(formulas.filter(f => f.id !== id));
    }
  };

  const totalWeight = useMemo(() => items.reduce((acc, it) => acc + (it.w || 0), 0), [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-800">التركيبات</h2>
        {isAdmin && (
          <button onClick={() => handleOpenModal(null)} className="btn-primary">
            <Plus className="w-4 h-4" />
            إضافة تركيبة
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="بحث بالاسم..."
          className="input-field pr-10 border-slate-100 bg-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFormulas.map((f, i) => {
          const tw = f.items.reduce((acc, it) => acc + (it.w || 0), 0);
          return (
            <motion.div 
              key={f.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  {f.code && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-black text-[9px] block w-fit mb-1">{f.code}</span>}
                  <h4 className="font-black text-slate-800">{f.name}</h4>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => handleClone(f)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-brand-blue rounded-lg transition-colors" title="استنساخ">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenModal(f)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 border-t border-slate-50 pt-4 max-h-48 overflow-y-auto">
                {f.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{it.mn}</span>
                    <span className="font-bold text-brand-blue">{it.w} كجم</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between font-black text-slate-800 text-sm">
                <span>الإجمالي</span>
                <span className="text-emerald-600">{tw} كجم</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modern Formula Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingFormula ? 'تعديل تركيبة' : 'تركيبة جديدة'}
        width="max-w-2xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveFormula} id="formula-form" className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">اسم التركيبة *</label>
                <input name="name" className="input-field" placeholder="علف أمهات" required defaultValue={editingFormula?.name} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">كود التركيبة</label>
                <input name="code" className="input-field" placeholder="F-001" defaultValue={editingFormula?.code} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">ملاحظات</label>
                <textarea name="notes" className="input-field min-h-[80px]" defaultValue={editingFormula?.notes} />
              </div>
            </form>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <h5 className="text-xs font-black text-blue-800 mb-3 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                إضافة مادة
              </h5>
              <form onSubmit={handleAddItem} className="space-y-3">
                <select name="materialId" className="input-field text-xs" required>
                  <option value="">اختر المادة...</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      [{MATERIAL_TYPES[m.type].label}] {m.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input name="weight" type="number" step="0.01" className="input-field text-xs flex-1" placeholder="الوزن (كجم)" required />
                  <button type="submit" className="btn-primary p-2 transition-transform active:scale-95">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-xs font-black text-slate-800">عناصر التركيبة</h5>
              <div className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg text-slate-500 font-bold">
                {items.length} مواد
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              <AnimatePresence>
                {items.map((it, idx) => (
                  <motion.div 
                    key={it.mi} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{it.mn}</div>
                      <div className="text-[9px] text-slate-400 capitalize">{MATERIAL_TYPES[it.mt].label}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-black text-brand-blue">{it.w} كجم</div>
                        <div className="text-[9px] text-slate-400">({totalWeight > 0 ? ((it.w / totalWeight) * 100).toFixed(1) : 0}%)</div>
                      </div>
                      <button 
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="p-1 px-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {items.length === 0 && (
                <div className="text-center py-12 text-slate-300 border-2 border-dashed border-slate-50 rounded-3xl">
                  <span className="text-[10px] font-bold">يرجى إضافة مواد للتركيبة</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mt-auto">
              <div className="flex justify-between items-center font-black">
                <span className="text-emerald-800 text-xs">إجمالي وزن الخلطة (الباتشة)</span>
                <span className="text-emerald-600 text-lg">{totalWeight} كجم</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                form="formula-form" 
                type="submit" 
                className="flex-1 btn-primary justify-center shadow-lg shadow-brand-blue/20"
                disabled={items.length === 0}
              >
                حفظ التركيبة كاملة
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-100 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
