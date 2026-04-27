import React, { forwardRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { QRCodeCanvas } from 'qrcode.react';
import dayjs from 'dayjs';
import DownloadIcon from '@mui/icons-material/Download';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  Pending: 'warning',
  Open: 'info',
  Paid: 'success',
  Cancelled: 'default',
  Due: 'error',
};

const InvoicePrint = forwardRef(function InvoicePrint({ invoice, company, qrValue }, ref) {
  if (!invoice) return null;

  const [qrScanOpen, setQrScanOpen] = useState(false);

  const items = invoice.items || [];
  const status = invoice.paymentStatus || invoice.status || 'Pending';

  const qrString =
    qrValue ||
    JSON.stringify({
      invoiceNo: invoice.invoiceNo || invoice.invoice_no,
      total: invoice.total,
      date: invoice.invoiceDate,
    });

  // Download invoice as PDF
  const downloadInvoice = () => {
    const element = ref?.current;
    if (!element) return;

    // Use browser's print dialog - user can save as PDF
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Invoice</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap">');
    printWindow.document.write('<style>body { font-family: Roboto, sans-serif; font-size: 12px; } @media print { body { margin: 0; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(element.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Box
      ref={ref}
      sx={{
        p: 4,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '12px',
        color: '#000',
        bgcolor: '#fff',
        maxWidth: 800,
        mx: 'auto',
        '@media print': {
          p: 2,
          maxWidth: '100%',
        },
      }}
    >
      {/* Company Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          {company?.logo && (
            <Box
              component="img"
              src={company.logo}
              alt="logo"
              sx={{ height: 60, mb: 1, display: 'block' }}
            />
          )}
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 18 }}>
            {company?.name || 'Company Name'}
          </Typography>
          {company?.slogan && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
              {company.slogan}
            </Typography>
          )}
          <Typography variant="body2" sx={{ fontSize: 11 }}>{company?.address}</Typography>
          <Typography variant="body2" sx={{ fontSize: 11 }}>{company?.phone}</Typography>
          {company?.tinNo && (
            <Typography variant="body2" sx={{ fontSize: 11 }}>TIN: {company.tinNo}</Typography>
          )}
        </Box>
        <Box textAlign="right">
          <Typography variant="h5" fontWeight={700} color="primary" sx={{ fontSize: 22 }}>
            INVOICE
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
            # {invoice.invoiceNo || invoice.invoice_no || 'N/A'}
          </Typography>
          <Chip
            label={status}
            size="small"
            color={STATUS_COLORS[status] || 'default'}
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Invoice Details */}
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: 12 }}>Bill To:</Typography>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            {invoice.customer?.name || invoice.customerName || '—'}
          </Typography>
          {(invoice.customer?.address || invoice.customerAddress) && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
              {invoice.customer?.address || invoice.customerAddress}
            </Typography>
          )}
        </Box>
        <Box textAlign="right">
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            <strong>Date:</strong>{' '}
            {invoice.invoiceDate ? dayjs(invoice.invoiceDate).format('MMM DD, YYYY') : '—'}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            <strong>Employee:</strong>{' '}
            {invoice.employee?.name || invoice.employeeName || '—'}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            <strong>Branch:</strong>{' '}
            {invoice.storeBranch?.name || invoice.branchName || '—'}
          </Typography>
        </Box>
      </Stack>

      {/* Items Table */}
      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>No</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Description</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>Qty</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>Unit Price</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ fontSize: 11 }}>No items</TableCell>
            </TableRow>
          ) : (
            items.map((item, idx) => (
              <TableRow key={idx} sx={{ '&:nth-of-type(even)': { bgcolor: 'grey.50' } }}>
                <TableCell sx={{ fontSize: 11 }}>{idx + 1}</TableCell>
                <TableCell sx={{ fontSize: 11 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                      {item.itemName || item.productName || item.serviceName || item.inventory?.product?.name || item.product?.name || item.service?.name || '—'}
                    </Typography>
                    {(item.service?.description || item.description || item.inventory?.product?.description) && (
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                        {item.service?.description || item.description || item.inventory?.product?.description || ''}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ fontSize: 11 }}>{item.quantity || item.qty || 1}</TableCell>
                <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.price || item.unitPrice || 0)}</TableCell>
                <TableCell align="right" sx={{ fontSize: 11 }}>
                  {fmt((item.price || item.unitPrice || 0) * (item.quantity || item.qty || 1))}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Totals + QR */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          {/* Notes */}
          {invoice.notes && (
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: 12 }}>Notes:</Typography>
              <Typography variant="body2" sx={{ fontSize: 11, maxWidth: 300 }}>
                {invoice.notes}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 10, mt: 4 }}>
            Thank you for your business!
          </Typography>
        </Box>

        <Box>
          {/* Totals Section */}
          <Box sx={{ minWidth: 220, mb: 2 }}>
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontSize: 12 }}>Subtotal</Typography>
                <Typography variant="body2" sx={{ fontSize: 12 }}>{fmt(invoice.subtotal)}</Typography>
              </Stack>
              {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 12 }}>Discount</Typography>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    -{fmt(invoice.discount || invoice.discountAmount)}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontSize: 12 }}>VAT</Typography>
                <Typography variant="body2" sx={{ fontSize: 12 }}>{fmt(invoice.vatAmount)}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 14 }}>Grand Total</Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 14 }}>
                  {fmt(invoice.total)}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* QR Code */}
          <Box textAlign="right">
            <Box
              onClick={() => setQrScanOpen(true)}
              sx={{
                cursor: 'pointer',
                display: 'inline-block',
                p: 1,
                border: '1px solid #ddd',
                borderRadius: 1,
                '&:hover': { bgcolor: 'grey.50' },
              }}
            >
              <QRCodeCanvas value={qrString} size={80} />
            </Box>
            <Typography variant="caption" display="block" sx={{ fontSize: 9, mt: 0.5 }}>
              Click to scan
            </Typography>
          </Box>
        </Box>
      </Stack>

      {/* QR Scan Dialog with Download */}
      <Dialog open={qrScanOpen} onClose={() => setQrScanOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invoice QR Code</DialogTitle>
        <DialogContent>
          <Box textAlign="center" py={3}>
            <QRCodeCanvas value={qrString} size={200} />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Scan this QR code to verify invoice
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Invoice: {invoice.invoiceNo || invoice.invoice_no}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrScanOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={() => {
              downloadInvoice();
              setQrScanOpen(false);
            }}
          >
            Download Invoice
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default InvoicePrint;
