import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Divider from '@mui/material/Divider';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Link from 'next/link';
import MuiLink from '@mui/material/Link';

export default function PageHeader({ title, subtitle, icon, actions, breadcrumbs = [], color = '#1565c0' }) {
  return (
    <Box mb={3}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1.5 }}>
          <MuiLink component={Link} href="/dashboard" underline="hover" color="inherit" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <HomeIcon sx={{ fontSize: 16 }} />
            Home
          </MuiLink>
          {breadcrumbs.map((crumb, i) =>
            crumb.href ? (
              <MuiLink key={i} component={Link} href={crumb.href} underline="hover" color="inherit">{crumb.label}</MuiLink>
            ) : (
              <Typography key={i} color="text.primary" variant="body2">{crumb.label}</Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {icon && (
            <Box sx={{
              width: 48, height: 48, borderRadius: 2,
              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: `0 4px 12px ${color}40`, flexShrink: 0,
            }}>
              {React.cloneElement(icon, { sx: { fontSize: 24 } })}
            </Box>
          )}
          <Box>
            <Typography variant="h5" fontWeight={700} lineHeight={1.2}>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary" mt={0.25}>{subtitle}</Typography>}
          </Box>
        </Box>
        {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
      </Box>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
}
