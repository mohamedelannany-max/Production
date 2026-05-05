import { AppConfig, User } from './types';

export const DEFAULT_USERS: User[] = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin', name: 'مدير النظام' },
  { id: '2', username: 'operator', password: 'op123', role: 'operator', name: 'مشغل' }
];

export const DEFAULT_CONFIG: AppConfig = {
  co: 'شركة الدقهلية للدواجن',
  fa: 'مصنع اعلاف دماص',
  de: 'إدارة الإنتاج',
  fc: 'PROD-P02-F05',
  fv: 'Ver.1',
  gsId: '1xlV7lNu9IVsrMGnTiOjWQg62sAqbmsmVkHtAJ5wv3MY',
  gsKey: 'AIzaSyAGtNpNM_Bh0BDH9Jrn56OqNlshKtT7hOA',
  gsUrl: 'https://script.google.com/macros/s/AKfycbxm14VPoLZD4t1g-u4LoinB3klTFpRyk3SeX-cSfMQ1OWryJctq26J8zTnupIOIKbB7/exec',
  autoSave: true
};

export const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const MATERIAL_TYPES = {
  raw: { label: 'خامات', color: 'brand-amber', bg: 'bg-amber-50', border: 'border-amber-200' },
  med: { label: 'أدوية', color: 'brand-purple', bg: 'bg-purple-50', border: 'border-purple-200' },
  add: { label: 'إضافات اعلاف', color: 'brand-teal', bg: 'bg-teal-50', border: 'border-teal-200' }
};
