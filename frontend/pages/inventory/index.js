import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { saveAs } from 'file-saver';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import api, {
  getInventory,
  createInventory,
  updateInventory,
  deleteInventory,
  exportInventory,
} from '../../utils/api';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STOCK_STATUS_COLORS = {
  'In Stock': 'success',
  'Low Stock': 'warning',
  'Out of Stock': 'error',
};

const EMPTY_FORM = {
  brandId: '',
  designId: '',
  supplierId: '',
  categoryId: '',
  productId: '',
  zoneId: '',
  binId: '',
  rackId: '',
  locationId: '',
  warehouseId: '',
  typeId: '',
  unitId: '',
  expirationDate: null,
  dateReceived: null,
  cost: '',
  srp: '',
  quantity: '',
  vatType: 'exclusive',
};

const LOOKUP_RESOURCES = [
  'brands', 'designs', 'suppliers', 'categories', 'products',
  'zones', 'bins', 'racks', 'locations', 'warehouses', 'types', 'units',
];

function sel(arr, id) {
  if (!arr || !id) return '—';
  const found = arr.find((x) => (x._id || x.id) === id);
  return found?.name || found?.title || '—';
}

export default function InventoryPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  const [lookups, setLookups] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'save' | 'delete'
  const [deleteId, setDeleteId] = useState(null);

  const fetchLookups = useCallback(async () => {
    try {
      const results = await Promise.all(
        LOOKUP_RESOURCES.map((r) => api.get(`/${r}`).catch(() => ({ data: [] })))
      );
      const newLookups = {};
      LOOKUP_RESOURCES.forEach((r, i) => {
        const d = results[i].data?.data || results[i].data;
        newLookups[r] = Array.isArray(d) ? d : d?.items || d?.[r] || [];
      });
      setLookups(newLookups);
    } catch {
      // silently fail
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInventory({
        page: page + 1,
        limit: rowsPerPage,
        search,
        stock_status: stockFilter || undefined,
      });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.inventory || [];
      setRows(items);
      setTotal(res.data?.total || res.data?.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load inventory', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, stockFilter, enqueueSnackbar]);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      brandId: row.brandId || row.brand?._id || row.brand?.id || '',
      designId: row.designId || row.design?._id || row.design?.id || '',
      supplierId: row.supplierId || row.supplier?._id || row.supplier?.id || '',
      categoryId: row.categoryId || row.category?._id || row.category?.id || '',
      productId: row.productId || row.product?._id || row.product?.id || '',
      zoneId: row.zoneId || row.zone?._id || row.zone?.id || '',
      binId: row.binId || row.bin?._id || row.bin?.id || '',
      rackId: row.rackId || row.rack?._id || row.rack?.id || '',
      locationId: row.locationId || row.location?._id || row.location?.id || '',
      warehouseId: row.warehouseId || row.warehouse?._id || row.warehouse?.id || '',
      typeId: row.typeId || row.type?._id || row.type?.id || '',
      unitId: row.unitId || row.unit?._id || row.unit?.id || '',
      expirationDate: row.expirationDate ? dayjs(row.expirationDate) : null,
      dateReceived: row.dateReceived ? dayjs(row.dateReceived) : null,
      cost: row.cost ?? '',
      srp: row.srp ?? '',
      quantity: row.quantity ?? '',
      vatType: row.vatType || 'exclusive',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));
  const setDate = (k) => (v) => setFormData((p) => ({ ...p, [k]: v }));

  const handleFormSubmit = () => {
    if (!formData.productId) { enqueueSnackbar('Product is required', { variant: 'warning' }); return; }
    setPendingAction('save');
    setAdminOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setPendingAction('delete');
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    if (pendingAction === 'save') {
      setFormLoading(true);
      try {
        const payload = {
          ...formData,
          expirationDate: formData.expirationDate ? formData.expirationDate.toISOString() : null,
          dateReceived: formData.dateReceived ? formData.dateReceived.toISOString() : null,
          cost: Number(formData.cost),
          srp: Number(formData.srp),
          quantity: Number(formData.quantity),
        };
        if (editId) {
          await updateInventory(editId, payload);
          enqueueSnackbar('Inventory updated', { variant: 'success' });
        } else {
          await createInventory(payload);
          enqueueSnackbar('Inventory item added', { variant: 'success' });
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
        await deleteInventory(deleteId);
        enqueueSnackbar('Item deleted', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
        throw err;
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await exportInventory();
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'inventory.xlsx');
    } catch {
      enqueueSnackbar('Export failed', { variant: 'error' });
    }
  };

  const handlePrint = () => window.print();

  const columns = [
    {
      field: 'productName',
      headerName: 'Product Name',
      renderCell: ({ row }) =>
        row.product?.name || sel(lookups.products, row.productId) || row.productName || '—',
    },
    {
      field: 'brand',
      headerName: 'Brand',
      renderCell: ({ row }) =>
        row.brand?.name || sel(lookups.brands, row.brandId) || '—',
    },
    {
      field: 'supplier',
      headerName: 'Supplier',
      renderCell: ({ row }) =>
        row.supplier?.name || sel(lookups.suppliers, row.supplierId) || '—',
    },
    {
      field: 'category',
      headerName: 'Category',
      renderCell: ({ row }) =>
        row.category?.name || sel(lookups.categories, row.categoryId) || '—',
    },
    {
      field: 'zone',
      headerName: 'Zone',
      renderCell: ({ row }) =>
        row.zone?.name || sel(lookups.zones, row.zoneId) || '—',
    },
    {
      field: 'bin',
      headerName: 'Bin',
      renderCell: ({ row }) =>
        row.bin?.name || sel(lookups.bins, row.binId) || '—',
    },
    {
      field: 'rack',
      headerName: 'Rack',
      renderCell: ({ row }) =>
        row.rack?.name || sel(lookups.racks, row.rackId) || '—',
    },
    {
      field: 'location',
      headerName: 'Location',
      renderCell: ({ row }) =>
        row.location?.name || sel(lookups.locations, row.locationId) || '—',
    },
    {
      field: 'warehouse',
      headerName: 'Warehouse',
      renderCell: ({ row }) =>
        row.warehouse?.name || sel(lookups.warehouses, row.warehouseId) || '—',
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      renderCell: ({ row }) => row.quantity ?? '—',
    },
    {
      field: 'cost',
      headerName: 'Cost',
      renderCell: ({ row }) => fmt(row.cost),
    },
    {
      field: 'srp',
      headerName: 'SRP',
      renderCell: ({ row }) => fmt(row.srp),
    },
    {
      field: 'totalCost',
      headerName: 'Total Cost',
      renderCell: ({ row }) => fmt((row.cost || 0) * (row.quantity || 0)),
    },
    {
      field: 'totalSrp',
      headerName: 'Total SRP',
      renderCell: ({ row }) => fmt((row.srp || 0) * (row.quantity || 0)),
    },
    {
      field: 'stockStatus',
      headerName: 'Stock Status',
      renderCell: ({ row }) => {
        const s = row.stockStatus || row.stock_status || 'In Stock';
        return <Chip label={s} size="small" color={STOCK_STATUS_COLORS[s] || 'default'} />;
      },
    },
    {
      field: 'expirationDate',
      headerName: 'Expiry Date',
      renderCell: ({ row }) =>
        row.expirationDate ? dayjs(row.expirationDate).format('MMM DD, YYYY') : '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" color="warning" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteClick(row._id || row.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const lookupSelect = (label, key, resource) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select value={formData[key]} label={label} onChange={setF(key)}>
        <MenuItem value=""><em>None</em></MenuItem>
        {(lookups[resource] || []).map((x) => (
          <MenuItem key={x._id || x.id} value={x._id || x.id}>{x.name || x.title}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Inventory">
        <PageHeader
          title="Inventory Management"
          subtitle="Track and manage all warehouse inventory items"
          icon={<InventoryIcon />}
          color="#1565c0"
          breadcrumbs={[{ label: 'Inventory' }]}
          actions={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportExcel} size="small">
                Export Excel
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                Add Item
              </Button>
            </Stack>
          }
        />

        <Grid container spacing={2} mb={2.5}>
          {[
            { label: 'Total Items', value: total, color: '#1565c0', icon: <InventoryIcon /> },
            { label: 'Low Stock', value: rows.filter(r => ['Low Stock','low_stock'].includes(r.stockStatus)).length, color: '#ed6c02', icon: <WarningAmberIcon /> },
            { label: 'Out of Stock', value: rows.filter(r => ['Out of Stock','out_of_stock'].includes(r.stockStatus)).length, color: '#d32f2f', icon: <ErrorOutlineIcon /> },
            { label: 'Est. Total Value', value: `₱${rows.reduce((s,r)=>s+(r.cost||0)*(r.quantity||0),0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: '#2e7d32', icon: <AttachMoneyIcon /> },
          ].map((card) => (
            <Grid item xs={6} sm={3} key={card.label}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, borderLeft: `4px solid ${card.color}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                    {card.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{card.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                  </Box>
                </Box>
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
          actions={
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Stock Status</InputLabel>
                <Select
                  value={stockFilter}
                  label="Stock Status"
                  onChange={(e) => { setStockFilter(e.target.value); setPage(0); }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="In Stock">In Stock</MenuItem>
                  <MenuItem value="Low Stock">Low Stock</MenuItem>
                  <MenuItem value="Out of Stock">Out of Stock</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          }
          onExport={{ onPrint: handlePrint, onPDF: handlePrint, onExcel: handleExportExcel }}
          getRowSx={(row) => {
            const s = row.stockStatus || '';
            if (s === 'out_of_stock' || s === 'Out of Stock') return { bgcolor: '#fff5f5', '&:hover': { bgcolor: '#ffe0e0' } };
            if (s === 'low_stock' || s === 'Low Stock') return { bgcolor: '#fffde7', '&:hover': { bgcolor: '#fff9c4' } };
            return { bgcolor: '#f1f8f4', '&:hover': { bgcolor: '#e8f5e9' } };
          }}
        />

        <FormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editId ? 'Edit Inventory Item' : 'Add Inventory Item'}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          maxWidth="md"
        >
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} sm={6}>{lookupSelect('Brand', 'brandId', 'brands')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Design', 'designId', 'designs')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Supplier', 'supplierId', 'suppliers')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Category', 'categoryId', 'categories')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Product Name', 'productId', 'products')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Zone', 'zoneId', 'zones')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Bin', 'binId', 'bins')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Rack', 'rackId', 'racks')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Location', 'locationId', 'locations')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Warehouse', 'warehouseId', 'warehouses')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Type', 'typeId', 'types')}</Grid>
            <Grid item xs={12} sm={6}>{lookupSelect('Unit', 'unitId', 'units')}</Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Expiration Date"
                value={formData.expirationDate}
                onChange={setDate('expirationDate')}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date Received"
                value={formData.dateReceived}
                onChange={setDate('dateReceived')}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Cost"
                type="number"
                fullWidth
                size="small"
                value={formData.cost}
                onChange={setF('cost')}
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="SRP"
                type="number"
                fullWidth
                size="small"
                value={formData.srp}
                onChange={setF('srp')}
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Quantity"
                type="number"
                fullWidth
                size="small"
                value={formData.quantity}
                onChange={setF('quantity')}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>VAT Type</InputLabel>
                <Select value={formData.vatType} label="VAT Type" onChange={setF('vatType')}>
                  <MenuItem value="inclusive">Inclusive</MenuItem>
                  <MenuItem value="exclusive">Exclusive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </FormDialog>

        <AdminConfirmDialog
          open={adminOpen}
          onClose={() => setAdminOpen(false)}
          onConfirm={handleAdminConfirm}
          title={pendingAction === 'delete' ? 'Delete Item' : 'Admin Confirmation'}
          description={
            pendingAction === 'delete'
              ? 'Enter admin password to delete this item.'
              : 'Enter admin password to save changes.'
          }
        />
      </MainLayout>
    </LocalizationProvider>
  );
}
