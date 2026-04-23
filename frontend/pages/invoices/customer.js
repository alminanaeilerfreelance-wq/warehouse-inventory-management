import React, { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useReactToPrint } from 'react-to-print';

import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import InvoicePrint from '../../components/Invoice/InvoicePrint';
import api, {
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  getInvoiceQR,
  getInventory,
} from '../../utils/api';
import { useSettings } from '../../context/SettingsContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  Pending: 'warning',
  Open: 'info',
  Paid: 'success',
  Cancelled: 'default',
  Due: 'error',
};

const EMPTY_FORM = {
  customerId: '',
  employeeId: '',
  storeBranchId: '',
  invoiceDate: dayjs(),
  notes: '',
  items: [],
  discountType: 'fixed',
  discountAmount: 0,
  vatType: 'exclusive',
  paymentStatus: 'Pending',
  calendarDate: null,
  calendarTitle: '',
  enableCalendar: false,
};

export default function CustomerInvoicesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { company } = useSettings();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [storeBranches, setStoreBranches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewQR, setViewQR] = useState('');

  const printRef = useRef();
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const vatRate = 0.12;

  const fetchLookups = useCallback(async () => {
    try {
      const [cRes, eRes, bRes] = await Promise.all([
        api.get('/customers').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/store-branches').catch(() => ({ data: [] })),
      ]);
      const norm = (r) => { const d = r.data?.data || r.data; return Array.isArray(d) ? d : d?.items || []; };
      setCustomers(norm(cRes));
      setEmployees(norm(eRes));
      setStoreBranches(norm(bRes));
    } catch { /* silently fail */ }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await getInventory({ search: inventorySearch, limit: 50 });
      const d = res.data?.data || res.data;
      setInventoryItems(Array.isArray(d) ? d : d?.items || d?.inventory || []);
    } catch { /* silently fail */ }
  }, [inventorySearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoices({ page: page + 1, limit: rowsPerPage, search, type: 'customer' });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.invoices || [];
      setRows(items);
      setTotal(res.data?.total || res.data?.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load invoices', { variant: 'error' });
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
      customerId: row.customerId || row.customer?._id || '',
      employeeId: row.employeeId || row.employee?._id || '',
      storeBranchId: row.storeBranchId || row.storeBranch?._id || '',
      invoiceDate: row.invoiceDate ? dayjs(row.invoiceDate) : dayjs(),
      notes: row.notes || '',
      items: (row.items || []).map((it) => ({
        inventoryId: it.inventoryId || it.inventory?._id || '',
        productName: it.productName || it.product?.name || '',
        unitPrice: it.unitPrice || 0,
        qty: it.qty || 1,
      })),
      discountType: row.discountType || 'fixed',
      discountAmount: row.discountAmount || 0,
      vatType: row.vatType || 'exclusive',
      paymentStatus: row.paymentStatus || row.status || 'Pending',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  const addItemToCart = (inv) => {
    const id = inv._id || inv.id;
    setFormData((p) => {
      if (p.items.find((it) => it.inventoryId === id)) return p;
      return {
        ...p,
        items: [
          ...p.items,
          {
            inventoryId: id,
            productName: inv.product?.name || inv.productName || 'Unknown',
            unitPrice: inv.srp || 0,
            qty: 1,
          },
        ],
      };
    });
  };

  const updateItem = (idx, field, value) => {
    setFormData((p) => {
      const items = p.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
      return { ...p, items };
    });
  };

  const removeItem = (idx) => {
    setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const subtotal = formData.items.reduce((s, it) => s + (it.unitPrice * it.qty || 0), 0);
  const discount =
    formData.discountType === 'percent'
      ? subtotal * (Number(formData.discountAmount) / 100)
      : Number(formData.discountAmount) || 0;
  const afterDiscount = subtotal - discount;
  const vatAmount =
    formData.vatType === 'exclusive'
      ? afterDiscount * vatRate
      : afterDiscount - afterDiscount / (1 + vatRate);
  const grandTotal =
    formData.vatType === 'exclusive' ? afterDiscount + vatAmount : afterDiscount;

  const handleFormSubmit = () => {
    if (!formData.customerId) { enqueueSnackbar('Customer is required', { variant: 'warning' }); return; }
    setPendingAction('save');
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    if (pendingAction === 'save') {
      setFormLoading(true);
      try {
        const payload = {
          ...formData,
          invoiceDate: formData.invoiceDate?.toISOString(),
          calendarDate: formData.enableCalendar && formData.calendarDate ? formData.calendarDate.toISOString() : null,
          calendarTitle: formData.enableCalendar ? formData.calendarTitle : '',
          subtotal,
          discount,
          vatAmount,
          total: grandTotal,
          type: 'customer',
        };
        if (editId) {
          await updateInvoice(editId, payload);
          enqueueSnackbar('Invoice updated', { variant: 'success' });
        } else {
          await createInvoice(payload);
          enqueueSnackbar('Invoice created', { variant: 'success' });
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
        await deleteInvoice(deleteId);
        enqueueSnackbar('Invoice deleted', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
        throw err;
      }
    }
  };

  const handleViewInvoice = async (row) => {
    setViewInvoice(row);
    setViewOpen(true);
    try {
      const res = await getInvoiceQR(row._id || row.id);
      setViewQR(res.data?.qr || res.data?.data || '');
    } catch {
      setViewQR('');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateInvoiceStatus(id, status);
      enqueueSnackbar('Status updated', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Status update failed', { variant: 'error' });
    }
  };

  const columns = [
    { field: 'invoiceNo', headerName: 'Invoice No', renderCell: ({ row }) => row.invoiceNo || row.invoice_no || '—' },
    { field: 'customer', headerName: 'Customer', renderCell: ({ row }) => row.customer?.name || row.customerName || '—' },
    { field: 'employee', headerName: 'Employee', renderCell: ({ row }) => row.employee?.name || row.employeeName || '—' },
    { field: 'storeBranch', headerName: 'Branch', renderCell: ({ row }) => row.storeBranch?.name || row.branchName || '—' },
    { field: 'subtotal', headerName: 'Subtotal', renderCell: ({ row }) => fmt(row.subtotal) },
    { field: 'total', headerName: 'Total', renderCell: ({ row }) => fmt(row.total) },
    { field: 'vatAmount', headerName: 'VAT', renderCell: ({ row }) => fmt(row.vatAmount) },
    {
      field: 'paymentStatus',
      headerName: 'Status',
      renderCell: ({ row }) => {
        const status = row.paymentStatus || row.status || 'Pending';
        return (
          <Select
            size="small"
            value={status}
            onChange={(e) => handleStatusChange(row._id || row.id, e.target.value)}
            variant="standard"
            disableUnderline
            renderValue={(v) => (
              <Chip label={v} size="small" color={STATUS_COLORS[v] || 'default'} />
            )}
            sx={{ '& .MuiSelect-select': { p: 0 } }}
          >
            {Object.keys(STATUS_COLORS).map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        );
      },
    },
    { field: 'invoiceDate', headerName: 'Date', renderCell: ({ row }) => row.invoiceDate ? dayjs(row.invoiceDate).format('MMM DD, YYYY') : '—' },
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton size="small" color="info" onClick={() => handleViewInvoice(row)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="warning" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setDeleteId(row._id || row.id);
                setPendingAction('delete');
                setAdminOpen(true);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const nameOf = (arr, id) => arr.find((x) => (x._id || x.id) === id)?.name || '—';

  const invoiceStats = React.useMemo(() => ({
    total: total,
    paid: rows.filter(r => ['Paid','paid'].includes(r.paymentStatus || r.status)).length,
    pending: rows.filter(r => ['Pending','pending'].includes(r.paymentStatus || r.status)).length,
    overdue: rows.filter(r => ['Due','due','Overdue','overdue'].includes(r.paymentStatus || r.status)).length,
    totalAmount: rows.reduce((s, r) => s + (r.total || r.totalAmount || 0), 0),
  }), [rows, total]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Customer Invoices">
        <PageHeader
          title="Customer Invoices"
          subtitle="Manage and track all customer invoices"
          icon={<ReceiptIcon />}
          color="#1565c0"
          breadcrumbs={[{ label: 'Invoices' }, { label: 'Customer Invoices' }]}
          actions={
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              Create Invoice
            </Button>
          }
        />

        <Grid container spacing={2} mb={2.5}>
          {[
            { label: 'Total Invoices', value: invoiceStats.total, color: '#1565c0' },
            { label: 'Paid', value: invoiceStats.paid, color: '#2e7d32' },
            { label: 'Pending', value: invoiceStats.pending, color: '#ed6c02' },
            { label: 'Overdue / Due', value: invoiceStats.overdue, color: '#d32f2f' },
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

        {/* Create / Edit Invoice Dialog */}
        <FormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editId ? 'Edit Invoice' : 'Create Invoice'}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          maxWidth="lg"
        >
          <Grid container spacing={2} mt={0.5}>
            {/* Header Fields */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Customer</InputLabel>
                <Select value={formData.customerId} label="Customer" onChange={setF('customerId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {customers.map((c) => (
                    <MenuItem key={c._id || c.id} value={c._id || c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Store Branch</InputLabel>
                <Select value={formData.storeBranchId} label="Store Branch" onChange={setF('storeBranchId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {storeBranches.map((b) => (
                    <MenuItem key={b._id || b.id} value={b._id || b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Invoice Date"
                value={formData.invoiceDate}
                onChange={(v) => setFormData((p) => ({ ...p, invoiceDate: v }))}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                size="small"
                value={formData.notes}
                onChange={setF('notes')}
              />
            </Grid>

            {/* Calendar Sync */}
            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enableCalendar || false}
                    onChange={(e) => setFormData((p) => ({ ...p, enableCalendar: e.target.checked }))}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonthIcon fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight={500}>Add to Calendar</Typography>
                  </Box>
                }
              />
            </Grid>
            {formData.enableCalendar && (
              <>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Calendar Date"
                    value={formData.calendarDate}
                    onChange={(v) => setFormData((p) => ({ ...p, calendarDate: v }))}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Event Title"
                    fullWidth
                    size="small"
                    value={formData.calendarTitle}
                    onChange={(e) => setFormData((p) => ({ ...p, calendarTitle: e.target.value }))}
                    placeholder="e.g. Delivery Schedule"
                  />
                </Grid>
              </>
            )}

            {/* Cart Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Add Items
              </Typography>
              <TextField
                size="small"
                placeholder="Search inventory…"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                }}
                sx={{ mb: 1, minWidth: 260 }}
              />
              <Box sx={{ maxHeight: 140, overflowY: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {inventoryItems.map((inv) => (
                  <Box
                    key={inv._id || inv.id}
                    sx={{ p: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0.5 }}
                    onClick={() => addItemToCart(inv)}
                  >
                    <Typography variant="body2">
                      {inv.product?.name || inv.productName || 'Unknown'} — SRP: {fmt(inv.srp)} — Qty: {inv.quantity}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
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
                      formData.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{it.productName}</TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={it.unitPrice}
                              onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                              inputProps={{ min: 0, style: { width: 80 } }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={it.qty}
                              onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                              inputProps={{ min: 1, style: { width: 60 } }} />
                          </TableCell>
                          <TableCell>{fmt(it.unitPrice * it.qty)}</TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Totals */}
            <Grid item xs={12} sm={6}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Discount Type</InputLabel>
                    <Select value={formData.discountType} label="Discount Type" onChange={setF('discountType')}>
                      <MenuItem value="fixed">Fixed</MenuItem>
                      <MenuItem value="percent">Percent</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Discount Amount" type="number"
                    value={formData.discountAmount}
                    onChange={setF('discountAmount')} inputProps={{ min: 0 }} />
                </Stack>
                <FormControl size="small" sx={{ maxWidth: 200 }}>
                  <InputLabel>VAT Type</InputLabel>
                  <Select value={formData.vatType} label="VAT Type" onChange={setF('vatType')}>
                    <MenuItem value="inclusive">Inclusive</MenuItem>
                    <MenuItem value="exclusive">Exclusive</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ maxWidth: 200 }}>
                  <InputLabel>Payment Status</InputLabel>
                  <Select value={formData.paymentStatus} label="Payment Status" onChange={setF('paymentStatus')}>
                    {Object.keys(STATUS_COLORS).map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Subtotal</Typography>
                    <Typography variant="body2">{fmt(subtotal)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Discount</Typography>
                    <Typography variant="body2">-{fmt(discount)}</Typography>
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

        {/* View Invoice Dialog */}
        <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Invoice Details</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<PrintIcon />} onClick={handlePrint} variant="outlined">
                  Print
                </Button>
                <IconButton size="small" onClick={() => setViewOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Stack>
          </DialogTitle>
          <DialogContent>
            {viewInvoice && (
              <InvoicePrint ref={printRef} invoice={viewInvoice} company={company} qrValue={viewQR} />
            )}
          </DialogContent>
        </Dialog>

        <AdminConfirmDialog
          open={adminOpen}
          onClose={() => setAdminOpen(false)}
          onConfirm={handleAdminConfirm}
          title={pendingAction === 'delete' ? 'Delete Invoice' : 'Admin Confirmation'}
          description={
            pendingAction === 'delete'
              ? 'Enter admin password to delete this invoice.'
              : 'Enter admin password to save this invoice.'
          }
        />
      </MainLayout>
    </LocalizationProvider>
  );
}
