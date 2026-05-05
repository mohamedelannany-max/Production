import React, { useState } from 'react';
import { Sparkles, Brain, TrendingUp, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Order, Material, Formula, InventoryItem } from '../types';
import Markdown from 'react-markdown';

interface AnalystProps {
  orders: Order[];
  materials: Material[];
  formulas: Formula[];
  inventory: InventoryItem[];
}

export default function Analyst({ orders, materials, formulas, inventory }: AnalystProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const dataSummary = {
        ordersCount: orders.length,
        recentOrders: orders.slice(-15).map(o => ({ 
          date: o.date, 
          fm: o.fmName, 
          qty: o.qty, 
          breed: o.breed, 
          age: o.ageWeek,
          batchStats: o.batches?.map(b => ({
            num: b.batchNumber,
            durationSec: b.endTime ? (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 1000 : null
          }))
        })),
        materials: materials.map(m => {
          const inv = inventory.find(i => i.id === m.id);
          return { name: m.name, stock: inv?.stock || 0, min: m.minStock || 0 };
        })
      };

      const prompt = `أنت خبير استراتيجي في تغذية مزارع "أمهات التسمين" (Broiler Breeders). 
بناءً على سجلات إنتاج المصنع المرفقة، قم بإعداد تقرير تحليل ذكي يركز على:
1. تحليل استهلاك المزارع بناءً على "السلالات" (Breed) وأعمار القطعان (Weeks).
2. تقييم كفاءة الإنتاج الزمني (Batch Efficiency) من خلال تحليل مدد إنتاج الباتشات وتقديم نصائح لزيادة سرعة الدوران.
3. تقييم مدى ملاءمة التركيبات المنفذة للمرحلة العمرية (مثلاً Pre-peak vs Post-peak).
3. توقعات الطلب المستقبلي لكل سلالة بناءً على نمو الأعمار المسجلة.
4. تنبيهات المخزون الحرجة للمواد الخام الخاصة بتركيبات الأمهات (مثل الكالسيوم والفيتامينات المركزية).
5. اقتراحات لتحسين جودة الإنتاج لتقليل الفاقد وزيادة كفاءة التحويل الغذائي للقطعان.

البيانات:
${JSON.stringify(dataSummary, null, 2)}

يرجى كتابة التحليل باللغة العربية بأسلوب احترافي جداً، مع تقسيم الفقرات وتوجيه نصائح تقنية دقيقة لمزارع الأمهات.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAnalysis(response.text || 'فشل في توليد التحليل');
    } catch (error) {
      console.error(error);
      setAnalysis('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. يرجى التأكد من إعداد مفتاح API بشكل صحيح.');
    } finally {
      setLoading(false);
    }
  };

  const farmAnalysis = React.useMemo(() => {
    const data: Record<string, { totalFeed: number, batches: number, avgAge: number }> = {};
    orders.forEach(o => {
      const key = o.client || 'عام';
      if (!data[key]) data[key] = { totalFeed: 0, batches: 0, avgAge: o.ageWeek || 0 };
      data[key].totalFeed += (o.qty || 0);
      data[key].batches += (o.batches?.length || 0);
    });
    return Object.entries(data).map(([name, stats]) => ({
      name,
      feed: stats.totalFeed,
      batches: stats.batches,
      age: stats.avgAge,
      efficiency: stats.totalFeed > 0 ? (stats.batches / stats.totalFeed).toFixed(2) : 0
    }));
  }, [orders]);

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue-light/20 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20">
            <Sparkles className="w-10 h-10 text-brand-blue-light" />
          </div>
          <div className="flex-1 text-center md:text-right">
            <h2 className="text-3xl font-black italic tracking-tight">المحلل الذكي (PMS AI)</h2>
            <p className="text-white/60 font-bold mt-2 max-w-xl">
              تستخدم هذه الميزة ذكاء Gemini لتحليل بياناتك التاريخية وتقديم رؤى مستقبلية تدعم اتخاذ القرار.
            </p>
          </div>
          <button 
            onClick={runAnalysis}
            disabled={loading}
            className="btn-primary py-4 px-8 text-lg bg-brand-blue-light hover:bg-blue-400 border-none shadow-xl shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
            {loading ? 'جاري التحليل...' : 'بدء التحليل الآن'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-800">تحليل استهلاك العملاء (Farm Intake Analysis)</h3>
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <TrendingUp className="w-4 h-4 text-brand-blue" />
            </div>
          </div>
          <div className="space-y-4">
            {farmAnalysis.map((farm, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-brand-blue">
                    {farm.name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800">{farm.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold">عمر القطيع: {farm.age} أسبوع</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-black text-brand-blue">{(farm.feed).toFixed(1)} طن</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">إجمالي العلف</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {[
            { icon: AlertTriangle, title: 'إدارة المخاطر', desc: 'تحديد المواد الحرجة التي يقترب رصيدها من النفاد بناءً على الاستهلاك.' },
            { icon: Lightbulb, title: 'توصيات ذكية', desc: 'نصائح لتحسين جدولة التشغيل وتوفير الطاقة في المصنع.' }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-brand-blue" />
              </div>
              <h4 className="font-black text-slate-800 mb-2">{feature.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-bold">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {analysis && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-50">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-black text-slate-800">نتيجة التحليل الشامل</h3>
          </div>
          <div className="markdown-body prose prose-slate max-w-none text-right italic leading-loose">
            <Markdown>{analysis}</Markdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}
