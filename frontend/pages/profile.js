import React, { useState, useRef } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SaveIcon from '@mui/icons-material/Save';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';
import PageHeader from '../components/Common/PageHeader';

const ROLE_COLORS = {
  admin: 'primary',
  superadmin: 'error',
  manager: 'secondary',
  user: 'default',
};

function TabPanel({ children, value, index }) {
  return (
    <Box hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

export default function ProfilePage() {
  const { user, updateProfile: updateUserInContext } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const fileRef = useRef(null);

  const [tab, setTab] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || user?.photo || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    contact: user?.contact || user?.phone || '',
    address: user?.address || '',
  });

  const [pwForm, setPwForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAvatarClick = () => fileRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', profileForm.name);
      formData.append('email', profileForm.email);
      formData.append('contact', profileForm.contact);
      formData.append('address', profileForm.address);
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await updateProfile(formData);
      if (updateUserInContext) {
        const updated = res.data.user || res.data;
        updateUserInContext(updated);
      }
      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update profile', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      enqueueSnackbar('Please fill in all password fields', { variant: 'warning' });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      enqueueSnackbar('New passwords do not match', { variant: 'error' });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      enqueueSnackbar('New password must be at least 6 characters', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      enqueueSnackbar('Password changed successfully', { variant: 'success' });
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to change password', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <MainLayout title="My Profile">
      <PageHeader
        title="My Profile"
        subtitle="View and update your personal information and password"
        icon={<AccountCircleIcon />}
        color="#1565c0"
        breadcrumbs={[{ label: 'Profile' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Avatar + Info ── */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ borderRadius: 2, p: 3, textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
              <Avatar
                src={avatarPreview}
                sx={{
                  width: 120,
                  height: 120,
                  fontSize: 40,
                  bgcolor: 'primary.main',
                  cursor: 'pointer',
                  border: '3px solid',
                  borderColor: 'primary.light',
                }}
                onClick={handleAvatarClick}
              >
                {!avatarPreview && initials}
              </Avatar>
              <IconButton
                onClick={handleAvatarClick}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: 32,
                  height: 32,
                }}
              >
                <CameraAltIcon fontSize="small" />
              </IconButton>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </Box>

            <Typography variant="h6" fontWeight={700}>{user?.name || 'User'}</Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              {user?.email || ''}
            </Typography>
            <Chip
              label={user?.role || 'user'}
              color={ROLE_COLORS[user?.role?.toLowerCase()] || 'default'}
              size="small"
              sx={{ textTransform: 'capitalize', mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: 'left' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">Username</Typography>
              </Box>
              <Typography variant="body2" fontWeight={600} ml={3.5} mb={1.5}>
                {user?.username || user?.email?.split('@')[0] || '—'}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LockIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">Role</Typography>
              </Box>
              <Typography variant="body2" fontWeight={600} ml={3.5} sx={{ textTransform: 'capitalize' }}>
                {user?.role || 'user'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* ── Right: Tabs ── */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ borderRadius: 2, p: 3 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
            >
              <Tab label="Profile Info" />
              <Tab label="Change Password" />
            </Tabs>

            {/* Profile Info */}
            <TabPanel value={tab} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Full Name"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Contact Number"
                    name="contact"
                    value={profileForm.contact}
                    onChange={handleProfileChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Address"
                    name="address"
                    value={profileForm.address}
                    onChange={handleProfileChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    Save Profile
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Change Password */}
            <TabPanel value={tab} index={1}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Current Password"
                    name="oldPassword"
                    type={showOld ? 'text' : 'password'}
                    value={pwForm.oldPassword}
                    onChange={handlePwChange}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowOld((v) => !v)} size="small">
                            {showOld ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="New Password"
                    name="newPassword"
                    type={showNew ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={handlePwChange}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowNew((v) => !v)} size="small">
                            {showNew ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Confirm New Password"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={pwForm.confirmPassword}
                    onChange={handlePwChange}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirm((v) => !v)} size="small">
                            {showConfirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
                    onClick={handleChangePassword}
                    disabled={saving}
                  >
                    Change Password
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </MainLayout>
  );
}
