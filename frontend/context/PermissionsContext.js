import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const DEFAULT_ADMIN_PERMS = {
  inventory:     { view: true, create: true, edit: true, delete: true },
  invoices:      { view: true, create: true, edit: true, delete: true },
  purchaseOrders:{ view: true, create: true, edit: true, delete: true },
  returnOrders:  { view: true, create: true, edit: true, delete: true },
  transfers:     { view: true, create: true, edit: true, delete: true },
  reports:       { view: true, create: true, edit: true, delete: true },
  masterData:    { view: true, create: true, edit: true, delete: true },
  settings:      { view: true, create: true, edit: true, delete: true },
  users:         { view: true, create: true, edit: true, delete: true },
  adjustments:   { view: true, create: true, edit: true, delete: true },
};

const DEFAULT_USER_PERMS = {
  inventory:     { view: true, create: false, edit: false, delete: false },
  invoices:      { view: true, create: true,  edit: false, delete: false },
  purchaseOrders:{ view: true, create: false, edit: false, delete: false },
  returnOrders:  { view: true, create: false, edit: false, delete: false },
  transfers:     { view: true, create: false, edit: false, delete: false },
  reports:       { view: true, create: false, edit: false, delete: false },
  masterData:    { view: true, create: false, edit: false, delete: false },
  settings:      { view: false, create: false, edit: false, delete: false },
  users:         { view: false, create: false, edit: false, delete: false },
  adjustments:   { view: true, create: false, edit: false, delete: false },
};

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return DEFAULT_USER_PERMS;
    if (user.role === 'admin') return DEFAULT_ADMIN_PERMS;
    // Merge user-specific permissions over defaults
    const base = { ...DEFAULT_USER_PERMS };
    const userPerms = user.permissions || {};
    Object.keys(base).forEach((mod) => {
      if (userPerms[mod]) {
        base[mod] = { ...base[mod], ...userPerms[mod] };
      }
    });
    return base;
  }, [user]);

  const can = (module, action = 'view') => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions[module]?.[action] === true;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <PermissionsContext.Provider value={{ permissions, can, isAdmin }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}
