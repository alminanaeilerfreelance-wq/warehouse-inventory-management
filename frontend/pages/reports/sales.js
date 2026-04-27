import React, { useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
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
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useReactToPrint } from 'react-to-print';
import { saveAs } from 'file-saver';

import AssessmentIcon from '@mui/icons-material/Assessment';
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

export default function SalesReportPage() {
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
      subtotal: acc.subtotal + (row.subtotal || 0),
      vatAmount: acc.vatAmount + (row.vatAmount || 0),
      total: acc.total + (row.total || 0),
    }),
    { subtotal: 0, vatAmount: 0, total: 0 }
  );

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await getReports('sales', {
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
      const res = await exportReport('sales', {
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        branchId: branchId || undefined,
        period,
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'sales-report.xlsx');
    } catch {
      enqueueSnackbar('Export failed', { variant: 'error' });
    }
  };

  const reportColumns = [
    { field: 'date', headerName: 'Date' },
    { field: 'invoiceNo', headerName: 'Invoice No' },
    { field: 'customer', headerName: 'Customer' },
    { field: 'branch', headerName: 'Branch' },
    { field: 'subtotal', headerName: 'Subtotal' },
    { field: 'vatAmount', headerName: 'VAT' },
    { field: 'total', headerName: 'Total' },
    { field: 'status', headerName: 'Status' },
  ];

  const reportTotals = { subtotal: fmt(totals.subtotal), vatAmount: fmt(totals.vatAmount), total: fmt(totals.total) };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Sales Report">
        <PageHeader
          title="Sales Report"
          subtitle="Analyze sales performance and revenue across branches"
          icon={<AssessmentIcon />}
          color="#1565c0"
          breadcrumbs={[{ label: 'Reports' }, { label: 'Sales Report' }]}
          actions={generated ? (
            <>
              <Button variant="contained" size="small" startIcon={<PrintIcon />} onClick={() => setPrintPreviewOpen(true)} sx={{ bgcolor: '#1565c0' }}>Print Preview</Button>
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
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<AssessmentIcon />}
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? 'Generating…' : 'Generate Report'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {generated && (
          <>
            {/* Report Table */}
            <Paper variant="outlined">
              {/* Company Header */}
              <Box sx={{ p: 2, textAlign: 'center' }}>
                {company?.logo && (
                  <Box component="img" src={company.logo} alt="logo" sx={{ height: 60, mb: 1 }} />
                )}
                <Typography variant="h6" fontWeight={700}>{company?.name || 'Company Name'}</Typography>
                <Typography variant="body2" color="text.secondary">{company?.address}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sales Report — {dateFrom?.format('MMM DD, YYYY')} to {dateTo?.format('MMM DD, YYYY')}
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
                      <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>VAT</TableCell>
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
                            <TableCell>{row.storeBranch?.name || row.branchName || '—'}</TableCell>
                            <TableCell>{fmt(row.subtotal)}</TableCell>
                            <TableCell>{fmt(row.vatAmount)}</TableCell>
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
                        {/* Totals Row */}
                        <TableRow sx={{ bgcolor: 'grey.200' }}>
                          <TableCell colSpan={4} sx={{ fontWeight: 700 }}>TOTALS</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.subtotal)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.vatAmount)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.total)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Hidden Print Area */}
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
                reportType="Sales Report"
                company={company}
                columns={reportColumns}
                summaryTotals={summaryTotals}
                preparedBy={user?.username || user?.customerName || user?.name || ''}
              />
            </Box>

            {/* Print Preview Dialog */}
            <Dialog open={printPreviewOpen} onClose={() => setPrintPreviewOpen(false)} maxWidth="md" fullWidth>
              <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 700 }}>Sales Report Preview</DialogTitle>
              <DialogContent dividers sx={{ maxHeight: '70vh', overflow: 'auto', bgcolor: '#f9f9f9', p: 3 }}>
                <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  {/* Company Header */}
                  <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px solid #2c3e50' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#2c3e50', mb: 0.5 }}>
                      {company?.name || 'Company Name'}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      {company?.address || 'Address'}
                    </Typography>
                    {company?.tinNo && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        TIN: {company.tinNo}
                      </Typography>
                    )}
                  </Box>

                  {/* Report Title and Date Range */}
                  <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px solid #ecf0f1' }}>
                    <Typography variant="h5" fontWeight={700} sx={{ color: '#1565c0', mb: 1 }}>
                      SALES REPORT
                    </Typography>
                    <Typography variant="body2">
                      {dateFrom?.format('MMM DD, YYYY')} to {dateTo?.format('MMM DD, YYYY')}
                    </Typography>
                    {branchId && (
                      <Typography variant="body2">
                        Branch: {branches.find((b) => (b._id || b.id) === branchId)?.name}
                      </Typography>
                    )}
                  </Box>

                  {/* Report Data Table */}
                  <Table size="small" sx={{ mb: 2 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#ecf0f1' }}>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Invoice No</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Branch</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>Subtotal</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>VAT</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.map((row, idx) => (
                        <TableRow key={row._id || row.id || idx} sx={{ '&:nth-of-type(even)': { bgcolor: '#f8f9fa' } }}>
                          <TableCell sx={{ py: 1.5 }}>{row.invoiceDate || row.date ? dayjs(row.invoiceDate || row.date).format('MMM DD, YYYY') : '—'}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>{row.invoiceNo || row.invoice_no || '—'}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>{row.customer?.name || row.customerName || '—'}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>{row.storeBranch?.name || row.branchName || '—'}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>₱{fmt(row.subtotal)}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>₱{fmt(row.vatAmount)}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5, fontWeight: 600 }}>₱{fmt(row.total)}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Chip
                              label={row.paymentStatus || row.status || 'Pending'}
                              size="small"
                              color={STATUS_COLORS[row.paymentStatus || row.status] || 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow sx={{ bgcolor: '#e3f2fd', fontWeight: 700 }}>
                        <TableCell colSpan={4} sx={{ fontWeight: 700, py: 1.5 }}>TOTALS</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, py: 1.5 }}>₱{fmt(totals.subtotal)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, py: 1.5 }}>₱{fmt(totals.vatAmount)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, py: 1.5, color: '#1565c0' }}>₱{fmt(totals.total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Summary */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">Prepared By: <strong>{user?.username || user?.customerName || user?.name || '—'}</strong></Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2">Generated: <strong>{dayjs().format('MMM DD, YYYY HH:mm')}</strong></Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Button onClick={() => setPrintPreviewOpen(false)} variant="outlined">Close</Button>
                <Button onClick={handlePrint} variant="contained" color="primary" startIcon={<PrintIcon />}>
                  Print / PDF
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </MainLayout>
    </LocalizationProvider>
  );
}
