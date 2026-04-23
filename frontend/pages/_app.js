import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { SnackbarProvider } from 'notistack';
import { GoogleOAuthProvider } from '@react-oauth/google';

import theme from '../theme/index';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { PermissionsProvider } from '../context/PermissionsContext';

const PUBLIC_ROUTES = ['/login', '/signup'];

function AppContent({ Component, pageProps }) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      const isPublic = PUBLIC_ROUTES.includes(router.pathname);
      if (!isAuthenticated && !isPublic) {
        router.push('/login');
      }
      if (isAuthenticated && isPublic) {
        router.push('/dashboard');
      }
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const isPublic = PUBLIC_ROUTES.includes(router.pathname);

  // Not authenticated on protected route — redirect pending, render nothing
  if (!isAuthenticated && !isPublic) return null;

  // Authenticated but on a public route (login/signup) — redirect pending, render nothing
  if (isAuthenticated && isPublic) return null;

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <PermissionsProvider>
            <SettingsProvider>
              <SnackbarProvider
                maxSnack={3}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <AppContent Component={Component} pageProps={pageProps} />
              </SnackbarProvider>
            </SettingsProvider>
          </PermissionsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
