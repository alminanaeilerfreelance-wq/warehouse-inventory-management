import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { verifyAdminPassword } from '../../utils/api';

/**
 * AdminConfirmDialog
 *
 * Verifies admin password via API before calling onConfirm().
 *
 * Props:
 *   open         {boolean}
 *   onClose      {() => void}
 *   onConfirm    {() => Promise<void>}  — called only after password verified
 *   title        {string}
 *   description  {string}
 */
export default function AdminConfirmDialog({ open, onClose, onConfirm, title, description, children }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setPassword('');
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!password) {
      setError('Please enter the admin password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Step 1: verify the admin password
      await verifyAdminPassword(password);
      // Step 2: run the parent action
      await onConfirm();
      setPassword('');
      setError('');
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Action failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title || 'Admin Confirmation'}</DialogTitle>
      <DialogContent>
        {description && (
          <DialogContentText sx={{ mb: 2 }}>
            {description}
          </DialogContentText>
        )}
        {children}
        <TextField
          label="Admin Password"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
          autoFocus
          variant="outlined"
          size="small"
          disabled={loading}
          sx={{ mt: children ? 2 : 0 }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
