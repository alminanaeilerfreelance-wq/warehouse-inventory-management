import React, { useState, useEffect, useCallback } from 'react';
import Button from '@mui/material/Button';
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
import dayjs from 'dayjs';
import api from '../../utils/api';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import { getCRUD } from '../../utils/api';

const expensesApi = getCRUD('expenses');
const EMPTY_FORM = { name: '', amount: '', categoryId: '', date: '', description: '', status: 'Active' };

export default function ExpensesPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [categories, setCategories] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      const data = res.data.data || res.data;
      setCategories(Array.isArray(data) ? data : data.items || data.categories || []);
    } catch { /* silently fail */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expensesApi.getAll({ page: page + 1, limit: rowsPerPage, search });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.expenses || [];
      setRows(items);
      setTotal(res.data.total || res.data.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load expenses', { variant: 'error' });
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
      amount: row.amount || '',
      categoryId: row.categoryId || row.category?._id || row.category?.id || '',
      date: row.date ? row.date.substring(0, 10) : '',
      description: row.description || '',
      status: row.status || 'Active',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const getCategoryName = (row) => {
    if (row.category?.name) return row.category.name;
    const cat = categories.find((c) => (c._id || c.id) === (row.categoryId || row.category));
    return cat?.name || '—';
  };

  const handleFormSubmit = () => {
    if (!formData.name) { enqueueSnackbar('Name is required', { variant: 'warning' }); return; }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setFormLoading(true);
    try {
      if (editId) {
        await expensesApi.update(editId, formData);
        enqueueSnackbar('Expense updated successfully', { variant: 'success' });
      } else {
        await expensesApi.create(formData);
        enqueueSnackbar('Expense created successfully', { variant: 'success' });
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
      await expensesApi.remove(deleteId);
      enqueueSnackbar('Expense deleted', { variant: 'success' });
      setDeleteOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const fmt = (val) => val != null ? Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

  const columns = [
    { field: 'name', headerName: 'Name' },
    { field: 'amount', headerName: 'Amount', renderCell: ({ value }) => `$${fmt(value)}` },
    { field: 'category', headerName: 'Category', renderCell: ({ row }) => getCategoryName(row) },
    { field: 'date', headerName: 'Date', renderCell: ({ value }) => value ? dayjs(value).format('MMM DD, YYYY') : '—' },
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
    <MainLayout title="Expenses">
      <PageHeader
        title="Expenses"
        subtitle={`${total} expense${total !== 1 ? 's' : ''} registered`}
        icon={<ReceiptLongIcon />}
        color="#b71c1c"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Expenses' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Expense
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
        title={editId ? 'Edit Expense' : 'Add Expense'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      >
        <Stack spacing={2} mt={1}>
          <TextField label="Name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} fullWidth required />
          <TextField label="Amount" type="number" value={formData.amount} onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.01 }} />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={formData.categoryId} label="Category" onChange={(e) => setFormData((p) => ({ ...p, categoryId: e.target.value }))}>
              <MenuItem value=""><em>None</em></MenuItem>
              {categories.map((c) => (
                <MenuItem key={c._id || c.id} value={c._id || c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Date" type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} fullWidth multiline rows={2} />
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
        title="Delete Expense"
        description="Are you sure you want to delete this expense? Enter admin password to confirm."
      />
    </MainLayout>
  );
}
