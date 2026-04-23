import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import { useSnackbar } from 'notistack';

import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import BusinessIcon from '@mui/icons-material/Business';

import MainLayout from '../../components/Layout/MainLayout';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import { getSettings, updateCompany } from '../../utils/api';

const EMPTY_FORM = {
  name: '',
  slogan: '',
  phone: '',
  address: '',
  tinNo: '',
  licenseNo: '',
  logo: '',
};

export default function CompanySettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const fileRef = useRef();

  const [form, setForm] = useState(EMPTY_FORM);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSettings();
        const d = res.data?.data || res.data;
        const company = d?.company || {};
        setForm({
          name: company.name || '',
          slogan: company.slogan || '',
          phone: company.phone || company.contact || '',
          address: company.address || '',
          tinNo: company.tinNo || company.tin || '',
          licenseNo: company.licenseNo || company.license || '',
          logo: company.logo || '',
        });
        if (company.logo) setLogoPreview(company.logo);
      } catch {
        enqueueSnackbar('Failed to load settings', { variant: 'error' });
      }
    };
    load();
  }, [enqueueSnackbar]);

  const setF = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      enqueueSnackbar('Logo must be under 2MB', { variant: 'warning' });
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.name) { enqueueSnackbar('Company name is required', { variant: 'warning' }); return; }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setLoading(true);
    try {
      let payload;
      if (logoFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('logo', logoFile);
        payload = fd;
      } else {
        payload = form;
      }
      await updateCompany(payload);
      enqueueSnackbar('Company settings saved', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Company Settings">
      <PageHeader
        title="Company Settings"
        subtitle="Update your company details, logo, and registration information"
        icon={<BusinessIcon />}
        color="#1565c0"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Company' }]}
        actions={
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save Settings'}
          </Button>
        }
      />

      <Card variant="outlined" sx={{ maxWidth: 820, mx: 'auto', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">Company Information</Typography>
          <Typography variant="body2" color="text.secondary">Update your company details and logo</Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Logo Upload */}
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <Box sx={{ mb: 2 }}>
                {logoPreview ? (
                  <Box
                    component="img"
                    src={logoPreview}
                    alt="Company Logo"
                    sx={{ height: 120, maxWidth: 300, objectFit: 'contain', borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 1 }}
                  />
                ) : (
                  <Avatar sx={{ width: 100, height: 100, mx: 'auto', bgcolor: 'grey.200' }}>
                    <BusinessIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                  </Avatar>
                )}
              </Box>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileRef.current.click()}
                size="small"
              >
                Upload Logo (max 2MB)
              </Button>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Company Name"
                fullWidth
                value={form.name}
                onChange={setF('name')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Slogan"
                fullWidth
                value={form.slogan}
                onChange={setF('slogan')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Number"
                fullWidth
                value={form.phone}
                onChange={setF('phone')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="TIN No"
                fullWidth
                value={form.tinNo}
                onChange={setF('tinNo')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="License No"
                fullWidth
                value={form.licenseNo}
                onChange={setF('licenseNo')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Address"
                fullWidth
                multiline
                rows={3}
                value={form.address}
                onChange={setF('address')}
              />
            </Grid>

          </Grid>
        </CardContent>
      </Card>

      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title="Admin Confirmation"
        description="Enter admin password to save company settings."
      />
    </MainLayout>
  );
}
