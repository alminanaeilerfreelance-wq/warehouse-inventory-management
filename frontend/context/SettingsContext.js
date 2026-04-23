import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings } from '../utils/api';

// ─── Translation dictionary ───────────────────────────────────────────────────
const translations = {
  en: {
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    invoices: 'Invoices',
    settings: 'Settings',
    reports: 'Reports',
    customers: 'Customers',
    suppliers: 'Suppliers',
    employees: 'Employees',
    brands: 'Brands',
    designs: 'Designs',
    categories: 'Categories',
    products: 'Products',
    zones: 'Zones',
    bins: 'Bins',
    racks: 'Racks',
    locations: 'Locations',
    warehouses: 'Warehouses',
    storeBranches: 'Store Branches',
    types: 'Types',
    units: 'Units',
    services: 'Services',
    expenses: 'Expenses',
    calendar: 'Calendar',
    purchaseOrders: 'Purchase Orders',
    logout: 'Logout',
    profile: 'Profile',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    update: 'Update',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    export: 'Export',
    print: 'Print',
    pdf: 'PDF',
    excel: 'Excel',
    import: 'Import',
    approve: 'Approve',
    reject: 'Reject',
    status: 'Status',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    subtotal: 'Subtotal',
    date: 'Date',
    notes: 'Notes',
    actions: 'Actions',
  },
  fil: {
    dashboard: 'Dashboard',
    inventory: 'Imbentaryo',
    invoices: 'Mga Invoice',
    settings: 'Mga Setting',
    reports: 'Mga Ulat',
    customers: 'Mga Customer',
    suppliers: 'Mga Supplier',
    employees: 'Mga Empleyado',
    brands: 'Mga Brand',
    designs: 'Mga Disenyo',
    categories: 'Mga Kategorya',
    products: 'Mga Produkto',
    zones: 'Mga Zone',
    bins: 'Mga Bin',
    racks: 'Mga Rack',
    locations: 'Mga Lokasyon',
    warehouses: 'Mga Bodega',
    storeBranches: 'Mga Sangay ng Tindahan',
    types: 'Mga Uri',
    units: 'Mga Yunit',
    services: 'Mga Serbisyo',
    expenses: 'Mga Gastos',
    calendar: 'Kalendaryo',
    purchaseOrders: 'Mga Purchase Order',
    logout: 'Mag-logout',
    profile: 'Profile',
    add: 'Magdagdag',
    edit: 'I-edit',
    delete: 'Burahin',
    update: 'I-update',
    save: 'I-save',
    cancel: 'Kanselahin',
    search: 'Maghanap',
    export: 'I-export',
    print: 'I-print',
    pdf: 'PDF',
    excel: 'Excel',
    import: 'Mag-import',
    approve: 'Aprubahan',
    reject: 'Tanggihan',
    status: 'Katayuan',
    quantity: 'Dami',
    price: 'Presyo',
    total: 'Kabuuan',
    subtotal: 'Subtotal',
    date: 'Petsa',
    notes: 'Mga Tala',
    actions: 'Mga Aksyon',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    inventory: 'المخزون',
    invoices: 'الفواتير',
    settings: 'الإعدادات',
    reports: 'التقارير',
    customers: 'العملاء',
    suppliers: 'الموردون',
    employees: 'الموظفون',
    brands: 'العلامات التجارية',
    designs: 'التصاميم',
    categories: 'الفئات',
    products: 'المنتجات',
    zones: 'المناطق',
    bins: 'الصناديق',
    racks: 'الرفوف',
    locations: 'المواقع',
    warehouses: 'المستودعات',
    storeBranches: 'فروع المتجر',
    types: 'الأنواع',
    units: 'الوحدات',
    services: 'الخدمات',
    expenses: 'المصروفات',
    calendar: 'التقويم',
    purchaseOrders: 'أوامر الشراء',
    logout: 'تسجيل الخروج',
    profile: 'الملف الشخصي',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    update: 'تحديث',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث',
    export: 'تصدير',
    print: 'طباعة',
    pdf: 'PDF',
    excel: 'Excel',
    import: 'استيراد',
    approve: 'موافقة',
    reject: 'رفض',
    status: 'الحالة',
    quantity: 'الكمية',
    price: 'السعر',
    total: 'الإجمالي',
    subtotal: 'المجموع الفرعي',
    date: 'التاريخ',
    notes: 'ملاحظات',
    actions: 'الإجراءات',
  },
};

const defaultCompany = {
  name: 'WMS',
  logo: '',
  slogan: '',
  address: '',
  phone: '',
  email: '',
};

const defaultSettings = {
  vatAmount: 0,
  vatType: 'exclusive',
  language: 'en',
  actionColors: {
    add: '#2196f3',
    edit: '#ff9800',
    delete: '#f44336',
    update: '#4caf50',
    print: '#607d8b',
    pdf: '#e91e63',
    excel: '#4caf50',
    import: '#9c27b0',
    calendar: '#00bcd4',
  },
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [company, setCompany] = useState(defaultCompany);
  const [settings, setSettings] = useState(defaultSettings);

  const fetchSettings = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wms_token') : null;
    if (!token) return; // skip on public pages — no token, no need to fetch
    try {
      const res = await getSettings();
      const payload = res.data.data || res.data;
      if (payload.company) setCompany((prev) => ({ ...prev, ...payload.company }));
      if (payload.settings || payload.general) {
        setSettings((prev) => ({ ...prev, ...(payload.settings || payload.general) }));
      }
    } catch {
      // silently fail — use defaults
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refreshSettings = useCallback(() => {
    return fetchSettings();
  }, [fetchSettings]);

  const t = useCallback(
    (key) => {
      const lang = settings.language || 'en';
      const dict = translations[lang] || translations.en;
      return dict[key] || translations.en[key] || key;
    },
    [settings.language]
  );

  return (
    <SettingsContext.Provider value={{ company, settings, refreshSettings, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
