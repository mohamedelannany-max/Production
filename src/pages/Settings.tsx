import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Database, Globe, Key, Download, Upload, ShieldCheck, AlertCircle, Mail } from 'lucide-react';
import { AppConfig, User } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { toast } from 'react-toastify';

interface SettingsProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  currentUser: User | null;
  setUsers: (u: User[]) => void;
  users: User[];
  onBackup: () => void;
  onRestore: (data: any) => void;
}

export default function Settings({ config, setConfig, currentUser, setUsers, users, onBackup, onRestore }: SettingsProps) {
  const [passState, setPassState] = useState({ old: '', new: '', confirm: '' });

  const [gsUrlInput, setGsUrlInput] = useState(config.gsUrl || '');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    setConfig({
      ...config,
      co: formData.get('company') as string,
      fa: formData.get('factory') as string,
      gsId: formData.get('sheetId') as string,
      gsKey: formData.get('apiKey') as string,
      gsUrl: gsUrlInput,
      emailAlerts: formData.get('emailAlerts') === 'true',
      adminEmail: formData.get('adminEmail') as string,
    });
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  const testGoogleSync = async () => {
    if (!gsUrlInput) {
      toast.error('الرجاء إدخال رابط Google Script أولاً');
      return;
    }

    if (gsUrlInput && !gsUrlInput.startsWith('https://script.google.com/')) {
      toast.warning('⚠️ رابط غير صالح: يرجى التأكد من الرابط الصحيح من زر Deploy في Apps Script');
      return;
    }

    try {
      const res = await fetch('/api/test-gs', {
        method: 'POST',
        body: JSON.stringify({ url: gsUrlInput }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        toast.success('✅ تم الاتصال بنجاح! تحقق من جدول البيانات.');
      } else {
        const err = await res.json();
        toast.error(`❌ فشل الاتصال: ${err.error || 'خطأ مجهول'}`);
      }
    } catch (err) {
      toast.error('❌ فشل الاتصال بالخادم. تأكد من تشغيل البرنامج بشكل صحيح.');
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (passState.old !== currentUser.password) {
      toast.error('كلمة المرور الحالية غير صحيحة');
      return;
    }
    if (passState.new !== passState.confirm) {
      toast.error('كلمات المرور الجديدة غير متطابقة');
      return;
    }
    if (passState.new.length < 4) {
      toast.warn('كلمة المرور قصيرة جداً');
      return;
    }

    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: passState.new } : u);
    setUsers(updatedUsers);
    setPassState({ old: '', new: '', confirm: '' });
    toast.success('تم تغيير كلمة المرور بنجاح');
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        onRestore(data);
        toast.success('تم استعادة البيانات بنجاح، سيتم إعادة تحميل التطبيق');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        toast.error('ملف غير صالح');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800">الإعدادات النظام</h2>
        <div className="flex items-center gap-2 text-xs font-black text-slate-400">
           <ShieldCheck className="w-4 h-4" />
           بوابة الإدارة الآمنة
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Permissions Summary */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black flex items-center gap-2 text-slate-800 mb-6">
            <ShieldCheck className="w-5 h-5 text-brand-blue" />
            جدول صلاحيات المستخدمين (PMS Permission Matrix)
          </h3>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase italic">
                  <th className="p-4">الوظيفة / الميزة</th>
                  <th className="p-4 text-center">مدير النظام (Admin)</th>
                  <th className="p-4 text-center">مشغل إنتاج (Operator)</th>
                  <th className="p-4 text-center">إدارة الجودة (QC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px] font-black">
                <tr>
                  <td className="p-4 text-slate-600">عرض التقارير والمحلل الذكي</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-600">بدء أمر إنتاج جديد (Run Order)</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                  <td className="p-4 text-center text-slate-300">غير متاح</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-600">إدخال أوزان الباتشات الفعلي</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                  <td className="p-4 text-center text-orange-500">إدخال فقط</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-600">اعتماد وإغلاق الباتشة (Finish)</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                  <td className="p-4 text-center text-red-500">ممنوع</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-600">تزويد المخزن وتعديل التركيبات</td>
                  <td className="p-4 text-center text-green-500">متاح</td>
                  <td className="p-4 text-center text-red-500">ممنوع</td>
                  <td className="p-4 text-center text-red-500">ممنوع</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          {/* Company Settings */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50" />
            <form onSubmit={handleSaveConfig} className="relative z-10 space-y-6">
              <h3 className="text-sm font-black flex items-center gap-2 text-slate-800">
                <Globe className="w-5 h-5 text-brand-blue" />
                هوية المؤسسة
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">اسم الشركة</label>
                  <input name="company" className="input-field" defaultValue={config.co} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">اسم المصنع / الفرع</label>
                  <input name="factory" className="input-field" defaultValue={config.fa} required />
                </div>
              </div>

              <h3 className="text-sm font-black flex items-center gap-2 text-slate-800 pt-4 border-t border-slate-50">
                <Database className="w-5 h-5 text-brand-blue" />
                قاعدة البيانات السحابية (Google Sheets)
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400">Google Script Web App URL</label>
                    <a href="/GOOGLE_SHEETS_GUIDE.md" target="_blank" className="text-[8px] font-black text-brand-blue hover:underline">كيف أحصل على هذا الرابط؟</a>
                  </div>
                  <input 
                    name="gsUrl" 
                    className={cn(
                      "input-field font-mono text-[10px] dir-ltr text-left",
                      gsUrlInput && !gsUrlInput.startsWith('https://script.google.com/') ? "border-red-500 bg-red-50" : ""
                    )}
                    value={gsUrlInput} 
                    onChange={e => setGsUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec" 
                  />
                  {gsUrlInput && !gsUrlInput.startsWith('https://script.google.com/') && (
                    <div className="flex items-center gap-1 text-[9px] text-red-600 font-bold mt-1">
                      <AlertCircle className="w-3 h-3" />
                      هذا ليس رابط "تطبيق ويب" - يرجى مراجعة الدليل
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Sheet ID</label>
                  <input name="sheetId" className="input-field font-mono text-[10px]" defaultValue={config.gsId} placeholder="1xlV7lNu9IVsrMGn..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="submit" className="btn-primary justify-center py-3 shadow-lg shadow-brand-blue/20">
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
                <button type="button" onClick={testGoogleSync} className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 rounded-2xl text-xs font-black transition-all">
                  اختبار المزامنة
                </button>
              </div>
            </form>
          </div>

          {/* Email Notification Settings */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black flex items-center gap-2 text-slate-800">
              <Mail className="w-5 h-5 text-brand-blue" />
              تنبيهات البريد الإلكتروني
            </h3>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-xs font-black text-slate-800">تفعيل التنبيهات التلقائية</div>
                  <div className="text-[10px] text-slate-500">إرسال بريد إلكتروني عند انخفاض المخزون للحد الحرج</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="emailAlerts"
                    value="true"
                    className="sr-only peer" 
                    defaultChecked={config.emailAlerts}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                </label>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400">البريد الإلكتروني للمسؤول</label>
                <input 
                  name="adminEmail" 
                  type="email" 
                  className="input-field" 
                  defaultValue={config.adminEmail} 
                  placeholder="admin@dakahlia.net" 
                />
              </div>

              <button type="submit" className="btn-primary w-full justify-center py-3 bg-slate-800 hover:bg-slate-900 shadow-lg shadow-slate-900/10 border-none">
                <Save className="w-4 h-4" />
                حفظ إعدادات التنبيه
              </button>
            </form>
          </div>

          {/* Backup & Restore */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black flex items-center gap-2 text-slate-800">
              <Database className="w-5 h-5 text-emerald-600" />
              النسخ الاحتياطي والاستعادة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onBackup}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all text-emerald-700"
              >
                <Download className="w-6 h-6" />
                <span className="text-xs font-black">تحميل نسخة احتياطية</span>
              </button>
              <label className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-brand-blue/5 border border-brand-blue/10 hover:bg-brand-blue/10 transition-all text-brand-blue cursor-pointer">
                <Upload className="w-6 h-6" />
                <span className="text-xs font-black">استيراد بيانات JSON</span>
                <input type="file" className="hidden" accept=".json" onChange={handleFileRestore} />
              </label>
            </div>
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-[10px] text-red-700 font-bold leading-relaxed">
               <AlertCircle className="w-4 h-4 shrink-0" />
               تنبيه: استعادة البيانات ستحل محل كافة البيانات الحالية (الخامات، التركيبات، الأوامر). يرجى الحذر.
            </div>
          </div>
        </div>

        <div className="space-y-8">
           {/* Password Change */}
           <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-sm font-black flex items-center gap-2 text-slate-800">
                <Key className="w-5 h-5 text-brand-amber" />
                تغيير كلمة المرور الخاصة بك
              </h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">كلمة المرور الحالية</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    value={passState.old}
                    onChange={e => setPassState({ ...passState, old: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">كلمة المرور الجديدة</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    value={passState.new}
                    onChange={e => setPassState({ ...passState, new: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">تأكيد كلمة المرور الجديدة</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    value={passState.confirm}
                    onChange={e => setPassState({ ...passState, confirm: e.target.value })}
                    required 
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-3 bg-brand-amber hover:bg-amber-600 shadow-lg shadow-brand-amber/20 border-none">
                  تحديث كلمة المرور
                </button>
              </form>
           </div>

           {/* Stats Placeholder */}
           <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-blue-light/10 rounded-full blur-3xl -mb-32 -mr-32 group-hover:bg-brand-blue-light/20 transition-all duration-500" />
              <div className="relative z-10">
                <h3 className="text-lg font-black mb-2 italic">إحصائيات النظام</h3>
                <div className="grid grid-cols-2 gap-4 mt-6">
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="text-3xl font-black text-brand-blue-light">v4.0.0</div>
                      <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Version Entry</div>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="text-3xl font-black text-brand-green">100%</div>
                      <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Data Health</div>
                   </div>
                </div>
                <p className="text-[10px] text-white/30 mt-8 font-bold leading-relaxed border-t border-white/10 pt-4">
                  تم تطوير هذا النظام بواسطة دقهلية للدواجن جميع الحقوق محفوظة لعام 2026.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
