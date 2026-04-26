import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
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
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';

import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import TuneIcon from '@mui/icons-material/Tune';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';
import TablePagination from '@mui/material/TablePagination';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import MainLayout from '../../components/Layout/MainLayout';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import { getInventory, createAdjustment, getAdjustments, deleteAdjustment } from '../../utils/api';
import api from '../../utils/api';

const STOCK_STATUS_COLORS = {
  'In Stock': 'success',
  'Low Stock': 'warning',
  'Out of Stock': 'error',
};

export default function AdjustmentPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');

  const [adminOpen, setAdminOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [savedInvoiceNo, setSavedInvoiceNo] = useState('');

  const [recentAdjustments, setRecentAdjustments] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentSearch, setRecentSearch] = useState('');
  const [recentPage, setRecentPage] = useState(0);
  const [recentRowsPerPage, setRecentRowsPerPage] = useState(10);
  const [deleteAdminOpen, setDeleteAdminOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editCart, setEditCart] = useState([]);
  const [editInventoryItems, setEditInventoryItems] = useState([]);

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const res = await getInventory({ search: inventorySearch, limit: 100, noPagination: true });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.inventory || [];
      setInventoryItems(items);
    } catch {
      enqueueSnackbar('Failed to load inventory', { variant: 'error' });
    } finally {
      setInventoryLoading(false);
    }
  }, [inventorySearch, enqueueSnackbar]);

  const fetchRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await getAdjustments({ 
        limit: recentRowsPerPage,
        skip: recentPage * recentRowsPerPage,
        search: recentSearch
      });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.adjustments || [];
      setRecentAdjustments(items);
    } catch {
      // silently fail
    } finally {
      setRecentLoading(false);
    }
  }, [recentRowsPerPage, recentPage, recentSearch]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const addToCart = (item) => {
    const id = item._id || item.id;
    if (cart.find((c) => c.inventoryId === id)) {
      enqueueSnackbar('Item already in cart', { variant: 'info' });
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        inventoryId: id,
        productName: item.productName?.name || item.product?.name || item.productName || 'Unknown',
        currentQty: item.quantity || 0,
        adjustType: 'Increment',
        adjustQty: 1,
      },
    ]);
  };

  const removeFromCart = (inventoryId) => {
    setCart((prev) => prev.filter((c) => c.inventoryId !== inventoryId));
  };

  const updateCartRow = (inventoryId, field, value) => {
    setCart((prev) =>
      prev.map((c) =>
        c.inventoryId === inventoryId ? { ...c, [field]: value } : c
      )
    );
  };

  const getNewQty = (row) => {
    const adj = Number(row.adjustQty) || 0;
    return row.adjustType === 'Increment'
      ? row.currentQty + adj
      : Math.max(0, row.currentQty - adj);
  };

  const handleSaveClick = () => {
    if (cart.length === 0) {
      enqueueSnackbar('Cart is empty', { variant: 'warning' });
      return;
    }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setSaving(true);
    try {
      if (cart.length === 0) {
        enqueueSnackbar('Cart is empty', { variant: 'warning' });
        setSaving(false);
        return;
      }

      // Validate all items have the same adjustment type
      const adjustTypes = [...new Set(cart.map((c) => c.adjustType))];
      if (adjustTypes.length > 1) {
        enqueueSnackbar(
          'All items must have the same adjustment type (all increment or all decrement)',
          { variant: 'warning' }
        );
        setSaving(false);
        return;
      }

      const adjustmentType = adjustTypes[0];
      const type = adjustmentType === 'Increment' ? 'increment' : 'decrement';

      const payload = {
        type,
        items: cart.map((c) => ({
          inventory: c.inventoryId,
          quantity: Number(c.adjustQty),
        })),
        notes,
      };

      const res = await createAdjustment(payload);
      const invoiceNo = res.data?.data?.invoiceNo || res.data?.invoiceNo || '';
      setSavedInvoiceNo(invoiceNo);
      enqueueSnackbar('Adjustment saved successfully', { variant: 'success' });
      setCart([]);
      setNotes('');
      setAdminOpen(false);
      fetchRecent();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintAdjustment = (adj) => {
    const itemsHTML = (adj.items || [])
      .map(
        (item, idx) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.inventory?.productName?.name || 'Unknown'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity || 0}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">₱${(item.price || 0).toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">₱${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const totalAmount = (adj.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Inventory Adjustment Report</title>
        <style>
          * { margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-info {
            text-align: center;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
          }
          .company-details {
            font-size: 13px;
            color: #555;
            line-height: 1.6;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #6a1b9a;
            margin-top: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
            font-size: 14px;
          }
          .detail-box {
            padding: 15px;
            background-color: #f8f9fa;
            border-left: 4px solid #6a1b9a;
          }
          .detail-label {
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 5px;
          }
          .detail-value {
            color: #555;
            font-size: 15px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            font-size: 14px;
          }
          .items-table th {
            background-color: #6a1b9a;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #6a1b9a;
          }
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
          }
          .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .items-table tr:hover {
            background-color: #f0e6ff;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #6a1b9a;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 10px;
            gap: 30px;
            font-size: 15px;
          }
          .total-label {
            font-weight: 700;
            color: #2c3e50;
            min-width: 150px;
          }
          .total-value {
            font-weight: 700;
            color: #6a1b9a;
            min-width: 100px;
            text-align: right;
          }
          .notes-section {
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-left: 4px solid #6a1b9a;
            border-radius: 4px;
          }
          .notes-label {
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
          }
          .notes-text {
            color: #555;
            line-height: 1.6;
            font-style: italic;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #999;
          }
          @media print {
            body {
              background-color: white;
              padding: 0;
            }
            .container {
              box-shadow: none;
              border-radius: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-info">
              <div class="company-name">Apex Warehouse Corp.</div>
              <div class="company-details">
                123 Commerce Street, Business District<br>
                Phone: (555) 123-4567 | Email: info@apexwarehouse.com<br>
                License #: WMS-2024-001
              </div>
              <div class="title">Inventory Adjustment Report</div>
            </div>
          </div>

          <div class="invoice-details">
            <div class="detail-box">
              <div class="detail-label">Invoice Number</div>
              <div class="detail-value">${adj.invoiceNo || adj.invoice_no || '—'}</div>
            </div>
            <div class="detail-box">
              <div class="detail-label">Date</div>
              <div class="detail-value">${adj.createdAt ? dayjs(adj.createdAt).format('MMMM DD, YYYY') : '—'}</div>
            </div>
            <div class="detail-box">
              <div class="detail-label">Created By</div>
              <div class="detail-value">${adj.adjustedBy?.username || adj.adjustedBy?.customerName || '—'}</div>
            </div>
            <div class="detail-box">
              <div class="detail-label">Total Items</div>
              <div class="detail-value">${adj.items?.length ?? adj.itemsCount ?? 0} item(s)</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 8%;">#</th>
                <th style="width: 40%;">Product</th>
                <th style="width: 15%; text-align: center;">Quantity</th>
                <th style="width: 18%; text-align: right;">Unit Price</th>
                <th style="width: 19%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span class="total-label">Total Amount:</span>
              <span class="total-value">₱${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          ${adj.notes ? `
            <div class="notes-section">
              <div class="notes-label">Notes:</div>
              <div class="notes-text">${adj.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            <p>This is an official Inventory Adjustment Report generated by Apex Warehouse Management System</p>
            <p>Printed on: ${new Date().toLocaleString()}</p>
            <p style="margin-top: 20px; font-size: 11px;">This document is confidential and intended only for authorized personnel.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=1000,height=800');
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleDeleteClick = (adj) => {
    setSelectedDeleteId(adj._id || adj.id);
    setDeleteAdminOpen(true);
  };

  const handleDeleteConfirm = async (adminPassword) => {
    try {
      if (!selectedDeleteId) return;
      await deleteAdjustment(selectedDeleteId, { adminPassword });
      enqueueSnackbar('Adjustment deleted successfully', { variant: 'success' });
      setDeleteAdminOpen(false);
      setSelectedDeleteId(null);
      setRecentPage(0);
      fetchRecent();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const updateEditCartRow = (inventoryId, field, value) => {
    setEditCart((prev) =>
      prev.map((row) =>
        row.inventoryId === inventoryId ? { ...row, [field]: value } : row
      )
    );
  };

  const removeFromEditCart = (inventoryId) => {
    setEditCart((prev) => prev.filter((row) => row.inventoryId !== inventoryId));
  };

  const handleEditSave = async (adminPassword) => {
    try {
      if (!editingAdjustment) return;
      const response = await api.patch(
        `/adjustments/${editingAdjustment._id || editingAdjustment.id}`,
        {
          notes: editNotes,
          items: editCart.map((c) => ({
            inventoryId: c.inventoryId,
            quantity: Number(c.adjustQty),
          })),
          adminPassword,
        }
      );
      enqueueSnackbar('Adjustment updated successfully', { variant: 'success' });
      setEditOpen(false);
      setEditingAdjustment(null);
      setEditNotes('');
      setEditCart([]);
      setRecentPage(0);
      fetchRecent();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Update failed', { variant: 'error' });
    }
  };

  const handleEditClick = async (adj) => {
    setEditingAdjustment(adj);
    setEditNotes(adj.notes || '');
    // Initialize edit cart with current items
    const editedCart = adj.items?.map((item) => ({
      inventoryId: item.inventory?._id || item.inventory,
      productName: item.inventory?.productName?.name || 'Unknown',
      currentQty: item.inventory?.quantity || 0,
      adjustType: 'Increment', // Default
      adjustQty: item.quantity || 0,
    })) || [];
    setEditCart(editedCart);
    // Fetch all inventory for the edit dialog
    try {
      const res = await getInventory({ limit: 100, noPagination: true });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.inventory || [];
      setEditInventoryItems(items);
    } catch {}
    setEditOpen(true);
  };

  return (
    <MainLayout title="Inventory Adjustment">
      <PageHeader
        title="Stock Adjustments"
        subtitle="Adjust inventory quantities and track changes"
        icon={<TuneIcon />}
        color="#6a1b9a"
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Adjustments' }]}
      />

      {savedInvoiceNo && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSavedInvoiceNo('')}>
          Adjustment saved. Invoice No: <strong>{savedInvoiceNo}</strong>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Panel: Search Inventory */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
              Select Items
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search inventory…"
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
              {inventoryLoading ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  Loading…
                </Typography>
              ) : inventoryItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No items found
                </Typography>
              ) : (
                inventoryItems.map((item) => {
                  const id = item._id || item.id;
                  const status = item.stockStatus || item.stock_status || 'In Stock';
                  const inCart = cart.some((c) => c.inventoryId === id);
                  return (
                    <Box
                      key={id}
                      onClick={() => !inCart && addToCart(item)}
                      sx={{
                        p: 1.5,
                        mb: 0.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: inCart ? 'primary.main' : 'divider',
                        bgcolor: inCart ? 'primary.50' : 'background.paper',
                        cursor: inCart ? 'default' : 'pointer',
                        '&:hover': { bgcolor: inCart ? 'primary.50' : 'action.hover' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                        <Typography variant="body2" fontWeight={600}>
                        {item.barcode} / {item.sku}
                        </Typography>

                          <Typography variant="body2" fontWeight={600}> 
                          {item.productName?.name || item.product?.name || 'Unknown'}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            Qty: {item.quantity ?? 0} 
                          </Typography>
                          
                         </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                          {/* COLOR DOT */}
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: `${STOCK_STATUS_COLORS[status] || 'grey'}.main`,
                            }}
                          />

                          {/* CHIP */}
                          <Chip
                            label={status}
                            size="small"
                            color={STOCK_STATUS_COLORS[status] || 'default'}
                            variant="outlined"
                          />
                        </Stack>
                              
                      </Stack>
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right Panel: Cart */}
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
              Adjustment Cart
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Current Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Adjust Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Adjust Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>New Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cart.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No items added
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cart.map((row) => (
                      <TableRow key={row.inventoryId}>
                        <TableCell>{row.productName}</TableCell>
                        <TableCell>{row.currentQty}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={row.adjustType}
                            onChange={(e) =>
                              updateCartRow(row.inventoryId, 'adjustType', e.target.value)
                            }
                            sx={{ minWidth: 130 }}
                          >
                            <MenuItem value="Increment">Increment</MenuItem>
                            <MenuItem value="Decrement">Decrement</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={row.adjustQty}
                            onChange={(e) =>
                              updateCartRow(row.inventoryId, 'adjustQty', e.target.value)
                            }
                            inputProps={{ min: 1, style: { width: 70 } }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color={
                              row.adjustType === 'Decrement' &&
                              Number(row.adjustQty) > row.currentQty
                                ? 'error'
                                : 'text.primary'
                            }
                          >
                            {getNewQty(row)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeFromCart(row.inventoryId)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />

            <TextField
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveClick}
              disabled={saving || cart.length === 0}
            >
              Save Adjustment
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Adjustments */}
      <Box mt={4}>
        <Typography variant="h6" fontWeight={600} mb={1.5}>
          Recent Adjustments
        </Typography>
        <Paper variant="outlined">
          {/* Search Bar */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by invoice number, notes..."
              value={recentSearch}
              onChange={(e) => { setRecentSearch(e.target.value); setRecentPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Items Count</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : recentAdjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No recent adjustments
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentAdjustments.map((adj) => (
                    <TableRow key={adj._id || adj.id} hover>
                      <TableCell>{adj.invoiceNo || adj.invoice_no || '—'}</TableCell>
                      <TableCell>
                        {adj.createdAt ? dayjs(adj.createdAt).format('MMM DD, YYYY') : '—'}
                      </TableCell>
                      <TableCell>
                        {adj.adjustedBy?.username || adj.adjustedBy?.customerName || '—'}
                      </TableCell>
                      <TableCell>{adj.items?.length ?? adj.itemsCount ?? '—'}</TableCell>
                      <TableCell>{(adj.notes || '—').substring(0, 50)}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Print">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handlePrintAdjustment(adj)}
                            >
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleEditClick(adj)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(adj)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={recentAdjustments.length > 0 ? (recentPage + 1) * recentRowsPerPage + 1 : recentPage * recentRowsPerPage}
            rowsPerPage={recentRowsPerPage}
            page={recentPage}
            onPageChange={(event, newPage) => setRecentPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRecentRowsPerPage(parseInt(event.target.value, 10));
              setRecentPage(0);
            }}
          />
        </Paper>
      </Box>

      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title="Admin Confirmation"
        description="Enter admin password to save this adjustment."
      />

      <AdminConfirmDialog
        open={deleteAdminOpen}
        onClose={() => setDeleteAdminOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Adjustment"
        description="Enter admin password to delete this adjustment. This action cannot be undone."
      />

      {/* Edit Adjustment Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Adjustment</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {editingAdjustment && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Adjustment Items
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Current Qty</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Adjust Qty</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editCart.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              No items in adjustment
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        editCart.map((row) => (
                          <TableRow key={row.inventoryId}>
                            <TableCell>{row.productName}</TableCell>
                            <TableCell>{row.currentQty}</TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={row.adjustQty}
                                onChange={(e) =>
                                  updateEditCartRow(row.inventoryId, 'adjustQty', e.target.value)
                                }
                                inputProps={{ min: 0, style: { width: 70 } }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeFromEditCart(row.inventoryId)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Notes
                </Typography>
                <TextField
                  label="Notes"
                  multiline
                  rows={4}
                  fullWidth
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  variant="outlined"
                />
              </Box>

              <Alert severity="info">
                Enter your admin password below to confirm these changes.
              </Alert>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Admin Password
                </Typography>
                <TextField
                  type="password"
                  label="Password"
                  fullWidth
                  id="edit-admin-password"
                  variant="outlined"
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              const passwordInput = document.getElementById('edit-admin-password');
              const adminPassword = passwordInput?.value || '';
              if (!adminPassword) {
                enqueueSnackbar('Admin password is required', { variant: 'error' });
                return;
              }
              await handleEditSave(adminPassword);
            }}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
