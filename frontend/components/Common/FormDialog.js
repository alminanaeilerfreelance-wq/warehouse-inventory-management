import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';

/**
 * FormDialog
 *
 * Props:
 *   open       {boolean}
 *   onClose    {() => void}
 *   title      {string}
 *   subtitle   {string}
 *   onSubmit   {() => void}
 *   loading    {boolean}
 *   children   {React.ReactNode}
 *   maxWidth   {'xs'|'sm'|'md'|'lg'|'xl'}  default 'sm'
 */
export default function FormDialog({
  open,
  onClose,
  title,
  subtitle,
  onSubmit,
  loading = false,
  children,
  maxWidth = 'sm',
}) {
  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* ── Header ── */}
      <DialogTitle
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          bgcolor: '#fafafa',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
        disableTypography
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          disabled={loading}
          sx={{ mt: -0.5, color: 'text.secondary', flexShrink: 0 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* ── Scrollable content ── */}
      <DialogContent
        sx={{
          px: 3,
          py: 3,
          overflowY: 'auto',
        }}
      >
        {children}
      </DialogContent>

      <Divider />

      {/* ── Footer ── */}
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
          bgcolor: '#fafafa',
        }}
      >
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: 2, minWidth: 88, textTransform: 'none', fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ borderRadius: 2, minWidth: 88, textTransform: 'none', fontWeight: 600 }}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
