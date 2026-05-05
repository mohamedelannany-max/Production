import React, { useState } from 'react';
import { Users as UsersIcon, Plus, Shield, Trash2, Key, UserCheck, AlertCircle } from 'lucide-react';
import { User } from '../types';
import Modal from '../components/Modal';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface UsersPageProps {
  users: User[];
  setUsers: (u: User[]) => void;
  currentUser: User | null;
}

export default function UsersPage({ users, setUsers, currentUser }: UsersPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'operator' });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.name) {
      alert('يرجى ملء كافة الحقول');
      return;
    }

    if (users.find(u => u.username === newUser.username)) {
      alert('اسم المستخدم موجود بالفعل');
      return;
    }

    setUsers([...users, { ...newUser, id: Date.now().toString() } as User]);
    setIsModalOpen(false);
    setNewUser({ role: 'operator' });
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      alert('لا يمكنك حذف حسابك الحالي');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">إدارة المستخدمين</h2>
          <p className="text-xs text-slate-500 mt-1">إضافة وتعديل صلاحيات الوصول للنظام</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> 
          إضافة مستخدم جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u, i) => (
          <motion.div 
            key={u.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-brand-blue font-black text-xl">
                {u.name[0]}
              </div>
              <div>
                <h4 className="font-black text-slate-800">{u.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold">@{u.username}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                    u.role === 'admin' ? 'bg-brand-blue/10 text-brand-blue' : 
                    u.role === 'quality' ? 'bg-orange-100 text-orange-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {u.role === 'admin' ? 'مدير نظام' : u.role === 'quality' ? 'إدارة الجودة' : 'مشغل'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">الدور الأساسي</span>
                <span className="text-slate-800 font-black">
                  {u.role === 'admin' ? 'إدارة النظام الشاملة' : u.role === 'quality' ? 'الرقابة الفنية والجودة' : 'تشغيل خطوط الإنتاج'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">آخر نشاط</span>
                <span className={cn(
                  "font-black px-2 py-0.5 rounded-md",
                  u.lastLogin ? "text-brand-blue bg-brand-blue/5" : "text-slate-300"
                )}>
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'لم يسجل دخول'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                <Shield className="w-3 h-3 text-brand-blue" />
                {u.role === 'admin' ? 'صلاحيات كاملة' : 'صلاحيات محددة'}
              </div>
              <button 
                onClick={() => handleDelete(u.id)}
                className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-colors"
                title="حذف المستخدم"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {u.id === currentUser?.id && (
              <div className="absolute top-2 left-2">
                <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">أنت</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="إضافة مستخدم جديد"
        width="max-w-md"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500">الاسم الكامل *</label>
            <input 
              type="text" 
              className="input-field" 
              required 
              value={newUser.name || ''} 
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="مثال: محمد علي"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500">اسم المستخدم *</label>
            <input 
              type="text" 
              className="input-field" 
              required 
              value={newUser.username || ''} 
              onChange={e => setNewUser({ ...newUser, username: e.target.value })}
              placeholder="username"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500">كلمة المرور *</label>
            <input 
              type="password" 
              className="input-field" 
              required 
              value={newUser.password || ''} 
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500">نوع الصلاحية</label>
            <select 
              className="input-field" 
              value={newUser.role} 
              onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
            >
              <option value="operator">مشغل (صلاحيات محدودة)</option>
              <option value="quality">إدارة الجودة (صلاحية تقنية)</option>
              <option value="admin">مدير نظام (صلاحيات كاملة)</option>
            </select>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-2 text-[10px] text-amber-700 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            تأكد من إعطاء الصلاحيات الصحيحة لكل مستخدم لضمان سلامة البيانات.
          </div>

          <div className="pt-4 flex gap-3">
            <button type="submit" className="flex-1 btn-primary justify-center py-3">حفظ المستخدم</button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-100 transition-all">إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
