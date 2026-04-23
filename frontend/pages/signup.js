import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { useAuth } from '../context/AuthContext';

import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    customerName: '',
    email: '',
    contact: '',
    address: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.username || !form.password) {
      setError('Customer Name, Username and Password are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k !== 'confirmPassword') formData.append(k, v);
      });
      if (avatar) formData.append('avatar', avatar);

      await signup(formData);
      setSuccess('Account created successfully! Redirecting to login…');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Real-time inventory tracking',
    'Purchase & return order management',
    'Comprehensive sales reporting',
    'Multi-branch support',
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <Grid container sx={{ flex: 1, minHeight: '100vh' }}>
        {/* Left: Brand Panel */}
        <Grid
          item
          xs={false}
          md={5}
          sx={{
            background: 'linear-gradient(160deg, #0d1b2a 0%, #1565c0 60%, #1976d2 100%)',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            p: 6,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background decorative circles */}
          <Box sx={{
            position: 'absolute', top: -80, right: -80,
            width: 300, height: 300, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.04)',
          }} />
          <Box sx={{
            position: 'absolute', bottom: -100, left: -60,
            width: 400, height: 400, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.03)',
          }} />

          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
            {/* Logo area */}
            <Box sx={{
              width: 88, height: 88, borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 3,
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
            }}>
              <WarehouseIcon sx={{ fontSize: 48, color: 'white' }} />
            </Box>

            <Typography variant="h3" fontWeight={800} mb={0.5} sx={{ letterSpacing: '-0.5px' }}>
              WMS Pro
            </Typography>
            <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.8, mb: 4 }}>
              Join the warehouse revolution
            </Typography>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', mb: 4 }} />

            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="body2" sx={{ opacity: 0.65, mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, fontWeight: 600 }}>
                What you get
              </Typography>
              {features.map((f) => (
                <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#69f0ae' }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>{f}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ mt: 5 }}>
              <Typography variant="caption" sx={{ opacity: 0.45 }}>
                Already have an account?{' '}
                <Link component={NextLink} href="/login" sx={{ color: 'rgba(255,255,255,0.8)', textDecorationColor: 'rgba(255,255,255,0.4)' }}>
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Right: Signup Form */}
        <Grid
          item
          xs={12}
          md={7}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 3, sm: 5, md: 6 },
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 560 }}>
            {/* Mobile logo */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
              <WarehouseIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight={800} color="primary.main">WMS Pro</Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" fontWeight={800} color="text.primary" gutterBottom>
                Create your account
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Fill in your details to get started with WMS Pro
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>{success}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              {/* Avatar upload */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={avatarPreview}
                  sx={{ width: 64, height: 64, bgcolor: 'primary.50', cursor: 'pointer', border: '2px solid', borderColor: 'primary.light' }}
                  onClick={() => fileRef.current.click()}
                >
                  {!avatarPreview && <PhotoCameraIcon color="primary" />}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={600} mb={0.5}>Profile Photo</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => fileRef.current.click()}
                    startIcon={<PhotoCameraIcon />}
                    sx={{ borderRadius: 1.5 }}
                  >
                    Upload Photo
                  </Button>
                  <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                    Optional — JPG, PNG up to 2MB
                  </Typography>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />
                </Box>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Full Name / Customer Name"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                    fullWidth
                    required
                    disabled={loading}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    fullWidth
                    disabled={loading}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Contact Number"
                    name="contact"
                    value={form.contact}
                    onChange={handleChange}
                    fullWidth
                    disabled={loading}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    rows={2}
                    disabled={loading}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>Account credentials</Typography>
                  </Divider>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    fullWidth
                    required
                    disabled={loading}
                    autoComplete="username"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    fullWidth
                    required
                    disabled={loading}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" tabIndex={-1} size="small">
                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Confirm Password"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    fullWidth
                    required
                    disabled={loading}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirm((s) => !s)} edge="end" tabIndex={-1} size="small">
                            {showConfirm ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PersonAddIcon />}
                sx={{
                  mt: 3, mb: 2, py: 1.4,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                  boxShadow: '0 4px 14px rgba(21,101,192,0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
                    boxShadow: '0 6px 20px rgba(21,101,192,0.45)',
                  },
                }}
              >
                {loading ? 'Creating Account…' : 'Create Account'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link component={NextLink} href="/login" underline="hover" fontWeight={600}>
                    Sign In
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
