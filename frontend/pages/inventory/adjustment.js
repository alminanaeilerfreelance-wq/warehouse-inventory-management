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
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';

import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import TuneIcon from '@mui/icons-material/Tune';

import MainLayout from '../../components/Layout/MainLayout';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import { getInventory, createAdjustment, getAdjustments } from '../../utils/api';

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

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const res = await getInventory({ search: inventorySearch, limit: 50 });
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
      const res = await getAdjustments({ limit: 20 });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.adjustments || [];
      setRecentAdjustments(items);
    } catch {
      // silently fail
    } finally {
      setRecentLoading(false);
    }
  }, []);

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
        productName: item.product?.name || item.productName || 'Unknown',
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
      const payload = {
        items: cart.map((c) => ({
          inventoryId: c.inventoryId,
          adjustType: c.adjustType,
          adjustQty: Number(c.adjustQty),
          newQty: getNewQty(c),
        })),
        notes,
        type: 'adjustment',
      };
      const res = await createAdjustment(payload);
      const invoiceNo = res.data?.data?.invoiceNo || res.data?.invoiceNo || '';
      setSavedInvoiceNo(invoiceNo);
      enqueueSnackbar('Adjustment saved successfully', { variant: 'success' });
      setCart([]);
      setNotes('');
      fetchRecent();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
      throw err;
    } finally {
      setSaving(false);
    }
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
                            {item.product?.name || item.productName || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Qty: {item.quantity ?? 0}
                          </Typography>
                        </Box>
                        <Chip
                          label={status}
                          size="small"
                          color={STOCK_STATUS_COLORS[status] || 'default'}
                        />
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
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Items Count</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : recentAdjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
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
                      <TableCell>{adj.items?.length ?? adj.itemsCount ?? '—'}</TableCell>
                      <TableCell>{adj.notes || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title="Admin Confirmation"
        description="Enter admin password to save this adjustment."
      />
    </MainLayout>
  );
}
