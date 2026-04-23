import React, { useState, useEffect, useCallback } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import { getUsers, createUser, updateUser, deleteUser } from '../../utils/api';
import api from '../../utils/api';

const EMPTY_FORM = {
  customerName: '',
  username: '',
  email: '',
  contact: '',
  address: '',
  image: '',
  password: '',
  role: 'user',
  isActive: true,
  assignedBranch: '',
  permissions: {},
};

export default function UsersPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [branches, setBranches] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get('/store-branches');
      const d = res.data?.data || res.data;
      setBranches(Array.isArray(d) ? d : d?.items || d?.storeBranches || []);
    } catch { /* silent */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers({ page: page + 1, limit: rowsPerPage, search });
      const d = res.data;
      setRows(d.users || []);
      setTotal(d.total || 0);
    } catch {
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, enqueueSnackbar]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      customerName: row.customerName || '',
      username: row.username || '',
      email: row.email || '',
      contact: row.contact || '',
      address: row.address || '',
      image: row.image || '',
      password: '',
      role: row.role || 'user',
      isActive: row.isActive !== false,
      assignedBranch: row.assignedBranch?._id || row.assignedBranch || '',
      permissions: row.permissions || {},
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  const handleFormSubmit = () => {
    if (!formData.username || !formData.email) {
      enqueueSnackbar('Username and email are required', { variant: 'warning' });
      return;
    }
    if (!editId && !formData.password) {
      enqueueSnackbar('Password is required for new users', { variant: 'warning' });
      return;
    }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setFormLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      if (!payload.assignedBranch) payload.assignedBranch = null;
      if (editId) {
        await updateUser(editId, payload);
        enqueueSnackbar('User updated successfully', { variant: 'success' });
      } else {
        await createUser(payload);
        enqueueSnackbar('User created successfully', { variant: 'success' });
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
      await deleteUser(deleteId);
      enqueueSnackbar('User deleted', { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
      throw err;
    }
  };

  const columns = [
    {
      field: 'image',
      headerName: '',
      renderCell: ({ row }) => (
        <Avatar
          src={row.image || ''}
          sx={{ width: 36, height: 36, bgcolor: row.role === 'admin' ? '#1565c0' : '#2e7d32' }}
        >
          {row.role === 'admin' ? <AdminPanelSettingsIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
        </Avatar>
      ),
    },
    {
      field: 'customerName',
      headerName: 'Full Name',
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{row.customerName || '—'}</Typography>
          <Typography variant="caption" color="text.secondary">@{row.username}</Typography>
        </Box>
      ),
    },
    { field: 'email', headerName: 'Email' },
    { field: 'contact', headerName: 'Contact' },
    {
      field: 'role',
      headerName: 'Role',
      renderCell: ({ row }) => (
        <Chip
          label={row.role === 'admin' ? 'Admin' : 'User'}
          size="small"
          color={row.role === 'admin' ? 'primary' : 'success'}
          icon={row.role === 'admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
        />
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      renderCell: ({ row }) => (
        <Chip
          label={row.isActive ? 'Active' : 'Inactive'}
          size="small"
          color={row.isActive ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'assignedBranch',
      headerName: 'Branch',
      renderCell: ({ row }) => row.assignedBranch?.name || '—',
    },
    {
      field: 'lastLoginAt',
      headerName: 'Last Login',
      renderCell: ({ row }) => row.lastLoginAt ? dayjs(row.lastLoginAt).format('MMM DD, YYYY HH:mm') : 'Never',
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
              onClick={() => { setDeleteId(row._id || row.id); setDeleteOpen(true); }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <MainLayout title="User Management">
      <PageHeader
        title="User Management"
        subtitle={`${total} user${total !== 1 ? 's' : ''} registered`}
        icon={<ManageAccountsIcon />}
        color="#1565c0"
        breadcrumbs={[{ label: 'System' }, { label: 'Users' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add User
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

      {/* Add / Edit Form */}
      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit User' : 'Add New User'}
        subtitle={editId ? 'Update user information and permissions' : 'Create a new system user'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        maxWidth="md"
      >
        <Grid container spacing={2} mt={0.5}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={0.5}>
              PERSONAL INFORMATION
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Full Name" fullWidth size="small" value={formData.customerName} onChange={setF('customerName')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" fullWidth size="small" type="email" value={formData.email} onChange={setF('email')} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact Number" fullWidth size="small" value={formData.contact} onChange={setF('contact')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Profile Image URL" fullWidth size="small" value={formData.image} onChange={setF('image')} placeholder="https://..." />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Address" fullWidth size="small" multiline rows={2} value={formData.address} onChange={setF('address')} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={0.5} mt={1}>
              ACCOUNT CREDENTIALS
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Username" fullWidth size="small" value={formData.username} onChange={setF('username')} required disabled={!!editId} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={editId ? 'New Password (leave blank to keep)' : 'Password'}
              fullWidth size="small" type="password"
              value={formData.password} onChange={setF('password')}
              required={!editId}
              helperText={editId ? 'Only fill to reset password' : 'Minimum 6 characters'}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={0.5} mt={1}>
              ROLE & PERMISSIONS
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select value={formData.role} label="Role" onChange={setF('role')}>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="user">User</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Assigned Store Branch</InputLabel>
              <Select value={formData.assignedBranch} label="Assigned Store Branch" onChange={setF('assignedBranch')}>
                <MenuItem value=""><em>None</em></MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b._id || b.id} value={b._id || b.id}>{b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  color="success"
                />
              }
              label={<Typography variant="body2">{formData.isActive ? 'Account Active' : 'Account Inactive'}</Typography>}
            />
          </Grid>

          {/* Only show permissions matrix for non-admin users */}
          {formData.role === 'user' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1} mt={1}>
                MODULE PERMISSIONS
              </Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700, width: '40%' }}>Module</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>View</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Create</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Edit</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { key: 'inventory', label: 'Inventory' },
                      { key: 'invoices', label: 'Invoices' },
                      { key: 'purchaseOrders', label: 'Purchase Orders' },
                      { key: 'returnOrders', label: 'Return Orders' },
                      { key: 'transfers', label: 'Transfers' },
                      { key: 'reports', label: 'Reports' },
                      { key: 'masterData', label: 'Master Data' },
                      { key: 'settings', label: 'Settings' },
                      { key: 'adjustments', label: 'Adjustments' },
                    ].map(({ key, label }) => (
                      <TableRow key={key} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{label}</Typography>
                        </TableCell>
                        {['view', 'create', 'edit', 'delete'].map((action) => (
                          <TableCell key={action} align="center">
                            <Checkbox
                              size="small"
                              checked={formData.permissions?.[key]?.[action] ?? (action === 'view')}
                              onChange={(e) => setFormData((p) => ({
                                ...p,
                                permissions: {
                                  ...(p.permissions || {}),
                                  [key]: {
                                    ...(p.permissions?.[key] || {}),
                                    [action]: e.target.checked,
                                  },
                                },
                              }))}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Grid>
          )}
        </Grid>
      </FormDialog>

      {/* Admin Confirm for Save */}
      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title="Admin Confirmation"
        description="Enter admin password to save user changes."
      />

      {/* Delete Confirm */}
      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        description="Are you sure? This will permanently delete the user. Enter admin password to confirm."
      />
    </MainLayout>
  );
}
