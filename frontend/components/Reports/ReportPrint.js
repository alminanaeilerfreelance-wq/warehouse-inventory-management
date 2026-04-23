import React, { forwardRef } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { QRCodeCanvas } from 'qrcode.react';
import dayjs from 'dayjs';

/**
 * ReportPrint
 *
 * Props:
 *   data        {Array}   — rows of report data
 *   totals      {object}  — key-value totals matching column fields
 *   filters     {object}  — { dateFrom, dateTo, branch|supplier|... }
 *   reportType  {string}  — e.g. "Sales Report"
 *   company     {object}  — company info { name, logo, address, phone, contactNumber, tinNo, slogan, licenseNo }
 *   columns     {Array<{ field, headerName }>}
 *   summaryTotals {object} — { count, subtotal, vatAmount, total } for summary boxes
 *   preparedBy  {string}  — name of the person who generated the report
 */
const ReportPrint = forwardRef(function ReportPrint(
  {
    data = [],
    totals = {},
    filters = {},
    reportType = 'Report',
    company = {},
    columns = [],
    summaryTotals = null,
    preparedBy = '',
  },
  ref
) {
  const generatedDate = dayjs().format('MMMM DD, YYYY HH:mm');

  const qrString = JSON.stringify({
    report: reportType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    total: totals.total,
    generated: generatedDate,
  });

  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getCellValue = (row, field) => {
    if (field === 'date' || field === 'invoiceDate') {
      const v = row.invoiceDate || row.date || row.createdAt;
      return v ? dayjs(v).format('MMM DD, YYYY') : '—';
    }
    if (field === 'invoiceNo') return row.invoiceNo || row.invoice_no || '—';
    if (field === 'customer') return row.customer?.name || row.customerName || '—';
    if (field === 'supplier') return row.supplier?.name || row.supplierName || '—';
    if (field === 'warehouse') return row.warehouse?.name || row.warehouseName || '—';
    if (field === 'branch') return row.storeBranch?.name || row.branchName || '—';
    if (field === 'service') return row.service?.name || row.serviceName || '—';
    if (field === 'employee') return row.employee?.name || row.employeeName || '—';
    if (field === 'status') return row.paymentStatus || row.status || '—';
    if (field === 'approved') return row.approved ? 'Yes' : 'No';
    if (field === 'itemsCount') return row.itemsCount || row.items?.length || 0;
    const v = row[field];
    if (typeof v === 'number') {
      return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return v ?? '—';
  };

  const summaryBoxes = summaryTotals
    ? [
        { label: 'Total Transactions', value: summaryTotals.count ?? data.length },
        { label: 'Total Subtotal', value: `₱${fmt(summaryTotals.subtotal)}` },
        { label: 'Total VAT', value: `₱${fmt(summaryTotals.vatAmount)}` },
        { label: 'Grand Total', value: `₱${fmt(summaryTotals.total)}`, bold: true },
      ]
    : null;

  return (
    <Box
      ref={ref}
      sx={{
        p: 4,
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#000',
        bgcolor: '#fff',
        '@media print': { p: 2 },
      }}
    >
      {/* Company Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {company?.logo && (
            <Box
              component="img"
              src={company.logo}
              alt="logo"
              sx={{ height: 60, objectFit: 'contain' }}
            />
          )}
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#1565c0' }}>
              {company?.name || 'WMS Pro'}
            </Typography>
            {company?.slogan && (
              <Typography variant="body2" color="text.secondary">{company.slogan}</Typography>
            )}
            <Typography variant="caption" display="block">{company?.address || ''}</Typography>
            {(company?.contactNumber || company?.phone) && (
              <Typography variant="caption" display="block">
                Tel: {company.contactNumber || company.phone}
              </Typography>
            )}
            {company?.tinNo && (
              <Typography variant="caption" display="block">TIN: {company.tinNo}</Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <QRCodeCanvas value={qrString} size={80} />
          <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: 9, mt: 0.5 }}>
            Scan to verify
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2, borderColor: '#1565c0', borderWidth: 2 }} />

      {/* Report Title & Filter Summary */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700} textTransform="uppercase">
          {reportType}
        </Typography>
        <Stack direction="row" justifyContent="center" spacing={2} mt={0.5} flexWrap="wrap">
          {filters.dateFrom && filters.dateTo && (
            <Typography variant="body2" sx={{ fontSize: 11 }}>
              {filters.dateFrom} — {filters.dateTo}
            </Typography>
          )}
          {filters.branch && filters.branch !== 'All' && (
            <Typography variant="body2" sx={{ fontSize: 11 }}>
              <strong>Branch:</strong> {filters.branch}
            </Typography>
          )}
          {filters.supplier && filters.supplier !== 'All' && (
            <Typography variant="body2" sx={{ fontSize: 11 }}>
              <strong>Supplier:</strong> {filters.supplier}
            </Typography>
          )}
          {filters.period && (
            <Typography variant="body2" sx={{ fontSize: 11 }}>
              <strong>Period:</strong> {filters.period}
            </Typography>
          )}
        </Stack>
        <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ fontSize: 10, mt: 0.5 }}>
          Generated: {generatedDate}
        </Typography>
      </Box>

      {/* Summary Totals Boxes */}
      {summaryBoxes && (
        <Grid container spacing={1} mb={2}>
          {summaryBoxes.map((s) => (
            <Grid item xs={3} key={s.label}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 1,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  {s.label}
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={s.bold ? 800 : 600}
                  color={s.bold ? '#1565c0' : 'inherit'}
                  sx={{ fontSize: s.bold ? 14 : 12 }}
                >
                  {s.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Data Table */}
      <Table
        size="small"
        sx={{
          mb: 3,
          '& th': { bgcolor: '#1565c0', color: 'white', fontWeight: 700, fontSize: 11 },
          '& td': { fontSize: 11 },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>#</TableCell>
            {columns.map((col) => (
              <TableCell key={col.field} sx={{ color: 'white', fontWeight: 700 }}>
                {col.headerName}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 3, fontSize: 11 }}>
                No data
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((row, i) => (
                <TableRow
                  key={row._id || row.id || i}
                  sx={{ bgcolor: i % 2 === 0 ? '#fafafa' : 'white' }}
                >
                  <TableCell>{i + 1}</TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.field}>{getCellValue(row, col.field)}</TableCell>
                  ))}
                </TableRow>
              ))}

              {/* Totals Row */}
              {Object.keys(totals).length > 0 && (
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell sx={{ fontWeight: 800 }} />
                  {columns.map((col, idx) => (
                    <TableCell key={col.field} sx={{ fontWeight: 800, fontSize: 11 }}>
                      {idx === 0
                        ? 'TOTALS'
                        : totals[col.field] !== undefined
                        ? totals[col.field]
                        : ''}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>

      <Divider sx={{ mb: 2 }} />

      {/* Footer */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            Generated: {generatedDate}
          </Typography>
        </Box>
        {preparedBy && (
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ borderTop: '1px solid #000', width: 200, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: 10 }}>{preparedBy}</Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: 9 }}>
              Prepared by
            </Typography>
          </Box>
        )}
        <Box>
          {company?.licenseNo && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              License: {company.licenseNo}
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
});

export default ReportPrint;
