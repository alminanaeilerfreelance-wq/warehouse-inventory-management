import React, { useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
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
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useReactToPrint } from 'react-to-print';
import { saveAs } from 'file-saver';

import AssessmentIcon from '@mui/icons-material/Assessment';
import HandymanIcon from '@mui/icons-material/Handyman';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import MainLayout from '../../components/Layout/MainLayout';
import ReportPrint from '../../components/Reports/ReportPrint';
import PageHeader from '../../components/Common/PageHeader';
import { getReports, exportReport } from '../../utils/api';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  Pending: 'warning',
  Open: 'info',
  Paid: 'success',
  Cancelled: 'default',
  Due: 'error',
};

export default function ServicesReportPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { company } = useSettings();
  const { user } = useAuth();

  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month'));
  const [dateTo, setDateTo] = useState(dayjs());
  const [branchId, setBranchId] = useState('');
  const [period, setPeriod] = useState('Daily');
  const [branches, setBranches] = useState([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  const [reportData, setReportData] = useState([]);
  const [summaryTotals, setSummaryTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  const printRef = useRef();
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const fetchBranches = useCallback(async () => {
    if (branchesLoaded) return;
    try {
      const res = await api.get('/store-branches');
      const d = res.data?.data || res.data;
      setBranches(Array.isArray(d) ? d : d?.items || []);
      setBranchesLoaded(true);
    } catch { /* silently fail */ }
  }, [branchesLoaded]);

  React.useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const totals = reportData.reduce(
    (acc, row) => ({
      qty: acc.qty + (row.qty || 0),
      price: acc.price + (row.price || row.unitPrice || 0),
      total: acc.total + (row.total || 0),
    }),
    { qty: 0, price: 0, total: 0 }
  );

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await getReports('services', {
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        branchId: branchId || undefined,
        period,
      });
      const d = res.data?.data || res.data;
      setReportData(Array.isArray(d) ? d : d?.items || d?.rows || []);
      setSummaryTotals(res.data?.totals || res.data?.data?.totals || null);
      setGenerated(true);
    } catch {
      enqueueSnackbar('Failed to generate report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await exportReport('services', {
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        branchId: branchId || undefined,
        period,
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'services-report.xlsx');
    } catch {
      enqueueSnackbar('Export failed', { variant: 'error' });
    }
  };

  const reportColumns = [
    { field: 'date', headerName: 'Date' },
    { field: 'invoiceNo', headerName: 'Invoice No' },
    { field: 'customer', headerName: 'Customer' },
    { field: 'service', headerName: 'Service' },
    { field: 'qty', headerName: 'Qty' },
    { field: 'price', headerName: 'Price' },
    { field: 'total', headerName: 'Total' },
    { field: 'status', headerName: 'Status' },
  ];

  const reportTotals = { qty: totals.qty, price: fmt(totals.price), total: fmt(totals.total) };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Services Report">
        <PageHeader
          title="Services Report"
          subtitle="Analyze service invoice performance and revenue"
          icon={<HandymanIcon />}
          color="#6a1b9a"
          breadcrumbs={[{ label: 'Reports' }, { label: 'Services Report' }]}
          actions={generated ? (
            <>
              <Button variant="contained" size="small" startIcon={<PrintIcon />} onClick={() => setPrintPreviewOpen(true)} sx={{ bgcolor: '#6a1b9a' }}>Print Preview</Button>
              <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={handleExportExcel}>Excel</Button>
            </>
          ) : null}
        />

        {/* Filter Bar */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Date From"
                value={dateFrom}
                onChange={setDateFrom}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Date To"
                value={dateTo}
                onChange={setDateTo}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Store Branch</InputLabel>
                <Select value={branchId} label="Store Branch" onChange={(e) => setBranchId(e.target.value)}>
                  <MenuItem value="">All Branches</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b._id || b.id} value={b._id || b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)}>
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                  <MenuItem value="Yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={3}>
              <Button
                variant="contained"
                startIcon={<AssessmentIcon />}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Generating…' : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {generated && (
          <>
            <Paper variant="outlined">
              <Box sx={{ p: 2, textAlign: 'center' }}>
                {company?.logo && (
                  <Box component="img" src={company.logo} alt="logo" sx={{ height: 60, mb: 1 }} />
                )}
                <Typography variant="h6" fontWeight={700}>{company?.name || 'Company Name'}</Typography>
                <Typography variant="body2" color="text.secondary">{company?.address}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Services Report — {dateFrom?.format('MMM DD, YYYY')} to {dateTo?.format('MMM DD, YYYY')}
                </Typography>
              </Box>
              <Divider />

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">No data found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {reportData.map((row, i) => (
                          <TableRow key={row._id || row.id || i} sx={{ bgcolor: i % 2 === 0 ? 'background.paper' : 'grey.50' }}>
                            <TableCell>{row.invoiceDate || row.date ? dayjs(row.invoiceDate || row.date).format('MMM DD, YYYY') : '—'}</TableCell>
                            <TableCell>{row.invoiceNo || row.invoice_no || '—'}</TableCell>
                            <TableCell>{row.customer?.name || row.customerName || '—'}</TableCell>
                            <TableCell>{row.service?.name || row.serviceName || '—'}</TableCell>
                            <TableCell>{row.qty || '—'}</TableCell>
                            <TableCell>{fmt(row.price || row.unitPrice)}</TableCell>
                            <TableCell>{fmt(row.total)}</TableCell>
                            <TableCell>
                              <Chip
                                label={row.paymentStatus || row.status || 'Pending'}
                                size="small"
                                color={STATUS_COLORS[row.paymentStatus || row.status] || 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'grey.200' }}>
                          <TableCell colSpan={4} sx={{ fontWeight: 700 }}>TOTALS</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{totals.qty}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.price)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.total)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Box sx={{ display: 'none' }}>
              <ReportPrint
                ref={printRef}
                data={reportData}
                totals={reportTotals}
                filters={{
                  dateFrom: dateFrom?.format('MMM DD, YYYY'),
                  dateTo: dateTo?.format('MMM DD, YYYY'),
                  branch: branches.find((b) => (b._id || b.id) === branchId)?.name || 'All',
                  period,
                }}
                reportType="Services Report"
                company={company}
                columns={reportColumns}
                summaryTotals={summaryTotals}
                preparedBy={user?.username || user?.customerName || user?.name || ''}
              />
            </Box>

            {/* Print Preview Dialog */}
            <Dialog open={printPreviewOpen} onClose={() => setPrintPreviewOpen(false)} maxWidth="md" fullWidth>
              <DialogTitle sx={{ bgcolor: '#6a1b9a', color: 'white', fontWeight: 700 }}>Services Report Preview</DialogTitle>
              <DialogContent dividers sx={{ maxHeight: '70vh', overflow: 'auto', bgcolor: '#f9f9f9', p: 3 }}>
                <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  {/* Company Header */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    {company?.logo && <Box component="img" src={company.logo} sx={{ maxHeight: 50, mb: 1 }} />}
                    <Typography variant="h6" fontWeight={700}>{company?.name || 'Company Name'}</Typography>
                    <Typography variant="caption" color="text.secondary">{company?.address || ''}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">TIN: {company?.tinNo || ''}</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {/* Report Title */}
                  <Typography variant="h6" fontWeight={700} sx={{ textAlign: 'center', mb: 0.5 }}>SERVICES REPORT</Typography>
                  <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', mb: 2 }}>
                    {dateFrom?.format('MMM DD, YYYY')} to {dateTo?.format('MMM DD, YYYY')}
                  </Typography>
                  
                  {branchId && (
                    <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', mb: 2, color: 'text.secondary' }}>
                      Branch: {branches.find((b) => (b._id || b.id) === branchId)?.name || 'All'}
                    </Typography>
                  )}

                  {/* Data Table */}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#ecf0f1' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Invoice No</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Branch</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Subtotal</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>VAT</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Total</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData?.map((row, idx) => (
                          <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <TableCell sx={{ fontSize: '0.85rem' }}>{dayjs(row.createdAt).format('MMM DD, YYYY')}</TableCell>
                            <TableCell sx={{ fontSize: '0.85rem' }}>{row.invoiceNo || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.85rem' }}>{typeof row.customer === 'string' ? row.customer : row.customer?.customerName || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.85rem' }}>{row.storeBranch?.name || '—'}</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.85rem' }}>₱{fmt(row.subtotal)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.85rem' }}>₱{fmt(row.vatAmount)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>₱{fmt(row.totalAmount)}</TableCell>
                            <TableCell sx={{ fontSize: '0.85rem' }}>
                              <Chip label={row.status} size="small" color={STATUS_COLORS[row.status] || 'default'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Totals Box */}
                  <Box sx={{ bgcolor: '#e3f2fd', p: 2, mt: 2, borderRadius: 1, textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Subtotal: ₱{fmt(summaryTotals?.subtotal)}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>VAT (12%): ₱{fmt(summaryTotals?.vat)}</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#1565c0' }}>Total: ₱{fmt(summaryTotals?.total)}</Typography>
                  </Box>

                  {/* Footer */}
                  <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd', fontSize: '0.75rem', color: 'text.secondary' }}>
                    <Typography variant="caption">Prepared By: {user?.username || user?.customerName || user?.name || 'System'}</Typography>
                    <Typography variant="caption" display="block">Generated: {dayjs().format('MMM DD, YYYY HH:mm')}</Typography>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Button onClick={() => setPrintPreviewOpen(false)} variant="outlined">Close</Button>
                <Button onClick={handlePrint} variant="contained" color="primary" startIcon={<PrintIcon />}>Print / PDF</Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </MainLayout>
    </LocalizationProvider>
  );
}
