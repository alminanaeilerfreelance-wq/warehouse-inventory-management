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

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import HandymanIcon from '@mui/icons-material/Handyman';

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

// Helper to normalize status values from database (lowercase) to UI format (capitalized)
const normalizeStatus = (status) => {
  if (!status) return 'Pending';
  const statusLower = String(status).toLowerCase();
  const statusMap = {
    'pending': 'Pending',
    'open': 'Open',
    'paid': 'Paid',
    'cancelled': 'Cancelled',
    'due': 'Due',
  };
  return statusMap[statusLower] || 'Pending';
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
};

export default function ServiceInvoicesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { company } = useSettings();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeadlineAlert, setShowDeadlineAlert] = useState(false);
  const [upcomingInvoices, setUpcomingInvoices] = useState([]);

  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [storeBranches, setStoreBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');

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
    } catch (err) {
      console.error('Error loading lookups:', err);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/services', { params: { search: serviceSearch, limit: 50 } });
      const d = res.data?.data || res.data;
      setServices(Array.isArray(d) ? d : d?.items || d?.services || []);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  }, [serviceSearch]);

  const checkUpcomingDeadlines = useCallback((invoices) => {
    const now = dayjs();
    const upcoming = invoices.filter(inv => {
      if (!inv.invoiceDate) return false;
      const invoiceDate = dayjs(inv.invoiceDate);
      const daysUntilDue = invoiceDate.diff(now, 'day');
      const dueDateStatus = inv.paymentStatus || inv.status;
      // Show notification for invoices due within 7 days that are not yet paid
      return daysUntilDue > 0 && daysUntilDue <= 7 && !['Paid', 'paid'].includes(dueDateStatus);
    });
    if (upcoming.length > 0) {
      setUpcomingInvoices(upcoming);
      setShowDeadlineAlert(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage, search, invoiceType: 'service' };
      if (statusFilter) {
        params.paymentStatus = statusFilter.toLowerCase();
      }
      const res = await getInvoices(params);
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.invoices || [];
      setRows(items);
      setTotal(res.data?.total || res.data?.pagination?.total || items.length);
      // Check for upcoming deadlines
      if (page === 0) {
        checkUpcomingDeadlines(items);
      }
    } catch {
      enqueueSnackbar('Failed to load service invoices', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, enqueueSnackbar, checkUpcomingDeadlines]);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (formOpen) fetchServices(); }, [formOpen, fetchServices]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      customerId: row.customerId || row.customer?._id || '',
      employeeId: row.employeeId || row.employee?._id || '',
      storeBranchId: row.storeBranchId || row.storeBranch?._id || '',
      invoiceDate: row.invoiceDate ? dayjs(row.invoiceDate) : dayjs(),
      notes: row.notes || '',
      items: (row.items || []).map((it) => ({
        serviceId: it.serviceId || it.service?._id || '',
        serviceName: it.serviceName || it.service?.name || '',
        unitPrice: it.unitPrice || 0,
        qty: it.qty || 1,
      })),
      discountType: row.discountType || 'fixed',
      discountAmount: row.discountAmount || 0,
      vatType: row.vatType || 'exclusive',
      paymentStatus: normalizeStatus(row.paymentStatus || row.status || 'Pending'),
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  const addServiceToCart = (svc) => {
    const id = svc._id || svc.id;
    setFormData((p) => {
      if (p.items.find((it) => it.serviceId === id)) return p;
      return {
        ...p,
        items: [
          ...p.items,
          {
            serviceId: id,
            serviceName: svc.name || 'Unknown',
            unitPrice: svc.price || svc.srp || 0,
            qty: 1,
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
    if (formData.items.length === 0) { enqueueSnackbar('Add at least one service', { variant: 'warning' }); return; }
    setPendingAction('save');
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    if (pendingAction === 'save') {
      setFormLoading(true);
      try {
        // Normalize payment status to lowercase
        const normalizedStatus = formData.paymentStatus.toLowerCase();
        
        // Map items to backend schema: serviceId -> service, qty -> quantity, unitPrice -> price
        const mappedItems = formData.items.map(item => ({
          service: item.serviceId,
          itemName: item.serviceName,
          quantity: item.qty || 1,
          price: item.unitPrice || 0,
          subtotal: (item.unitPrice || 0) * (item.qty || 1),
        }));

        const payload = {
          customerId: formData.customerId,
          employeeId: formData.employeeId,
          storeBranchId: formData.storeBranchId,
          invoiceDate: formData.invoiceDate?.toISOString(),
          notes: formData.notes,
          items: mappedItems,
          paymentStatus: normalizedStatus,
          subtotal,
          discount,
          discountType: formData.discountType,
          vatAmount,
          vatType: formData.vatType,
          total: grandTotal,
          invoiceType: 'service',
        };
        if (editId) {
          await updateInvoice(editId, payload);
          enqueueSnackbar('Invoice updated', { variant: 'success' });
        } else {
          await createInvoice(payload);
          enqueueSnackbar('Invoice created', { variant: 'success' });
        }
        setFormOpen(false);
        setPage(0);
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
    // Normalize status for display
    const normalizedRow = {
      ...row,
      paymentStatus: normalizeStatus(row.paymentStatus || row.status),
    };
    setViewInvoice(normalizedRow);
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
      // Convert capitalized status to lowercase for API
      const lowercaseStatus = status.charAt(0).toLowerCase() + status.slice(1).toLowerCase();
      await updateInvoiceStatus(id, lowercaseStatus);
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
        const rawStatus = row.paymentStatus || row.status || 'Pending';
        const status = normalizeStatus(rawStatus);
        return (
          <Select
            size="small"
            value={status}
            onChange={(e) => handleStatusChange(row._id || row.id, e.target.value.toLowerCase())}
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

  const invoiceStats = React.useMemo(() => {
    // Normalize statuses for counting
    const normalizeForCompare = (status) => String(status || '').toLowerCase();
    return {
      total: total,
      paid: rows.filter(r => normalizeForCompare(r.paymentStatus || r.status) === 'paid').length,
      pending: rows.filter(r => normalizeForCompare(r.paymentStatus || r.status) === 'pending').length,
      overdue: rows.filter(r => ['due', 'overdue'].includes(normalizeForCompare(r.paymentStatus || r.status))).length,
      totalAmount: rows.reduce((s, r) => s + (r.total || r.totalAmount || 0), 0),
    };
  }, [rows, total]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Service Invoices">
        <PageHeader
          title="Service Invoices"
          subtitle="Manage and track all service invoices"
          icon={<HandymanIcon />}
          color="#6a1b9a"
          breadcrumbs={[{ label: 'Invoices' }, { label: 'Service Invoices' }]}
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

        {showDeadlineAlert && upcomingInvoices.length > 0 && (
          <Paper sx={{ p: 2, mb: 2.5, bgcolor: '#fff3cd', border: '1px solid #ffc107', borderRadius: 1 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box sx={{ color: '#856404', fontSize: '1.5rem' }}>⏰</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#856404' }}>
                  {upcomingInvoices.length} Invoice{upcomingInvoices.length !== 1 ? 's' : ''} Due Soon
                </Typography>
                <Typography variant="body2" sx={{ color: '#856404', mt: 0.5 }}>
                  {upcomingInvoices.slice(0, 3).map(inv => `${inv.customer?.name || 'Unknown'}`).join(', ')}
                  {upcomingInvoices.length > 3 ? ` and ${upcomingInvoices.length - 3} more` : ''}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setShowDeadlineAlert(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        )}

        <Paper sx={{ mb: 2, p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              placeholder="Search invoices…"
              size="small"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All Status</MenuItem>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          searchValue=""
          onSearchChange={() => {}}
        />

        <FormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editId ? 'Edit Service Invoice' : 'Create Service Invoice'}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          maxWidth="lg"
        >
          <Grid container spacing={2} mt={0.5}>
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

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Add Services</Typography>
              <TextField
                size="small"
                placeholder="Search services…"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                }}
                sx={{ mb: 1, minWidth: 260 }}
              />
              <Box sx={{ maxHeight: 140, overflowY: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {services.map((svc) => (
                  <Box
                    key={svc._id || svc.id}
                    sx={{ p: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0.5 }}
                    onClick={() => addServiceToCart(svc)}
                  >
                    <Typography variant="body2">
                      {svc.name} — Price: {fmt(svc.price || svc.srp || 0)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Service Name</TableCell>
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
                          <Typography variant="body2" color="text.secondary">No services added</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{it.serviceName}</TableCell>
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

        <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Service Invoice Details</Typography>
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
