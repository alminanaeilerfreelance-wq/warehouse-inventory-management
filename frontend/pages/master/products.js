import React, { useState, useEffect, useCallback } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import api from '../../utils/api';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Inventory2Icon from '@mui/icons-material/Inventory2';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import { getCRUD } from '../../utils/api';

const productsApi = getCRUD('products');
const EMPTY_FORM = { name: '', categoryId: '', brandId: '', description: '', status: 'Active' };

export default function ProductsPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchOptions = useCallback(async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get('/categories'),
        api.get('/brands'),
      ]);
      const catData = catRes.data.data || catRes.data;
      const brandData = brandRes.data.data || brandRes.data;
      setCategories(Array.isArray(catData) ? catData : catData.items || catData.categories || []);
      setBrands(Array.isArray(brandData) ? brandData : brandData.items || brandData.brands || []);
    } catch {
      // silently fail
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getAll({ page: page + 1, limit: rowsPerPage, search });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.products || [];
      setRows(items);
      setTotal(res.data.total || res.data.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load products', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, enqueueSnackbar]);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      name: row.name || '',
      categoryId: row.categoryId || row.category?._id || row.category?.id || '',
      brandId: row.brandId || row.brand?._id || row.brand?.id || '',
      description: row.description || '',
      status: row.status || 'Active',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const handleFormSubmit = () => {
    if (!formData.name) { enqueueSnackbar('Name is required', { variant: 'warning' }); return; }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setFormLoading(true);
    try {
      if (editId) {
        await productsApi.update(editId, formData);
        enqueueSnackbar('Product updated successfully', { variant: 'success' });
      } else {
        await productsApi.create(formData);
        enqueueSnackbar('Product created successfully', { variant: 'success' });
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await productsApi.remove(deleteId);
      enqueueSnackbar('Product deleted', { variant: 'success' });
      setDeleteOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const getCategoryName = (row) => {
    if (row.category?.name) return row.category.name;
    const cat = categories.find((c) => (c._id || c.id) === (row.categoryId || row.category));
    return cat?.name || '—';
  };

  const getBrandName = (row) => {
    if (row.brand?.name) return row.brand.name;
    const brand = brands.find((b) => (b._id || b.id) === (row.brandId || row.brand));
    return brand?.name || '—';
  };

  const columns = [
    { field: 'name', headerName: 'Name' },
    { field: 'category', headerName: 'Category', renderCell: ({ row }) => getCategoryName(row) },
    { field: 'brand', headerName: 'Brand', renderCell: ({ row }) => getBrandName(row) },
    {
      field: 'status',
      headerName: 'Status',
      renderCell: ({ value }) => (
        <Chip label={value || 'Active'} size="small" color={value === 'Active' ? 'success' : 'default'} />
      ),
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
            <IconButton size="small" color="error" onClick={() => { setDeleteId(row._id || row.id); setDeleteOpen(true); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <MainLayout title="Products">
      <PageHeader
        title="Products"
        subtitle={`${total} product${total !== 1 ? 's' : ''} registered`}
        icon={<Inventory2Icon />}
        color="#283593"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Products' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Product
          </Button>
        }
      />

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

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit Product' : 'Add Product'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      >
        <Stack spacing={2} mt={1}>
          <TextField label="Name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} fullWidth required />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={formData.categoryId} label="Category" onChange={(e) => setFormData((p) => ({ ...p, categoryId: e.target.value }))}>
              <MenuItem value=""><em>None</em></MenuItem>
              {categories.map((c) => (
                <MenuItem key={c._id || c.id} value={c._id || c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Brand</InputLabel>
            <Select value={formData.brandId} label="Brand" onChange={(e) => setFormData((p) => ({ ...p, brandId: e.target.value }))}>
              <MenuItem value=""><em>None</em></MenuItem>
              {brands.map((b) => (
                <MenuItem key={b._id || b.id} value={b._id || b.id}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} fullWidth multiline rows={3} />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={formData.status} label="Status" onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </FormDialog>

      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title="Admin Confirmation"
        description="Enter admin password to confirm this action."
      />

      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        description="Are you sure you want to delete this product? Enter admin password to confirm."
      />
    </MainLayout>
  );
}
