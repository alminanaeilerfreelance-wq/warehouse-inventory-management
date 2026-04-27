import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptIcon from '@mui/icons-material/Receipt';

import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import MainLayout from '../../components/Layout/MainLayout';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import { getInvoices, getPayments, createPayment, deletePayment } from '../../utils/api';

const INVOICE_STATUS_COLORS = {
  paid: 'success',
  open: 'warning',
  pending: 'warning',
  overdue: 'error',
  due: 'error',
  draft: 'default',
  cancelled: 'default',
};

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'GCash', 'Maya', 'Check', 'Other'];

const fmtCurrency = (val) =>
  typeof val === 'number'
    ? val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

function AddPaymentDialog({ open, invoice, onClose, onSave }) {
  const { enqueueSnackbar } = useSnackbar();
  const balance = (invoice?.total || invoice?.totalAmount || 0) - (invoice?.totalPaid || 0);
  const [form, setForm] = useState({ amount: '', method: 'Cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      const remaining = balance > 0 ? balance : 0;
      setForm({ amount: remaining.toFixed(2), method: 'Cash', reference: '', notes: '' });
    }
  }, [open, invoice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { enqueueSnackbar('Enter a valid amount', { variant: 'warning' }); return; }
    setSaving(true);
    try {
      await createPayment({
        invoice: invoice._id || invoice.id,
        amount,
        method: form.method,
        reference: form.reference,
        notes: form.notes,
      });
      enqueueSnackbar('Payment recorded successfully', { variant: 'success' });
      onSave();
      onClose();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to record payment', { variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Add Payment — {invoice?.invoiceNumber || invoice?.number || ''}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              fullWidth
              size="small"
              inputProps={{ min: 0, step: 0.01 }}
              helperText={`Balance: ₱${fmtCurrency(balance)}`}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Method</InputLabel>
              <Select name="method" value={form.method} onChange={handleChange} label="Payment Method">
                {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Reference No."
              name="reference"
              value={form.reference}
              onChange={handleChange}
              fullWidth
              size="small"
              placeholder="Check no., transaction ID, etc."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <PaymentsIcon />}
        >
          Record Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await getInvoices({ limit: 100 });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.invoices || [];
      setInvoices(items);
    } catch (_) {
      enqueueSnackbar('Failed to load invoices', { variant: 'error' });
    } finally { setLoadingInvoices(false); }
  }, [enqueueSnackbar]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const fetchPayments = useCallback(async (invoice) => {
    if (!invoice) return;
    setLoadingPayments(true);
    try {
      const res = await getPayments(invoice._id || invoice.id);
      const data = res.data.data || res.data;
      setPayments(Array.isArray(data) ? data : data.payments || data.items || []);
    } catch (_) {
      enqueueSnackbar('Failed to load payments', { variant: 'error' });
    } finally { setLoadingPayments(false); }
  }, [enqueueSnackbar]);

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    fetchPayments(invoice);
  };

  const handlePaymentSaved = () => {
    fetchPayments(selectedInvoice);
    fetchInvoices();
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;
    try {
      await deletePayment(selectedPayment._id || selectedPayment.id);
      enqueueSnackbar('Payment deleted', { variant: 'success' });
      setDeleteConfirmOpen(false);
      setSelectedPayment(null);
      fetchPayments(selectedInvoice);
      fetchInvoices();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const total = selectedInvoice?.total || selectedInvoice?.totalAmount || 0;
  const balance = total - (selectedInvoice?.totalPaid ?? totalPaid);

  return (
    <MainLayout title="Invoice Payments">
      <PageHeader
        title="Invoice Payments"
        subtitle="Record and manage invoice payment transactions"
        icon={<PaymentsIcon />}
        color="#2e7d32"
        breadcrumbs={[{ label: 'Invoices' }, { label: 'Payments' }]}
      />

      <Grid container spacing={3}>
        {/* Left: Invoice List */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>Invoices</Typography>
            </Box>
            <Divider />
            {loadingInvoices ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Balance</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">No invoices</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv) => {
                        const ivTotal = inv.total || inv.totalAmount || 0;
                        const ivPaid = inv.totalPaid || 0;
                        const ivBalance = ivTotal - ivPaid;
                        const isSelected = (selectedInvoice?._id || selectedInvoice?.id) === (inv._id || inv.id);
                        return (
                          <TableRow
                            key={inv._id || inv.id}
                            hover
                            selected={isSelected}
                            onClick={() => handleSelectInvoice(inv)}
                            sx={{ cursor: 'pointer', bgcolor: isSelected ? 'primary.50' : undefined }}
                          >
                            <TableCell sx={{ fontWeight: 600 }}>
                              {inv.invoiceNumber || inv.number || '—'}
                            </TableCell>
                            <TableCell>{inv.customerName || inv.customer?.name || '—'}</TableCell>
                            <TableCell>₱{fmtCurrency(ivTotal)}</TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color={ivBalance > 0 ? 'error.main' : 'success.main'}
                              >
                                ₱{fmtCurrency(ivBalance)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={inv.status || 'open'}
                                size="small"
                                color={INVOICE_STATUS_COLORS[inv.status?.toLowerCase()] || 'default'}
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Right: Payment History */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentsIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>
                  {selectedInvoice ? `Payments — ${selectedInvoice.invoiceNumber || selectedInvoice.number}` : 'Select an Invoice'}
                </Typography>
              </Box>
              {selectedInvoice && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setAddOpen(true)}
                >
                  Add Payment
                </Button>
              )}
            </Box>
            <Divider />

            {selectedInvoice && (
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Total</Typography>
                    <Typography variant="subtitle2" fontWeight={700}>₱{fmtCurrency(total)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Total Paid</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color="success.main">
                      ₱{fmtCurrency(selectedInvoice?.totalPaid ?? totalPaid)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Balance</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color={balance > 0 ? 'error.main' : 'success.main'}>
                      ₱{fmtCurrency(balance)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Divider />

            {!selectedInvoice ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: 'text.disabled' }}>
                <ReceiptIcon sx={{ fontSize: 64, mb: 1 }} />
                <Typography variant="body2">Click on an invoice to view payments</Typography>
              </Box>
            ) : loadingPayments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>By</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">No payments recorded</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p, idx) => (
                        <TableRow key={p._id || p.id || idx} hover>
                          <TableCell>{p.invoice?.invoiceNo || p.invoiceNo || p.invoice?.number || '—'}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>
                            ₱{fmtCurrency(p.amount)}
                          </TableCell>
                          <TableCell>
                            <Chip label={p.method || '—'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{p.reference || p.referenceNo || '—'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                            {p.createdAt ? dayjs(p.createdAt).format('MMM DD, YYYY') : '—'}
                          </TableCell>
                          <TableCell>{p.recordedBy?.name || p.user?.name || '—'}</TableCell>
                          <TableCell>
                            <Tooltip title="Delete payment">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => { setSelectedPayment(p); setDeleteConfirmOpen(true); }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <AddPaymentDialog
        open={addOpen}
        invoice={selectedInvoice}
        onClose={() => setAddOpen(false)}
        onSave={handlePaymentSaved}
      />

      <AdminConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This action cannot be undone."
        onConfirm={handleDeletePayment}
        onClose={() => { setDeleteConfirmOpen(false); setSelectedPayment(null); }}
      />
    </MainLayout>
  );
}
