import React, { useState, useEffect, useCallback } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BadgeIcon from '@mui/icons-material/Badge';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import { getCRUD } from '../../utils/api';

const api = getCRUD('employees');
const EMPTY_FORM = {
  employeeId: '',
  name: '',
  position: '',
  department: '',
  email: '',
  contact: '',
  address: '',
  hireDate: '',
  salary: '',
  status: 'Active',
};

export default function EmployeesPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAll({ page: page + 1, limit: rowsPerPage, search });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.employees || [];
      setRows(items);
      setTotal(res.data.total || res.data.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load employees', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      employeeId: row.employeeId || '',
      name: row.name || '',
      position: row.position || '',
      department: row.department || '',
      email: row.email || '',
      contact: row.contact || '',
      address: row.address || '',
      hireDate: row.hireDate ? row.hireDate.substring(0, 10) : '',
      salary: row.salary || '',
      status: row.status || 'Active',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const handleChange = (field) => (e) => setFormData((p) => ({ ...p, [field]: e.target.value }));

  const handleFormSubmit = () => {
    if (!formData.name) { enqueueSnackbar('Name is required', { variant: 'warning' }); return; }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setFormLoading(true);
    try {
      if (editId) {
        await api.update(editId, formData);
        enqueueSnackbar('Employee updated successfully', { variant: 'success' });
      } else {
        await api.create(formData);
        enqueueSnackbar('Employee created successfully', { variant: 'success' });
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
      await api.remove(deleteId);
      enqueueSnackbar('Employee deleted', { variant: 'success' });
      setDeleteOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const columns = [
    { field: 'employeeId', headerName: 'Employee ID' },
    { field: 'name', headerName: 'Name' },
    { field: 'position', headerName: 'Position' },
    { field: 'department', headerName: 'Department' },
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
    <MainLayout title="Employees">
      <PageHeader
        title="Employees"
        subtitle={`${total} employee${total !== 1 ? 's' : ''} registered`}
        icon={<BadgeIcon />}
        color="#00838f"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Employees' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Employee
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
        title={editId ? 'Edit Employee' : 'Add Employee'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        maxWidth="md"
      >
        <Grid container spacing={2} mt={0.5}>
          <Grid item xs={12} sm={6}>
            <TextField label="Employee ID" value={formData.employeeId} onChange={handleChange('employeeId')} fullWidth placeholder="Auto-generated if left blank" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Full Name" value={formData.name} onChange={handleChange('name')} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Position" value={formData.position} onChange={handleChange('position')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Department" value={formData.department} onChange={handleChange('department')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" type="email" value={formData.email} onChange={handleChange('email')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact" value={formData.contact} onChange={handleChange('contact')} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Address" value={formData.address} onChange={handleChange('address')} fullWidth multiline rows={2} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Hire Date" type="date" value={formData.hireDate} onChange={handleChange('hireDate')} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Salary" type="number" value={formData.salary} onChange={handleChange('salary')} fullWidth inputProps={{ min: 0, step: 0.01 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={formData.status} label="Status" onChange={handleChange('status')}>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
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
        title="Delete Employee"
        description="Are you sure you want to delete this employee? Enter admin password to confirm."
      />
    </MainLayout>
  );
}
