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
import api from '../../utils/api';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import { getCRUD } from '../../utils/api';

const locationsApi = getCRUD('locations');
const EMPTY_FORM = { name: '', rackId: '', description: '' };

export default function LocationsPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [racks, setRacks] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchOptions = useCallback(async () => {
    try {
      const rRes = await api.get('/racks');
      const d = rRes.data.data || rRes.data;
      setRacks(Array.isArray(d) ? d : d.items || d.racks || []);
    } catch { /* silently fail */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await locationsApi.getAll({ page: page + 1, limit: rowsPerPage, search });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.locations || [];
      setRows(items);
      setTotal(res.data.total || res.data.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load locations', { variant: 'error' });
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
      rackId: row.rackId || row.rack?._id || row.rack?.id || '',
      description: row.description || '',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const getName = (list, row, field, objKey) => {
    const obj = row[objKey];
    if (obj?.name) return obj.name;
    const id = row[field] || (typeof obj === 'string' ? obj : null);
    const found = list.find((i) => (i._id || i.id) === id);
    return found?.name || '—';
  };

  const handleFormSubmit = () => {
    if (!formData.name) { enqueueSnackbar('Name is required', { variant: 'warning' }); return; }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setFormLoading(true);
    try {
      if (editId) {
        await locationsApi.update(editId, formData);
        enqueueSnackbar('Location updated successfully', { variant: 'success' });
      } else {
        await locationsApi.create(formData);
        enqueueSnackbar('Location created successfully', { variant: 'success' });
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
      await locationsApi.remove(deleteId);
      enqueueSnackbar('Location deleted', { variant: 'success' });
      setDeleteOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const columns = [
    { field: 'name', headerName: 'Name' },
    { field: 'rack', headerName: 'Rack', renderCell: ({ row }) => getName(racks, row, 'rackId', 'rack') },
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
    <MainLayout title="Locations">
      <PageHeader
        title="Locations"
        subtitle={`${total} location${total !== 1 ? 's' : ''} registered`}
        icon={<LocationOnIcon />}
        color="#880e4f"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Locations' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Location
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
        title={editId ? 'Edit Location' : 'Add Location'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        maxWidth="md"
      >
        <Stack spacing={2} mt={1}>
          <TextField label="Name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} fullWidth required />
          <FormControl fullWidth>
            <InputLabel>Rack</InputLabel>
            <Select value={formData.rackId} label="Rack" onChange={(e) => setFormData((p) => ({ ...p, rackId: e.target.value }))}>
              <MenuItem value=""><em>None</em></MenuItem>
              {racks.map((r) => <MenuItem key={r._id || r.id} value={r._id || r.id}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} fullWidth multiline rows={2} />
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
        title="Delete Location"
        description="Are you sure you want to delete this location? Enter admin password to confirm."
      />
    </MainLayout>
  );
}
