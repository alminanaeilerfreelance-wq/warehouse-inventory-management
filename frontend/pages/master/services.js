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
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import { getCRUD } from '../../utils/api';

const servicesApi = getCRUD('services');
const EMPTY_FORM = { name: '', description: '', price: '', unitId: '', status: 'Active' };

export default function ServicesPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [units, setUnits] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await api.get('/units');
      const data = res.data.data || res.data;
      setUnits(Array.isArray(data) ? data : data.items || data.units || []);
    } catch { /* silently fail */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicesApi.getAll({ page: page + 1, limit: rowsPerPage, search });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.services || [];
      setRows(items);
      setTotal(res.data.total || res.data.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load services', { variant: 'error' });
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
      description: row.description || '',
      price: row.price || '',
      unitId: row.unitId || row.unit?._id || row.unit?.id || '',
      status: row.status || 'Active',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const getUnitName = (row) => {
    if (row.unit?.name) return row.unit.name;
    const u = units.find((u) => (u._id || u.id) === (row.unitId || row.unit));
    return u?.name || '—';
  };

  const handleFormSubmit = () => {
    if (!formData.name) { enqueueSnackbar('Name is required', { variant: 'warning' }); return; }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setFormLoading(true);
    try {
      if (editId) {
        await servicesApi.update(editId, formData);
        enqueueSnackbar('Service updated successfully', { variant: 'success' });
      } else {
        await servicesApi.create(formData);
        enqueueSnackbar('Service created successfully', { variant: 'success' });
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
      await servicesApi.remove(deleteId);
      enqueueSnackbar('Service deleted', { variant: 'success' });
      setDeleteOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const fmt = (val) => val != null ? Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

  const columns = [
    { field: 'name', headerName: 'Name' },
    { field: 'price', headerName: 'Price', renderCell: ({ value }) => `$${fmt(value)}` },
    { field: 'unit', headerName: 'Unit', renderCell: ({ row }) => getUnitName(row) },
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
    <MainLayout title="Services">
      <PageHeader
        title="Services"
        subtitle={`${total} service${total !== 1 ? 's' : ''} registered`}
        icon={<MiscellaneousServicesIcon />}
        color="#e65100"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Services' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Service
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
        title={editId ? 'Edit Service' : 'Add Service'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      >
        <Stack spacing={2} mt={1}>
          <TextField label="Name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} fullWidth required />
          <TextField label="Description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} fullWidth multiline rows={2} />
          <TextField label="Price" type="number" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.01 }} />
          <FormControl fullWidth>
            <InputLabel>Unit</InputLabel>
            <Select value={formData.unitId} label="Unit" onChange={(e) => setFormData((p) => ({ ...p, unitId: e.target.value }))}>
              <MenuItem value=""><em>None</em></MenuItem>
              {units.map((u) => (
                <MenuItem key={u._id || u.id} value={u._id || u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
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
        title="Delete Service"
        description="Are you sure you want to delete this service? Enter admin password to confirm."
      />
    </MainLayout>
  );
}
