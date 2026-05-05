import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Check, 
  AlertTriangle, 
  Clock, 
  Scale, 
  Package, 
  ChevronLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Formula, Batch, User, Material } from '../types';
import { cn } from '../lib/utils';
import Modal from '../components/Modal';

interface ProductionProps {
  orders: Order[];
  formulas: Formula[];
  materials: Material[];
  currentUser: User | null;
  onStartBatch: (orderId: string, batchId: string) => Promise<void>;
  onFinishBatch: (orderId: string, batchId: string, actualWeights: Record<string, number>, notes?: string, actualWeight?: number) => Promise<void>;
  initialOrderId?: string;
}

export default function Production({ orders, formulas, materials, currentUser, onStartBatch, onFinishBatch, initialOrderId }: ProductionProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId || null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Focus on running batch if selected order changes
  React.useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId);
      if (order) {
        const runningBatch = order.batches?.find(b => b.status === 'running');
        if (runningBatch) {
          setActiveBatchId(runningBatch.id);
        }
      }
    }
  }, [selectedOrderId, orders]);
  const [actualWeights, setActualWeights] = useState<Record<string, string>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  // Finish Batch Modal State
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [batchNotes, setBatchNotes] = useState('');
  const [overrideWeight, setOverrideWeight] = useState('');

  const runningOrders = useMemo(() => {
    return orders.filter(o => o.status === 'run');
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  const selectedFormula = useMemo(() => {
    if (!selectedOrder) return null;
    return formulas.find(f => f.id === selectedOrder.fmId);
  }, [selectedOrder, formulas]);

  const activeBatch = useMemo(() => {
    if (!selectedOrder || !activeBatchId) return null;
    return selectedOrder.batches?.find(b => b.id === activeBatchId);
  }, [selectedOrder, activeBatchId]);

  const handleStartWeighing = async (batchId: string) => {
    if (!selectedOrderId) return;
    setIsStarting(true);
    try {
      await onStartBatch(selectedOrderId, batchId);
      setActiveBatchId(batchId);
      setActualWeights({});
    } catch (err) {
      alert('حدث خطأ أثناء بدء الباتشة');
    } finally {
      setIsStarting(false);
    }
  };

  const handleWeightChange = (materialId: string, val: string) => {
    setActualWeights(prev => ({ ...prev, [materialId]: val }));
  };

  const handleFinishBatch = () => {
    const total = Object.values(actualWeights).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    setOverrideWeight(total.toFixed(2));
    setBatchNotes('');
    setIsFinishModalOpen(true);
  };

  const confirmFinishBatch = async () => {
    if (!selectedOrderId || !activeBatchId) return;
    
    // Validate all weights are entered (optional, but good)
    const weights: Record<string, number> = {};
    Object.entries(actualWeights).forEach(([id, val]) => {
      weights[id] = parseFloat(val) || 0;
    });

    setIsFinishing(true);
    try {
      await onFinishBatch(
        selectedOrderId, 
        activeBatchId, 
        weights, 
        batchNotes, 
        overrideWeight ? parseFloat(overrideWeight) : undefined
      );
      setActiveBatchId(null);
      setActualWeights({});
      setIsFinishModalOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء إنهاء الباتشة');
    } finally {
      setIsFinishing(false);
    }
  };

  const calculateVariance = (target: number, actualStr: string) => {
    const actual = parseFloat(actualStr) || 0;
    if (target === 0) return 0;
    return ((actual - target) / target) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800">لوحة المشغل (Operator Dashboard)</h2>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm font-black text-sm text-slate-600 italic">
          <Clock className="w-4 h-4 text-brand-blue" />
          {new Date().toLocaleTimeString('ar-EG')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">أوامر قيد التشغيل</h3>
          <div className="space-y-3">
            {runningOrders.map(order => (
              <button
                key={order.id}
                onClick={() => { setSelectedOrderId(order.id); setActiveBatchId(null); }}
                className={cn(
                  "w-full text-right p-4 rounded-3xl border transition-all hover:shadow-md",
                  selectedOrderId === order.id 
                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" 
                    : "bg-white border-slate-100 text-slate-900"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-lg border",
                    selectedOrderId === order.id ? "border-white/20 text-white" : "border-slate-100 text-slate-400"
                  )}>
                    #{order.rn}
                  </span>
                  <div className="flex gap-1">
                     <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-lg",
                      selectedOrderId === order.id ? "bg-white/10 text-brand-blue-light" : "bg-blue-50 text-brand-blue"
                    )}>
                      {order.qty} طن
                    </span>
                  </div>
                </div>
                <div className="font-black text-sm mb-1">{order.fmName}</div>
                <div className={cn(
                  "text-[10px] font-bold",
                  selectedOrderId === order.id ? "text-white/60" : "text-slate-400"
                )}>
                  {order.client}
                </div>
                
                {order.batches && (
                  <div className="mt-4 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-green" 
                      style={{ width: `${(order.batches.filter(b => b.status === 'completed').length / Math.ceil((order.qty * 1000) / order.bw)) * 100}%` }}
                    />
                  </div>
                )}
              </button>
            ))}
            {runningOrders.length === 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center">
                <Package className="w-12 h-12 text-slate-100 mx-auto mb-2" />
                <p className="text-slate-400 font-bold text-sm">لا توجد أوامر جارية</p>
              </div>
            )}
          </div>
        </div>

        {/* Batch Execution Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!selectedOrder ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-12 text-center"
              >
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <Scale className="w-16 h-16 text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-400">اختر أمر إنتاج للبدء في الوزن</h3>
                <p className="text-sm text-slate-300 font-bold mt-2">سيتم عرض قائمة المكونات والباتشات فور الاختيار</p>
              </motion.div>
            ) : !activeBatch ? (
              <motion.div 
                key="batches"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">التشغيلة المختارة</h4>
                      <div className="text-xl font-black text-slate-800">{selectedOrder.fmName} | <span className="text-brand-blue">#{selectedOrder.rn}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase">وزن الباتشة</div>
                      <div className="text-xl font-black text-slate-800 tracking-tight">{selectedOrder.bw} <span className="text-xs font-bold text-slate-400">كجم</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const totalBatches = Math.ceil((selectedOrder.qty * 1000) / selectedOrder.bw);
                      const batches = Array.from({ length: totalBatches }, (_, i) => {
                        const existing = selectedOrder.batches?.find(b => b.batchNumber === i + 1);
                        return existing || { batchNumber: i + 1, status: 'pending' as const };
                      });

                      return batches.map(b => (
                        <div 
                          key={b.batchNumber}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            b.status === 'completed' ? "bg-emerald-50 border-emerald-100" : 
                            b.status === 'running' ? "bg-amber-50 border-amber-200 animate-pulse" : 
                            "bg-white border-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                              b.status === 'completed' ? "bg-emerald-200 text-emerald-700" : "bg-slate-100 text-slate-400"
                            )}>
                              {b.batchNumber}
                            </div>
                            <div>
                               <div className="text-xs font-black text-slate-700">باتش {b.batchNumber}</div>
                               <div className="text-[9px] font-bold text-slate-400">
                                 {b.status === 'completed' ? 'تم الإنهاء بنجاح' : b.status === 'running' ? 'جاري الآن...' : 'بانتظار البدء'}
                               </div>
                            </div>
                          </div>
                          
                          {b.status === 'pending' && (
                            <button 
                              onClick={() => {
                                const bid = (b as any).id || `temp-${b.batchNumber}`;
                                handleStartWeighing(bid);
                              }}
                              className="bg-brand-blue text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-brand-blue-dark transition-all shadow-lg shadow-brand-blue/20"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {b.status === 'completed' && <Check className="w-5 h-5 text-emerald-500" />}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="weighing"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden"
              >
                <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setActiveBatchId(null)} className="p-2 hover:bg-white/10 rounded-xl">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">جاري وزن الباتشة</div>
                      <div className="text-lg font-black">{selectedOrder.fmName} | باتش #{activeBatch.batchNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                       <div className="text-[10px] font-black text-white/40 uppercase">إجمالي الهدف</div>
                       <div className="text-xl font-black text-brand-blue-light">{selectedOrder.bw} <span className="text-xs font-bold">كجم</span></div>
                    </div>
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                       <Scale className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="overflow-hidden rounded-3xl border border-slate-100 italic">
                    <table className="w-full text-right not-italic">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-4 px-4">المادة الخام</th>
                          <th className="py-4 px-4 text-center">الوزن المستهدف (كجم)</th>
                          <th className="py-4 px-4 text-center">الوزن الفعلي المسجل</th>
                          <th className="py-4 px-4 text-center">الانحراف %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedFormula?.items.map(item => {
                          const variance = calculateVariance(item.w, actualWeights[item.mi] || '0');
                          const isWarning = Math.abs(variance) > 2;
                          const hasValue = !!actualWeights[item.mi];

                          return (
                            <tr key={item.mi} className={cn(
                              "transition-colors",
                              hasValue ? "bg-emerald-50/30" : "hover:bg-slate-50"
                            )}>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                    hasValue ? "bg-brand-green text-white" : "bg-slate-100 text-slate-300"
                                  )}>
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-black text-slate-800">{item.mn}</span>
                                    <span className="text-[9px] font-bold text-slate-400">{item.mc}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black text-sm">
                                  {item.w.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex justify-center">
                                  <input 
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-32 bg-slate-50 border-2 border-slate-100 focus:border-brand-blue outline-none rounded-xl px-4 py-3 text-center font-black text-lg transition-all"
                                    value={actualWeights[item.mi] || ''}
                                    onChange={e => handleWeightChange(item.mi, e.target.value)}
                                  />
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {actualWeights[item.mi] && (
                                  <div className={cn(
                                    "font-black text-sm px-2 py-1 rounded-lg inline-block",
                                    isWarning ? "bg-red-50 text-red-600 animate-pulse" : "bg-emerald-50 text-emerald-600"
                                  )}>
                                    {variance > 0 ? '+' : ''}{variance.toFixed(2)}%
                                    {isWarning && <AlertTriangle className="w-3 h-3 inline-block mr-1" />}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-8 flex items-center justify-between bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl shadow-slate-900/10">
                     <div>
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 text-right">إجمالي الوزن الفعلي</div>
                        <div className="text-3xl font-black tracking-tighter">
                          {Object.values(actualWeights).reduce((sum, v) => sum + (parseFloat(v) || 0), 0).toFixed(2)} 
                          <span className="text-sm font-bold text-white/30 mr-2">كجم</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                       {(currentUser?.role === 'admin' || currentUser?.role === 'quality') ? (
                         <button 
                           onClick={handleFinishBatch}
                           disabled={isFinishing}
                           className="bg-brand-green hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                         >
                           {isFinishing ? (
                             <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                           ) : (
                             <Check className="w-6 h-6" />
                           )}
                           إنهاء وزن الباتشة
                         </button>
                       ) : (
                         <div className="bg-white/10 px-6 py-4 rounded-2xl text-xs font-bold text-white/60">
                           في انتظار مراجعة الجودة...
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title="تأكيد إنهاء الباتشة (Finish Batch Confirmation)"
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase italic">الوزن المحسوب من المكونات</div>
              <div className="text-xl font-black text-slate-800">
                {Object.values(actualWeights).reduce((sum, v) => sum + (parseFloat(v) || 0), 0).toFixed(2)} كجم
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase italic">الهدف</div>
              <div className="text-xl font-black text-brand-blue">{selectedOrder?.bw} كجم</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500">الوزن الفعلي النهائي (Actual Weight kg)</label>
              <input 
                type="number" 
                step="0.01"
                className="input-field font-black text-xl text-center h-14"
                value={overrideWeight}
                onChange={e => setOverrideWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500">ملاحظات الباتشة (Notes)</label>
              <input 
                type="text" 
                className="input-field h-14"
                placeholder="أضف ملاحظاتك هنا..."
                value={batchNotes}
                onChange={e => setBatchNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={confirmFinishBatch}
              disabled={isFinishing}
              className="flex-1 bg-brand-green hover:bg-emerald-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-green/20"
            >
              {isFinishing ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-6 h-6" />
              )}
              تأكيد وحفظ البيانات
            </button>
            <button 
              onClick={() => setIsFinishModalOpen(false)}
              className="px-8 py-2 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-100 transition-all font-black"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
