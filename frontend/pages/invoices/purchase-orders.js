import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { QRCodeCanvas } from 'qrcode.react';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import api, {
  getPurchaseOrders,
  createPO,
  updatePO,
  deletePO,
  approvePO,
  rejectPO,
  getInventory,
} from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const EMPTY_FORM = {
  invoiceNo: '',
  supplierId: '',
  warehouseId: '',
  employeeId: '',
  notes: '',
  items: [],
  vatType: 'exclusive',
};

const vatRate = 0.12;

export default function PurchaseOrdersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [invSearch, setInvSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionTargetId, setActionTargetId] = useState(null);
  
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPO, setViewPO] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState('');
  const [companyDetails, setCompanyDetails] = useState(null);

  const fetchLookups = useCallback(async () => {
    try {
      const [sRes, wRes, eRes, cRes] = await Promise.all([
        api.get('/suppliers').catch(() => ({ data: [] })),
        api.get('/warehouses').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/settings').catch(() => ({ data: {} })),
      ]);
      const norm = (r) => { const d = r.data?.data || r.data; return Array.isArray(d) ? d : d?.items || []; };
      setSuppliers(norm(sRes));
      setWarehouses(norm(wRes));
      setEmployees(norm(eRes));
      const settings = cRes.data?.data || cRes.data || {};
      setCompanyDetails(settings.company || {});
    } catch (err) {
      console.error('Error loading lookups:', err);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await getInventory({ search: invSearch, limit: 50 });
      const d = res.data?.data || res.data;
      setInventoryItems(Array.isArray(d) ? d : d?.items || d?.inventory || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  }, [invSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPurchaseOrders({ page: page + 1, limit: rowsPerPage, search });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.purchaseOrders || [];
      setRows(items);
      setTotal(res.data?.total || res.data?.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load purchase orders', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, enqueueSnackbar]);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (formOpen) fetchInventory(); }, [formOpen, fetchInventory]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      invoiceNo: row.invoiceNo || '',
      supplierId: row.supplierId || row.supplier?._id || '',
      warehouseId: row.warehouseId || row.warehouse?._id || '',
      employeeId: row.employeeId || row.employee?._id || '',
      notes: row.notes || '',
      items: (row.items || []).map((it) => {
        // Extract product name safely - handle both string and object cases
        let productName = '';
        if (typeof it.productName === 'string') {
          productName = it.productName;
        } else if (it.product?.productName?.name) {
          productName = it.product.productName.name;
        } else if (it.product?.name) {
          productName = it.product.name;
        }
        return {
          inventoryId: it.inventoryId || it.product?._id || it.inventory?._id || '',
          productName: productName || 'Unknown',
          qty: it.qty || 1,
          price: it.price || 0,
        };
      }),
      vatType: row.vatType || 'exclusive',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  const addToCart = (inv) => {
    const id = inv._id || inv.id;
    let productNameStr = '';
    if (typeof inv.productName === 'string') {
      productNameStr = inv.productName;
    } else if (inv.productName?.name) {
      productNameStr = inv.productName.name;
    } else if (inv.product?.name) {
      productNameStr = inv.product.name;
    } else {
      productNameStr = 'Unknown';
    }
    setFormData((p) => {
      if (p.items.find((it) => it.inventoryId === id)) return p;
      return {
        ...p,
        items: [
          ...p.items,
          {
            inventoryId: id,
            productName: productNameStr,
            qty: 1,
            price: inv.cost || 0,
          },
        ],
      };
    });
  };

  const updateItem = (idx, field, value) => {
    setFormData((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
  };

  const removeItem = (idx) => {
    setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const subtotal = formData.items.reduce((s, it) => s + (it.price * it.qty || 0), 0);
  const vatAmount = formData.vatType === 'exclusive' ? subtotal * vatRate : subtotal - subtotal / (1 + vatRate);
  const grandTotal = formData.vatType === 'exclusive' ? subtotal + vatAmount : subtotal;

  const handleFormSubmit = () => {
    // Validate invoice number
    if (!formData.invoiceNo || formData.invoiceNo.trim().length === 0) {
      enqueueSnackbar('Invoice number is required', { variant: 'warning' });
      return;
    }

    // Validate supplier selection
    if (!formData.supplierId) {
      enqueueSnackbar('Supplier is required', { variant: 'warning' });
      return;
    }

    // Validate warehouse selection
    if (!formData.warehouseId) {
      enqueueSnackbar('Warehouse is required', { variant: 'warning' });
      return;
    }

    // Validate employee selection
    if (!formData.employeeId) {
      enqueueSnackbar('Employee is required', { variant: 'warning' });
      return;
    }

    // Validate at least one item in order
    if (!formData.items || formData.items.length === 0) {
      enqueueSnackbar('Purchase order must have at least one item', { variant: 'warning' });
      return;
    }

    // Validate all items have required fields
    for (let item of formData.items) {
      if (!item.productNameId || !item.unitPrice || !item.quantity) {
        enqueueSnackbar('All items must have product, unit price, and quantity', { variant: 'warning' });
        return;
      }
      if (isNaN(item.unitPrice) || Number(item.unitPrice) <= 0) {
        enqueueSnackbar('Unit price must be a valid positive number', { variant: 'warning' });
        return;
      }
      if (isNaN(item.quantity) || Number(item.quantity) <= 0) {
        enqueueSnackbar('Quantity must be a valid positive number', { variant: 'warning' });
        return;
      }
    }

    setPendingAction('save');
    setAdminOpen(true);
  };

  const triggerAction = (action, id) => {
    setPendingAction(action);
    setActionTargetId(id);
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    if (pendingAction === 'save') {
      setFormLoading(true);
      try {
        const payload = { ...formData, subtotal, vatAmount, total: grandTotal };
        if (editId) {
          await updatePO(editId, payload);
          enqueueSnackbar('Purchase order updated', { variant: 'success' });
        } else {
          await createPO(payload);
          enqueueSnackbar('Purchase order created', { variant: 'success' });
        }
        setFormOpen(false);
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
        throw err;
      } finally {
        setFormLoading(false);
      }
    } else if (pendingAction === 'delete') {
      try {
        await deletePO(actionTargetId);
        enqueueSnackbar('PO deleted', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
        throw err;
      }
    } else if (pendingAction === 'approve') {
      try {
        await approvePO(actionTargetId);
        enqueueSnackbar('Purchase order approved', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Approve failed', { variant: 'error' });
        throw err;
      }
    } else if (pendingAction === 'reject') {
      try {
        await rejectPO(actionTargetId);
        enqueueSnackbar('Purchase order rejected', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Reject failed', { variant: 'error' });
        throw err;
      }
    }
  };

  const handleViewPO = (row) => {
    setViewPO(row);
    setViewOpen(true);
  };

  const handleQRPO = (row) => {
    const qrValue = JSON.stringify({
      invoiceNo: row.invoiceNo || row.invoice_no,
      supplier: row.supplier?.name || row.supplierName,
      total: row.totalAmount || row.total,
      date: row.createdAt,
    });
    setQrData(qrValue);
    setQrOpen(true);
  };

  const columns = [
    { field: 'invoiceNo', headerName: 'Invoice No', renderCell: ({ row }) => row.invoiceNo || row.invoice_no || '—' },
    { field: 'supplier', headerName: 'Supplier', renderCell: ({ row }) => row.supplier?.name || row.supplierName || '—' },
    { field: 'warehouse', headerName: 'Warehouse', renderCell: ({ row }) => row.warehouse?.name || row.warehouseName || '—' },
    { field: 'employee', headerName: 'Employee', renderCell: ({ row }) => row.employee?.name || row.employeeName || '—' },
    { field: 'totalAmount', headerName: 'Total', renderCell: ({ row }) => fmt(row.totalAmount || row.total || 0) },
    {
      field: 'status',
      headerName: 'Status',
      renderCell: ({ row }) => {
        const s = row.status || 'pending';
        return <Chip label={s} size="small" color={STATUS_COLORS[s] || 'default'} />;
      },
    },
    {
      field: 'approved',
      headerName: 'Approved',
      renderCell: ({ row }) => (
        <Chip
          label={row.approved ? 'Yes' : 'No'}
          size="small"
          color={row.approved ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      renderCell: ({ row }) => row.createdAt ? dayjs(row.createdAt).format('MMM DD, YYYY') : '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View & Print">
            <IconButton size="small" color="info" onClick={() => handleViewPO(row)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View QR Code">
            <IconButton size="small" color="primary" onClick={() => handleQRPO(row)}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="warning" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isAdmin && row.status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <IconButton size="small" color="success" onClick={() => triggerAction('approve', row._id || row.id)}>
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton size="small" color="error" onClick={() => triggerAction('reject', row._id || row.id)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => triggerAction('delete', row._id || row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const poStats = React.useMemo(() => ({
    total: total,
    pending: rows.filter(r => ['pending'].includes(r.status)).length,
    approved: rows.filter(r => ['approved'].includes(r.status)).length,
    rejected: rows.filter(r => ['rejected'].includes(r.status)).length,
  }), [rows, total]);

  return (
    <MainLayout title="Purchase Orders">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage supplier purchase orders and approvals"
        icon={<ShoppingCartIcon />}
        color="#e65100"
        breadcrumbs={[{ label: 'Invoices' }, { label: 'Purchase Orders' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}>
            Create PO
          </Button>
        }
      />

      <Grid container spacing={2} mb={2.5}>
        {[
          { label: 'Total Orders', value: poStats.total, color: '#e65100' },
          { label: 'Pending', value: poStats.pending, color: '#ed6c02' },
          { label: 'Approved', value: poStats.approved, color: '#2e7d32' },
          { label: 'Rejected', value: poStats.rejected, color: '#d32f2f' },
        ].map(card => (
          <Grid item xs={6} sm={3} key={card.label}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, borderLeft: `4px solid ${card.color}` }}>
              <Typography variant="h6" fontWeight={700} color={card.color}>{card.value}</Typography>
              <Typography variant="caption" color="text.secondary">{card.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
      />

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit Purchase Order' : 'Create Purchase Order'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        maxWidth="lg"
      >
        <Grid container spacing={2} mt={0.5}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Invoice No (Receipt from Supplier)"
              fullWidth
              size="small"
              value={formData.invoiceNo}
              onChange={setF('invoiceNo')}
              placeholder="e.g., INV-2024-001"
              helperText="Enter the invoice/receipt number from supplier"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Supplier</InputLabel>
              <Select value={formData.supplierId} label="Supplier" onChange={setF('supplierId')}>
                <MenuItem value=""><em>None</em></MenuItem>
                {suppliers.map((s) => (
                  <MenuItem key={s._id || s.id} value={s._id || s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Warehouse</InputLabel>
              <Select value={formData.warehouseId} label="Warehouse" onChange={setF('warehouseId')}>
                <MenuItem value=""><em>None</em></MenuItem>
                {warehouses.map((w) => (
                  <MenuItem key={w._id || w.id} value={w._id || w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Employee</InputLabel>
              <Select value={formData.employeeId} label="Employee" onChange={setF('employeeId')}>
                <MenuItem value=""><em>None</em></MenuItem>
                {employees.map((e) => (
                  <MenuItem key={e._id || e.id} value={e._id || e.id}>{e.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Notes" fullWidth size="small" value={formData.notes} onChange={setF('notes')} />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Add Inventory Items</Typography>
            <TextField
              size="small"
              placeholder="Search inventory…"
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
              sx={{ mb: 1, minWidth: 260 }}
            />
            <Box sx={{ maxHeight: 140, overflowY: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
              {inventoryItems.map((inv) => {
                let productNameDisplay = '';
                if (typeof inv.productName === 'string') {
                  productNameDisplay = inv.productName;
                } else if (inv.productName?.name) {
                  productNameDisplay = inv.productName.name;
                } else if (inv.product?.name) {
                  productNameDisplay = inv.product.name;
                } else {
                  productNameDisplay = 'Unknown';
                }
                return (
                  <Box
                    key={inv._id || inv.id}
                    sx={{ p: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0.5 }}
                    onClick={() => addToCart(inv)}
                  >
                    <Typography variant="body2">
                      {productNameDisplay} — Cost: {fmt(inv.cost)} — Qty: {inv.quantity}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary">No items added</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.items.map((it, idx) => {
                      // Ensure productName is a string
                      const productName = typeof it.productName === 'string' ? it.productName : 'Unknown';
                      return (
                        <TableRow key={idx}>
                          <TableCell>{productName}</TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={it.qty}
                              onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                              inputProps={{ min: 1, style: { width: 60 } }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={it.price}
                              onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                              inputProps={{ min: 0, style: { width: 80 } }} />
                          </TableCell>
                          <TableCell>{fmt(it.price * it.qty)}</TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl size="small" sx={{ maxWidth: 200 }}>
              <InputLabel>VAT Type</InputLabel>
              <Select value={formData.vatType} label="VAT Type" onChange={setF('vatType')}>
                <MenuItem value="inclusive">Inclusive</MenuItem>
                <MenuItem value="exclusive">Exclusive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{fmt(subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">VAT (12%)</Typography>
                  <Typography variant="body2">{fmt(vatAmount)}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={700}>Grand Total</Typography>
                  <Typography variant="subtitle1" fontWeight={700}>{fmt(grandTotal)}</Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </FormDialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 700 }}>Purchase Order Document</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh', overflow: 'auto', bgcolor: '#f9f9f9', p: 3 }}>
          {viewPO && (
            <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {/* Company Header */}
              <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px solid #2c3e50' }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#2c3e50', mb: 0.5 }}>
                  {companyDetails?.name || 'Company Name'}
                </Typography>
                {companyDetails?.slogan && (
                  <Typography variant="caption" sx={{ color: '#7f8c8d', fontStyle: 'italic', display: 'block', mb: 1 }}>
                    {companyDetails.slogan}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  {companyDetails?.address || 'Address'}
                </Typography>
                {companyDetails?.contact && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    Contact: {companyDetails.contact}
                  </Typography>
                )}
                {companyDetails?.tinNo && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    TIN: {companyDetails.tinNo}
                  </Typography>
                )}
              </Box>

              {/* Document Title */}
              <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px solid #ecf0f1' }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#2c3e50', mb: 1 }}>
                  PURCHASE ORDER
                </Typography>
                <Stack direction="row" justifyContent="center" spacing={2}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Receipt No.</Typography>
                    <Typography variant="h6" sx={{ color: '#27ae60', fontWeight: 600 }}>
                      {viewPO.invoiceNo || viewPO.invoice_no}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Date</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {viewPO.createdAt ? dayjs(viewPO.createdAt).format('MMM DD, YYYY') : '—'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Two Column Layout */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#34495e', mb: 1 }}>FROM (SUPPLIER):</Typography>
                  <Box sx={{ pl: 2, borderLeft: '3px solid #3498db' }}>
                    <Typography variant="body2" fontWeight={600}>{viewPO.supplier?.name || viewPO.supplierName || '—'}</Typography>
                    {viewPO.supplier?.contact && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {viewPO.supplier.contact}
                      </Typography>
                    )}
                    {viewPO.supplier?.address && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {viewPO.supplier.address}
                      </Typography>
                    )}
                    {viewPO.supplier?.tinNo && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        TIN: {viewPO.supplier.tinNo}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#34495e', mb: 1 }}>TO (WAREHOUSE):</Typography>
                  <Box sx={{ pl: 2, borderLeft: '3px solid #27ae60' }}>
                    <Typography variant="body2" fontWeight={600}>{viewPO.warehouse?.name || viewPO.warehouseName || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Receiving Location
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Employee & Date */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#34495e', mb: 1 }}>REQUESTED BY:</Typography>
                  <Typography variant="body2">{viewPO.employee?.name || viewPO.employeeName || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#34495e', mb: 1 }}>STATUS:</Typography>
                  <Chip 
                    label={viewPO.status?.toUpperCase() || 'PENDING'}
                    color={viewPO.status === 'approved' ? 'success' : viewPO.status === 'rejected' ? 'error' : 'warning'}
                    size="small"
                    variant="outlined"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Items Table */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#2c3e50', mb: 2 }}>ORDERED ITEMS:</Typography>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#ecf0f1' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Product</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>Unit Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewPO.items && viewPO.items.length > 0 ? viewPO.items.map((item, idx) => {
                      let productName = '';
                      if (typeof item.productName === 'string') {
                        productName = item.productName;
                      } else if (item.product?.productName?.name) {
                        productName = item.product.productName.name;
                      } else if (item.product?.name) {
                        productName = item.product.name;
                      }
                      const itemQty = item.qty || item.quantity || 0;
                      const itemPrice = item.price || 0;
                      const itemTotal = itemQty * itemPrice;
                      return (
                        <TableRow key={idx} sx={{ '&:nth-of-type(even)': { bgcolor: '#f8f9fa' } }}>
                          <TableCell sx={{ py: 1.5 }}>{productName || '—'}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5, fontWeight: 600 }}>{itemQty}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>₱{fmt(itemPrice)}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5, fontWeight: 600 }}>₱{fmt(itemTotal)}</TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary' }}>No items</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>

              {/* Totals */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Box sx={{ width: '100%', maxWidth: 300, p: 2, bgcolor: '#ecf0f1', borderRadius: 1 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Subtotal:</Typography>
                      <Typography variant="body2">₱{fmt(viewPO.subtotal || 0)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">VAT (12%):</Typography>
                      <Typography variant="body2">₱{fmt(viewPO.vatAmount || 0)}</Typography>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#27ae60' }}>Total:</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#27ae60' }}>₱{fmt(viewPO.totalAmount || viewPO.total || 0)}</Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Box>

              {/* QR Code */}
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <QRCodeCanvas 
                    value={JSON.stringify({
                      invoiceNo: viewPO.invoiceNo || viewPO.invoice_no,
                      supplier: viewPO.supplier?.name || viewPO.supplierName,
                      total: viewPO.totalAmount || viewPO.total,
                    })}
                    size={120}
                    level="H"
                    includeMargin={true}
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>Purchase Order QR Code</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setViewOpen(false)} variant="outlined">Cancel</Button>
          <Button 
            onClick={() => window.print()} 
            variant="contained" 
            color="primary"
            startIcon={<PrintIcon />}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs">
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          {qrData && (
            <QRCodeCanvas 
              value={qrData}
              size={250}
              level="H"
              includeMargin={true}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title={
          pendingAction === 'delete' ? 'Delete Purchase Order' :
          pendingAction === 'approve' ? 'Approve Purchase Order' :
          pendingAction === 'reject' ? 'Reject Purchase Order' :
          'Admin Confirmation'
        }
        description={
          pendingAction === 'delete' ? 'Enter admin password to delete this PO.' :
          pendingAction === 'approve' ? 'Enter admin password to approve. Inventory will be updated automatically.' :
          pendingAction === 'reject' ? 'Enter admin password to reject this PO.' :
          'Enter admin password to save.'
        }
      />
    </MainLayout>
  );
}
