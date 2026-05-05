import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Calendar,
  User as UserIcon,
  Users as UsersIcon,
  Weight,
  FileText,
  Clock,
  Play,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Formula, OrderStatus, MaterialType, Batch, User } from '../types';
import { MATERIAL_TYPES } from '../constants';
import { cn } from '../lib/utils';
import Modal from '../components/Modal';

import { QRCodeSVG } from 'qrcode.react';

interface OrdersProps {
  orders: Order[];
  setOrders: (o: Order[]) => void;
  formulas: Formula[];
  isAdmin: boolean;
  currentUser: User | null;
  onPrint: (order: Order) => void;
  onRun?: (orderId: string) => void;
}

export default function Orders({ orders, setOrders, formulas, isAdmin, currentUser, onPrint, onRun }: OrdersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [isBatchesModalOpen, setIsBatchesModalOpen] = useState(false);
  const [activeQCId, setActiveQCId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // New order form state
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    date: new Date().toISOString().split('T')[0],
    status: 'run',
    st: ['raw'],
    qty: 0,
    bw: 0
  });

  const nextRunNumber = useMemo(() => {
    if (orders.length === 0) return '100001';
    const max = Math.max(...orders.map(o => parseInt(o.rn || '0')));
    return (max + 1).toString();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => parseInt(b.rn) - parseInt(a.rn))
      .filter(o => 
        o.client.toLowerCase().includes(search.toLowerCase()) || 
        o.fmName.toLowerCase().includes(search.toLowerCase()) ||
        o.rn.includes(search)
      );
  }, [orders, search]);

  const batches = useMemo(() => {
    if (!newOrder.qty || !newOrder.bw) return 0;
    return (newOrder.qty * 1000) / newOrder.bw;
  }, [newOrder.qty, newOrder.bw]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.client || !newOrder.fmId || !newOrder.qty || !newOrder.bw) {
      alert('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    const fm = formulas.find(f => f.id === newOrder.fmId);
    
    // Auto-generate pending batches
    const totalBatches = Math.ceil((newOrder.qty! * 1000) / newOrder.bw!);
    const initialBatches: Batch[] = Array.from({ length: totalBatches }, (_, i) => ({
      id: `B${nextRunNumber}-${i + 1}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      orderId: '', // updated below
      batchNumber: i + 1,
      startTime: '',
      status: 'pending',
      weight: newOrder.bw!
    }));

    const orderId = Date.now().toString();
    const order: Order = {
      ...(newOrder as Order),
      id: orderId,
      rn: nextRunNumber,
      fmName: fm?.name || '',
      status: 'run',
      batches: initialBatches.map(b => ({ ...b, orderId }))
    };

    setOrders([...orders, order]);
    setIsModalOpen(false);
    setNewOrder({
      date: new Date().toISOString().split('T')[0],
      status: 'run',
      st: ['raw'],
      qty: 0,
      bw: 0
    });
  };

  const handleStatusChange = (id: string, status: OrderStatus) => {
    if (status === 'done') {
      setActiveQCId(id);
      setIsQCModalOpen(true);
    } else {
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  const handleSaveQC = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeQCId) return;
    const formData = new FormData(e.currentTarget);
    const qc = {
      protein: Number(formData.get('protein')),
      fat: Number(formData.get('fat')),
      fiber: Number(formData.get('fiber')),
      ash: Number(formData.get('ash')),
      moisture: Number(formData.get('moisture')),
      notes: formData.get('notes') as string
    };
    
    setOrders(orders.map(o => o.id === activeQCId ? { ...o, status: 'done', qc } : o));
    setIsQCModalOpen(false);
    setActiveQCId(null);
  };

  const startBatch = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const existingBatches = order.batches || [];
    const nextBatchNumber = existingBatches.length + 1;
    const expectedBatchCount = Math.ceil((order.qty * 1000) / order.bw);
    
    if (nextBatchNumber > expectedBatchCount) {
      alert('تم إنهاء جميع الباتشات المتوقعة');
      return;
    }

    const newBatch: Batch = {
      id: `B${order.rn}-${nextBatchNumber}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      orderId,
      batchNumber: nextBatchNumber,
      startTime: new Date().toISOString(),
      status: 'running',
      weight: order.bw,
      operator: currentUser?.name || 'Operator'
    };

    setOrders(orders.map(o => o.id === orderId ? { ...o, batches: [...existingBatches, newBatch] } : o));
  };

  const completeBatch = (orderId: string, batchId: string, actualWeight?: number, notes?: string) => {
    setOrders(orders.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        batches: o.batches?.map(b => b.id === batchId ? { 
          ...b, 
          endTime: new Date().toISOString(), 
          status: 'completed',
          actualWeight: actualWeight || b.weight,
          notes
        } : b)
      };
    }));
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الأمر؟')) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const handleToggleCol = (type: MaterialType) => {
    const current = newOrder.st || [];
    if (current.includes(type)) {
      setNewOrder({ ...newOrder, st: current.filter(t => t !== type) });
    } else {
      setNewOrder({ ...newOrder, st: [...current, type] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-800">أوامر الإنتاج</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          أمر جديد
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="بحث بالعميل، التركيبة، أو رقم التشغيل..."
          className="input-field pr-10 border-slate-100 bg-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-[11px] font-black text-slate-400 border-b border-slate-50">
                <th className="py-5 px-4 text-center">رقم التشغيل</th>
                <th className="py-5 px-4">التاريخ</th>
                <th className="py-5 px-4">العميل</th>
                <th className="py-5 px-4">التركيبة</th>
                <th className="py-5 px-4">الكمية (ط)</th>
                <th className="py-5 px-4">الباتشة (كجم)</th>
                <th className="py-5 px-4">الحالة</th>
                <th className="py-5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 italic">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="text-[13px] hover:bg-slate-50 transition-colors not-italic group">
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="bg-blue-50 text-brand-blue px-3 py-1 rounded-lg font-black text-xs tracking-wider border border-blue-100 italic">
                        {o.rn}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <QRCodeSVG value={`http://pms.dakahlia.net/order/${o.rn}`} size={40} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-400 text-xs">{o.date}</td>
                  <td className="py-4 px-4 font-black">{o.client}</td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-500">{o.fmName}</span>
                      {o.breed && (
                        <span className="text-[9px] text-slate-400 font-bold bg-slate-100 w-fit px-1 rounded mt-1">
                          {o.breed} - {o.ageWeek} أسبوع
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 font-black text-brand-green">{o.qty}</td>
                  <td className="py-4 px-4 font-bold text-slate-400">{o.bw}</td>
                  <td className="py-4 px-4">
                    <select 
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                      className={cn(
                        "text-[10px] font-black px-3 py-1 rounded-full border-none outline-none cursor-pointer appearance-none text-center",
                        o.status === 'done' ? "bg-emerald-50 text-emerald-600" : 
                        o.status === 'canceled' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      )}
                    >
                      <option value="run">قيد التشغيل</option>
                      <option value="done">مكتمل</option>
                      <option value="canceled">ملغي</option>
                    </select>
                    {o.qc && (
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-50 pt-2">
                        <div className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 rounded" title="Protein">P: {o.qc.protein}%</div>
                        <div className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 rounded" title="Fat">F: {o.qc.fat}%</div>
                        <div className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 rounded" title="Moisture">M: {o.qc.moisture}%</div>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => { setSelectedOrderId(o.id); setIsBatchesModalOpen(true); }}
                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors relative"
                        title="تتبع الباتشات"
                      >
                        <Clock className="w-4 h-4" />
                        {o.batches && o.batches.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-brand-blue text-white text-[8px] px-1 rounded-full">
                            {o.batches.filter(b => b.status === 'completed').length}/{Math.ceil((o.qty * 1000) / o.bw)}
                          </span>
                        )}
                      </button>
                      <button 
                        onClick={() => onRun?.(o.id)}
                        className="p-2 hover:bg-brand-blue/10 text-brand-blue rounded-xl transition-colors"
                        title="تشغيل الإنتاج"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onPrint(o)}
                        className="p-2 hover:bg-brand-blue/10 text-brand-blue rounded-xl transition-colors"
                        title="طباعة البيان"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(o.id)}
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <CheckSquare className="w-16 h-16 text-slate-100 mb-2" />
              <p className="text-slate-400 font-bold">لا توجد أوامر إنتاج مطابقة</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Order Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="إنشاء أمر إنتاج جديد"
        width="max-w-xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center italic">
            <span className="text-sm font-black text-blue-800">رقم التشغيلة التلقائي</span>
            <span className="text-2xl font-black text-blue-600 tracking-widest">{nextRunNumber}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <UserIcon className="w-3 h-3" /> اسم العميل *
              </label>
              <input 
                type="text" 
                className="input-field font-black" 
                required 
                value={newOrder.client || ''} 
                onChange={e => setNewOrder({ ...newOrder, client: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <FileText className="w-3 h-3" /> التركيبة *
              </label>
              <select 
                className="input-field font-black" 
                required 
                value={newOrder.fmId || ''} 
                onChange={e => setNewOrder({ ...newOrder, fmId: e.target.value })}
              >
                <option value="">اختر تركيبة...</option>
                {formulas.map(f => (
                  <option key={f.id} value={f.id}>{f.name} {f.code ? `(${f.code})` : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <Weight className="w-3 h-3" /> الكمية (طن) *
              </label>
              <input 
                type="number" 
                step="0.01" 
                className="input-field font-black" 
                required 
                value={newOrder.qty || ''} 
                onChange={e => setNewOrder({ ...newOrder, qty: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <Weight className="w-3 h-3" /> وزن الباتشة (كجم) *
              </label>
              <input 
                type="number" 
                className="input-field font-black" 
                required 
                value={newOrder.bw || ''} 
                onChange={e => setNewOrder({ ...newOrder, bw: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> التاريخ
              </label>
              <input 
                type="date" 
                className="input-field text-xs" 
                value={newOrder.date} 
                onChange={e => setNewOrder({ ...newOrder, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> النوع الفرعي
              </label>
              <select 
                className="input-field text-xs font-bold" 
                value={newOrder.subtype || ''} 
                onChange={e => setNewOrder({ ...newOrder, subtype: e.target.value })}
              >
                <option value="">بدون تحديد</option>
                <option value="علاجى">علاجى</option>
                <option value="إضافات خاصة">إضافات خاصة</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <UsersIcon className="w-3 h-3" /> السلالة (Breed)
              </label>
              <select 
                className="input-field text-xs font-bold" 
                value={newOrder.breed || ''} 
                onChange={e => setNewOrder({ ...newOrder, breed: e.target.value })}
              >
                <option value="">اختر السلالة...</option>
                <option value="Cobb 500">Cobb 500</option>
                <option value="Ross 308">Ross 308</option>
                <option value="Hubbard">Hubbard</option>
                <option value="Arbor Acres">Arbor Acres</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> عمر القطيع (أسبوع)
              </label>
              <input 
                type="number" 
                className="input-field font-black" 
                placeholder="مثال: 24"
                value={newOrder.ageWeek || ''} 
                onChange={e => setNewOrder({ ...newOrder, ageWeek: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500">الأصناف المطلوب إدراجها في البيان:</label>
            <div className="flex gap-4">
              {(['raw', 'med', 'add'] as MaterialType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleToggleCol(type)}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-2xl text-[11px] font-black border transition-all flex items-center justify-center gap-2",
                    newOrder.st?.includes(type) ? 
                      `bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20` : 
                      "bg-white border-slate-100 text-slate-400 grayscale"
                  )}
                >
                  {newOrder.st?.includes(type) && <CheckCircle2 className="w-3 h-3" />}
                  {MATERIAL_TYPES[type].label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {batches > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="text-xs font-bold text-emerald-800">إحصائيات التشغيلة:</div>
                <div className="text-xs font-black text-emerald-600 flex gap-4">
                  <span>عدد الباتشات: <b className="text-lg italic">{batches.toFixed(2)}</b></span>
                  <span>الإجمالي: <b>{((newOrder.qty || 0) * 1000).toLocaleString()} كجم</b></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 flex gap-3">
            <button type="submit" className="flex-1 btn-primary justify-center py-4 text-lg shadow-lg shadow-brand-blue/20">
              حفظ أمر الإنتاج
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-2 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-100 transition-all">إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* QC Modal */}
      <Modal 
        isOpen={isQCModalOpen} 
        onClose={() => setIsQCModalOpen(false)} 
        title="نتائج رقابة الجودة (QC Results)"
      >
        <form onSubmit={handleSaveQC} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">البروتين (%)</label>
              <input name="protein" type="number" step="0.1" className="input-field" placeholder="0.0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الدهون (%)</label>
              <input name="fat" type="number" step="0.1" className="input-field" placeholder="0.0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الألياف (%)</label>
              <input name="fiber" type="number" step="0.1" className="input-field" placeholder="0.0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الرماد (%)</label>
              <input name="ash" type="number" step="0.1" className="input-field" placeholder="0.0" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">الرطوبة (%)</label>
              <input name="moisture" type="number" step="0.1" className="input-field" placeholder="0.0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات المختبر</label>
            <textarea name="notes" className="input-field h-20 resize-none" placeholder="أي ملاحظات إضافية حول الجودة..."></textarea>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="submit" className="flex-1 btn-primary justify-center">حفظ النتائج وإكمال الأمر</button>
            <button type="button" onClick={() => setIsQCModalOpen(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-100">تجاهل</button>
          </div>
        </form>
      </Modal>

      {/* Batches Tracking Modal */}
      <Modal
        isOpen={isBatchesModalOpen}
        onClose={() => setIsBatchesModalOpen(false)}
        title="تتبع باتشات الإنتاج (Batch Tracking)"
        width="max-w-2xl"
      >
        {selectedOrderId && (
          <div className="space-y-6">
            {(() => {
              const order = orders.find(o => o.id === selectedOrderId);
              if (!order) return null;
              const batches = order.batches || [];
              const runningBatch = batches.find(b => b.status === 'running');
              const completedCount = batches.filter(b => b.status === 'completed').length;
              const totalBatches = Math.ceil((order.qty * 1000) / order.bw);
              
              return (
                <>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">التقدم الإجمالي</div>
                      <div className="text-lg font-black text-slate-800">{completedCount} / {totalBatches} باتش</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase">إجمالي الكمية المنتج</div>
                      <div className="text-lg font-black text-brand-green">{(completedCount * order.bw / 1000).toFixed(2)} / {order.qty} طن</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => startBatch(selectedOrderId)}
                      disabled={!!runningBatch || completedCount >= totalBatches}
                      className="flex-1 btn-primary justify-center py-4 disabled:opacity-50"
                    >
                      <Play className="w-5 h-5" />
                      بدء باتش جديد
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-3">
                    {batches.slice().reverse().map((b, i) => (
                      <div key={b.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400">
                            #{b.batchNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-800">
                                {b.status === 'running' ? 'جاري الإنتاج...' : 'مكتمل'}
                              </span>
                              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">
                                UID: {b.id}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold flex gap-2">
                              <span>البداية: {new Date(b.startTime).toLocaleTimeString('ar-EG')}</span>
                              {b.operator && <span className="text-brand-blue">| المشغل: {b.operator}</span>}
                              {b.endTime && ` — النهاية: ${new Date(b.endTime).toLocaleTimeString('ar-EG')}`}
                            </div>
                          </div>
                        </div>
                        {b.status === 'running' && (currentUser?.role === 'admin' || currentUser?.role === 'quality') && (
                          <div className="flex flex-col md:flex-row items-end gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <div className="flex-1 space-y-1">
                               <label className="block text-[10px] font-black text-slate-500 mr-2">الوزن الفعلي (Actual Weight kg)</label>
                               <input 
                                type="number" 
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                defaultValue={b.weight}
                                id={`weight-${b.id}`}
                              />
                             </div>
                             <div className="flex-[2] space-y-1">
                               <label className="block text-[10px] font-black text-slate-500 mr-2">ملاحظات (Notes)</label>
                               <input 
                                type="text" 
                                placeholder="أضف ملاحظات..."
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                id={`notes-${b.id}`}
                              />
                             </div>
                            <button 
                              onClick={() => {
                                const weight = Number((document.getElementById(`weight-${b.id}`) as HTMLInputElement).value);
                                const note = (document.getElementById(`notes-${b.id}`) as HTMLInputElement).value;
                                completeBatch(selectedOrderId, b.id, weight, note);
                              }}
                              className="bg-brand-green text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 mb-0.5"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {b.status === 'completed' && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase italic">
                              {(() => {
                                if (!b.endTime) return '';
                                const diff = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
                                const mins = Math.floor(diff / 60000);
                                const secs = Math.floor((diff % 60000) / 1000);
                                return `${mins}د ${secs}ث`;
                              })()}
                            </div>
                            {b.notes && <div className="text-[9px] text-slate-400 italic">ملاحظة: {b.notes}</div>}
                            {b.actualWeight !== b.weight && (
                              <div className="text-[9px] font-bold text-amber-600">انحراف الوزن: {(b.actualWeight! - b.weight).toFixed(1)} كجم</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {batches.length === 0 && (
                      <div className="text-center py-12 text-slate-300 italic font-bold">
                        لم يتم بدء أي باتشات لهذا الأمر بعد
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
