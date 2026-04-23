import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LockIcon from '@mui/icons-material/Lock';
import { useRouter } from 'next/router';

export default function AccessDenied({ module = 'this page' }) {
  const router = useRouter();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 3 }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#fce4ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LockIcon sx={{ fontSize: 40, color: '#c62828' }} />
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700} mb={1}>Access Denied</Typography>
        <Typography variant="body1" color="text.secondary">
          You do not have permission to view {module}.
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Contact your administrator to request access.
        </Typography>
      </Box>
      <Button variant="outlined" onClick={() => router.push('/dashboard')}>
        Go to Dashboard
      </Button>
    </Box>
  );
}
