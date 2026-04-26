import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { GoogleLogin } from '@react-oauth/google';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import GppBadIcon from '@mui/icons-material/GppBad';

import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: <InventoryIcon />, label: 'Real-time Inventory Tracking' },
  { icon: <BarChartIcon />, label: 'Advanced Sales Reports' },
  { icon: <LocalShippingIcon />, label: 'Purchase Order Management' },
  { icon: <SecurityIcon />, label: 'Role-based Access Control' },
];

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState('');
  const [error, setError] = useState('');

  // Lock state: locked, minutesLeft (display), seconds (display), unlockAt (Date)
  const [lockState, setLockState] = useState({
    locked: false,
    minutesLeft: 0,
    seconds: 0,
    unlockAt: null,
  });

  const intervalRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (!lockState.locked || !lockState.unlockAt) return;

    const tick = () => {
      const now = Date.now();
      const diff = lockState.unlockAt - now;
      if (diff <= 0) {
        setLockState({ locked: false, minutesLeft: 0, seconds: 0, unlockAt: null });
        clearInterval(intervalRef.current);
        return;
      }
      const totalSeconds = Math.ceil(diff / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setLockState((prev) => ({ ...prev, minutesLeft: mins, seconds: secs }));
    };

    tick(); // run immediately
    intervalRef.current = setInterval(tick, 1000);

    return () => clearInterval(intervalRef.current);
  }, [lockState.locked, lockState.unlockAt]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const doLogin = async (credentials) => {
    await login(credentials);
    router.push('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await doLogin({ username: form.username, password: form.password });
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 423) {
        // Account locked
        const minutesLeft = data?.minutesLeft || data?.lockDuration || 5;
        const unlockAt = Date.now() + minutesLeft * 60 * 1000;
        setLockState({
          locked: true,
          minutesLeft,
          seconds: 0,
          unlockAt,
        });
        setError('');
      } else if (status === 429) {
        // IP suspicious / rate limited
        setError(data?.message || 'Too many login attempts from this IP. Please try again later.');
      } else {
        const attemptsLeft = data?.attemptsLeft;
        const baseMessage = data?.message || 'Login failed. Please check your credentials.';
        setError(attemptsLeft !== undefined ? `${baseMessage} ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.` : baseMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setDemoLoading(role);
    setError('');
    try {
      const credentials =
        role === 'admin'
          ? { username: 'admin', password: 'admin123' }
          : { username: 'demo_user', password: 'user123' };
      await doLogin(credentials);
    } catch (err) {
      setError(err?.response?.data?.message || `Demo ${role} login failed.`);
    } finally {
      setDemoLoading('');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setError('');
    try {
      await googleLogin(credentialResponse.credential);
      router.push('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const isAnyLoading = loading || googleLoading || demoLoading !== '';
  const isFormDisabled = isAnyLoading || lockState.locked;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0a0f1e' }}>
      {/* ── LEFT PANEL ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '55%',
          p: 6,
          background: 'linear-gradient(145deg, #0d1b3e 0%, #1a2f6b 50%, #0d47a1 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration circles */}
        {[
          { size: 400, top: -100, right: -100, opacity: 0.04 },
          { size: 300, bottom: 50, left: -80, opacity: 0.06 },
          { size: 200, top: '40%', right: '10%', opacity: 0.05 },
        ].map((circle, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: circle.size,
              height: circle.size,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              top: circle.top,
              bottom: circle.bottom,
              left: circle.left,
              right: circle.right,
              opacity: circle.opacity,
              background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
            }}
          />
        ))}

        {/* Logo & title */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 6 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <WarehouseIcon sx={{ color: '#fff', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="#fff" lineHeight={1}>
                WMS Pro
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Warehouse Management System
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h3"
            fontWeight={800}
            color="#fff"
            lineHeight={1.2}
            mb={2}
            sx={{ letterSpacing: '-0.5px' }}
          >
            Manage your
            <Box component="span" sx={{ color: '#64b5f6', display: 'block' }}>
              warehouse smarter.
            </Box>
          </Typography>

          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.65)', mb: 5, maxWidth: 420, lineHeight: 1.8 }}
          >
            A complete solution for inventory, purchasing, invoicing, HR, and reporting —
            all in one powerful platform.
          </Typography>

          <Stack spacing={2}>
            {FEATURES.map((f) => (
              <Box key={f.label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: 'rgba(100,181,246,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64b5f6',
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {f.label}
                </Typography>
                <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50', ml: 'auto' }} />
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Bottom quote */}
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', mb: 1.5 }}
          >
            &ldquo;WMS Pro reduced our inventory discrepancies by 94% and cut order processing
            time in half.&rdquo;
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#1565c0', fontSize: 13 }}>JR</Avatar>
            <Box>
              <Typography variant="caption" fontWeight={600} color="#fff" display="block">
                Juan Reyes
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
                Warehouse Director, Apex Logistics
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── RIGHT PANEL ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, sm: 6 },
          bgcolor: '#fff',
          position: 'relative',
        }}
      >
        {/* Mobile logo */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1.5,
            mb: 4,
          }}
        >
          <WarehouseIcon sx={{ color: '#1565c0', fontSize: 32 }} />
          <Typography variant="h6" fontWeight={700} color="primary.main">
            WMS Pro
          </Typography>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Typography variant="h5" fontWeight={800} color="#0d1b3e" mb={0.5}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            Sign in to your account to continue
          </Typography>

          {/* ── Lock Alert (HTTP 423) ── */}
          {lockState.locked && (
            <Alert
              severity="warning"
              icon={<LockIcon />}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              <AlertTitle>Account Locked</AlertTitle>
              Your account is temporarily locked. Try again in{' '}
              <strong>
                {lockState.minutesLeft} min {lockState.seconds}s
              </strong>
            </Alert>
          )}

          {/* ── Generic / IP error (HTTP 429 or other) ── */}
          {!lockState.locked && error && (
            <Alert
              severity={error.toLowerCase().includes('ip') || error.toLowerCase().includes('too many') ? 'error' : 'error'}
              icon={error.toLowerCase().includes('ip') || error.toLowerCase().includes('too many') ? <GppBadIcon /> : undefined}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {/* ── Demo Buttons ── */}
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              border: '1.5px dashed',
              borderColor: 'divider',
              bgcolor: '#f8faff',
            }}
          >
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              display="block"
              mb={1.5}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
            >
              Try a Demo Account
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Click to login as Admin (full access)" arrow>
                <Chip
                  icon={
                    demoLoading === 'admin' ? (
                      <CircularProgress size={16} />
                    ) : (
                      <AdminPanelSettingsIcon />
                    )
                  }
                  label="admin / admin123"
                  onClick={() => handleDemoLogin('admin')}
                  disabled={isFormDisabled}
                  clickable
                  variant="filled"
                  sx={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                    bgcolor: '#1565c0',
                    color: '#fff',
                    '&:hover': { bgcolor: '#0d47a1' },
                    '&.Mui-disabled': { opacity: 0.6 },
                  }}
                />
              </Tooltip>
              <Tooltip title="Click to login as User (view-only)" arrow>
                <Chip
                  icon={
                    demoLoading === 'user' ? (
                      <CircularProgress size={16} />
                    ) : (
                      <PersonIcon />
                    )
                  }
                  label="demo_user / user123"
                  onClick={() => handleDemoLogin('user')}
                  disabled={isFormDisabled}
                  clickable
                  variant="outlined"
                  sx={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                    borderColor: '#1565c0',
                    color: '#1565c0',
                    '&:hover': { bgcolor: '#e3f0ff', borderColor: '#0d47a1' },
                    '&.Mui-disabled': { opacity: 0.6 },
                  }}
                />
              </Tooltip>
            </Stack>
          </Box>

          {/* ── Google Login ── */}
          <Box sx={{ mb: 2 }}>
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' ? (
              <Box sx={{ '& > div': { width: '100% !important' } }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed.')}
                  width="100%"
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="signin_with"
                />
              </Box>
            ) : (
              <Button
                fullWidth
                variant="outlined"
                size="large"
                disabled
                startIcon={
                  <Box
                    component="img"
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    sx={{ width: 20, height: 20 }}
                  />
                }
                sx={{
                  borderRadius: 2,
                  py: 1.3,
                  textTransform: 'none',
                  fontSize: 15,
                  fontWeight: 500,
                  borderColor: '#dadce0',
                  color: '#3c4043',
                }}
              >
                Sign in with Google
                <Chip
                  label="Setup required"
                  size="small"
                  sx={{ ml: 1, height: 20, fontSize: 10, bgcolor: '#fff3cd', color: '#856404' }}
                />
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
              or sign in with username
            </Typography>
          </Divider>

          {/* ── Login Form ── */}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Username or Email"
                name="username"
                value={form.username}
                onChange={handleChange}
                fullWidth
                autoComplete="username"
                autoFocus
                disabled={isFormDisabled}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                fullWidth
                autoComplete="current-password"
                disabled={isFormDisabled}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        tabIndex={-1}
                        size="small"
                      >
                        {showPassword ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isFormDisabled}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: 15,
                  textTransform: 'none',
                  bgcolor: '#1565c0',
                  boxShadow: '0 4px 14px rgba(21,101,192,0.35)',
                  '&:hover': {
                    bgcolor: '#0d47a1',
                    boxShadow: '0 6px 20px rgba(21,101,192,0.45)',
                  },
                }}
                startIcon={
                  loading ? <CircularProgress size={18} color="inherit" /> : null
                }
              >
                {lockState.locked
                  ? `Locked — ${lockState.minutesLeft}m ${lockState.seconds}s`
                  : loading
                  ? 'Signing in...'
                  : 'Sign In'}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don&apos;t have an account?{' '}
              <Link
                component={NextLink}
                href="/signup"
                underline="hover"
                fontWeight={600}
                color="primary.main"
              >
                Create account
              </Link>
            </Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ position: 'absolute', bottom: 24 }}
        >
          &copy; {new Date().getFullYear()} WMS Pro. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
