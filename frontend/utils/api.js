import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Bearer token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('wms_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        const PUBLIC = ['/login', '/signup'];
        if (!PUBLIC.includes(window.location.pathname)) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const googleLogin = (credential) => api.post('/auth/google', { credential });

// ─── Generic CRUD factory ────────────────────────────────────────────────────
export const getCRUD = (resource) => ({
  getAll: (params) => api.get(`/${resource}`, { params }),
  getOne: (id) => api.get(`/${resource}/${id}`),
  create: (data) => api.post(`/${resource}`, data),
  update: (id, data) => api.put(`/${resource}/${id}`, data),
  remove: (id) => api.delete(`/${resource}/${id}`),
});

// ─── Dashboard & Notifications ───────────────────────────────────────────────
export const getDashboard = () => api.get('/dashboard');
export const getNotifications = () => api.get('/notifications');

// ─── Inventory ───────────────────────────────────────────────────────────────
export const getInventory = (params) => api.get('/inventory', { params });
export const createInventory = (data) => api.post('/inventory', data);
export const updateInventory = (id, data) => api.put(`/inventory/${id}`, data);
export const deleteInventory = (id) => api.delete(`/inventory/${id}`);
export const exportInventory = () => api.get('/inventory/export', { responseType: 'blob' });

// ─── Invoices ────────────────────────────────────────────────────────────────
export const getInvoices = (params) => api.get('/invoices', { params });
export const createInvoice = (data) => api.post('/invoices', data);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);
export const updateInvoiceStatus = (id, status) =>
  api.put(`/invoices/${id}/status`, { status });
export const getInvoiceQR = (id) => api.get(`/invoices/${id}/qr`);

// ─── Purchase Orders ─────────────────────────────────────────────────────────
export const getPurchaseOrders = (params) => api.get('/purchase-orders', { params });
export const createPO = (data) => api.post('/purchase-orders', data);
export const updatePO = (id, data) => api.put(`/purchase-orders/${id}`, data);
export const deletePO = (id) => api.delete(`/purchase-orders/${id}`);
export const approvePO = (id) => api.put(`/purchase-orders/${id}/approve`);
export const rejectPO = (id) => api.put(`/purchase-orders/${id}/reject`);

// ─── Reports ─────────────────────────────────────────────────────────────────
export const getReports = (type, params) => api.get(`/reports/${type}`, { params });
export const exportReport = (type, params) =>
  api.get(`/reports/${type}/export`, { params, responseType: 'blob' });

// ─── Settings ────────────────────────────────────────────────────────────────
export const getSettings = () => api.get('/settings');
export const updateCompany = (data) => api.put('/settings/company', data);
export const updateGeneralSettings = (data) => api.put('/settings/general', data);

// ─── Adjustments ─────────────────────────────────────────────────────────────
export const getAdjustments = (params) => api.get('/adjustments', { params });
export const createAdjustment = (data) => api.post('/adjustments', data);
export const getAdjustmentQR = (id) => api.get(`/adjustments/${id}/qr`);

// ─── Low Stock ───────────────────────────────────────────────────────────────
export const getLowStock = () => api.get('/inventory/low-stock');

// ─── Admin verify ─────────────────────────────────────────────────────────────
export const verifyAdminPassword = (password) => api.post('/auth/admin-verify', { password });

// ─── Profile ──────────────────────────────────────────────────────────────────
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/change-password', data);

// ─── Transfers ────────────────────────────────────────────────────────────────
export const getTransfers = (params) => api.get('/transfers', { params });
export const createTransfer = (data) => api.post('/transfers', data);
export const approveTransfer = (id) => api.put(`/transfers/${id}/approve`);
export const rejectTransfer = (id) => api.put(`/transfers/${id}/reject`);
export const deleteTransfer = (id) => api.delete(`/transfers/${id}`);

// ─── Payments ─────────────────────────────────────────────────────────────────
export const getPayments = (invoiceId) => api.get('/payments', { params: { invoice: invoiceId } });
export const createPayment = (data) => api.post('/payments', data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);

// ─── Audit logs ───────────────────────────────────────────────────────────────
export const getAuditLogs = (params) => api.get('/audit-logs', { params });

// ─── Email notifications ──────────────────────────────────────────────────────
export const triggerLowStockEmail = () => api.post('/notify/low-stock');
export const triggerOverdueEmail = () => api.post('/notify/overdue');

// ─── Reports export (Excel) ───────────────────────────────────────────────────
export const exportReportExcel = (type, params) =>
  api.get(`/reports/export/${type}`, { params, responseType: 'blob' });

// ─── Inventory bulk import ────────────────────────────────────────────────────
export const bulkImportInventory = (data) => api.post('/inventory/bulk-import', { items: data });

// User Management
export const getUsers = (params) => api.get('/users', { params });
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
