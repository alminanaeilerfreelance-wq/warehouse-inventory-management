import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';

import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import LanguageIcon from '@mui/icons-material/Language';
import PaletteIcon from '@mui/icons-material/Palette';

import MainLayout from '../../components/Layout/MainLayout';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import { getSettings, updateGeneralSettings } from '../../utils/api';
import { useSettings } from '../../context/SettingsContext';

const ACTION_BUTTONS = [
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'update', label: 'Update' },
  { key: 'print', label: 'Print' },
  { key: 'pdf', label: 'PDF' },
  { key: 'excel', label: 'Excel' },
  { key: 'import', label: 'Import' },
  { key: 'calendar', label: 'Calendar' },
];

const DEFAULT_COLORS = {
  add: '#2196f3',
  edit: '#ff9800',
  delete: '#f44336',
  update: '#4caf50',
  print: '#607d8b',
  pdf: '#e91e63',
  excel: '#4caf50',
  import: '#9c27b0',
  calendar: '#00bcd4',
};

export default function GeneralSettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { refreshSettings } = useSettings();

  const [vatAmount, setVatAmount] = useState(12);
  const [vatType, setVatType] = useState('exclusive');
  const [language, setLanguage] = useState('en');
  const [actionColors, setActionColors] = useState(DEFAULT_COLORS);

  const [loading, setLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSettings();
        const d = res.data?.data || res.data;
        const s = d?.settings || d?.general || {};
        if (s.vatAmount !== undefined) setVatAmount(s.vatAmount);
        if (s.vatType) setVatType(s.vatType);
        if (s.language) setLanguage(s.language);
        if (s.actionColors) setActionColors({ ...DEFAULT_COLORS, ...s.actionColors });
      } catch {
        enqueueSnackbar('Failed to load settings', { variant: 'error' });
      }
    };
    load();
  }, [enqueueSnackbar]);

  const handleColorChange = (key, value) => {
    setActionColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setLoading(true);
    try {
      await updateGeneralSettings({ vatAmount: Number(vatAmount), vatType, language, actionColors });
      await refreshSettings();
      enqueueSnackbar('General settings saved', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="General Settings">
      <PageHeader
        title="General Settings"
        subtitle="Configure VAT, language, and action button appearance"
        icon={<SettingsIcon />}
        color="#37474f"
        breadcrumbs={[{ label: 'Settings' }, { label: 'General' }]}
        actions={
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
            sx={{ bgcolor: '#37474f', '&:hover': { bgcolor: '#263238' } }}
          >
            {loading ? 'Saving…' : 'Save All Settings'}
          </Button>
        }
      />

      <Stack spacing={3} sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Card 1: VAT Settings */}
        <Card variant="outlined">
          <CardHeader
            avatar={<SettingsIcon color="primary" />}
            title="VAT Settings"
            subheader="Configure value-added tax settings"
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="VAT Amount (%)"
                  type="number"
                  fullWidth
                  value={vatAmount}
                  onChange={(e) => setVatAmount(e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  helperText="Enter VAT percentage (e.g., 12 for 12%)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>VAT Type</Typography>
                <RadioGroup
                  row
                  value={vatType}
                  onChange={(e) => setVatType(e.target.value)}
                >
                  <FormControlLabel value="inclusive" control={<Radio />} label="Inclusive" />
                  <FormControlLabel value="exclusive" control={<Radio />} label="Exclusive" />
                </RadioGroup>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Card 2: Language Settings */}
        <Card variant="outlined">
          <CardHeader
            avatar={<LanguageIcon color="primary" />}
            title="Language Settings"
            subheader="Select the application display language"
          />
          <Divider />
          <CardContent>
            <FormControl sx={{ minWidth: 240 }}>
              <InputLabel>Language</InputLabel>
              <Select value={language} label="Language" onChange={(e) => setLanguage(e.target.value)}>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="fil">Filipino</MenuItem>
                <MenuItem value="ar">Arabic</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Changing the language will reload the settings context.
            </Typography>
          </CardContent>
        </Card>

        {/* Card 3: Action Button Colors */}
        <Card variant="outlined">
          <CardHeader
            avatar={<PaletteIcon color="primary" />}
            title="Action Button Colors"
            subheader="Customize the color of each action button"
          />
          <Divider />
          <CardContent>
            <Grid container spacing={2}>
              {ACTION_BUTTONS.map(({ key, label }) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        component="input"
                        type="color"
                        value={actionColors[key] || DEFAULT_COLORS[key]}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        style={{
                          width: 40,
                          height: 36,
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          borderRadius: 4,
                        }}
                      />
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600}>{label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {actionColors[key] || DEFAULT_COLORS[key]}
                        </Typography>
                      </Box>
                      <Tooltip title={`Preview ${label} button`}>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{
                            bgcolor: actionColors[key] || DEFAULT_COLORS[key],
                            '&:hover': {
                              bgcolor: actionColors[key] || DEFAULT_COLORS[key],
                              filter: 'brightness(0.9)',
                            },
                            minWidth: 'auto',
                            px: 1.5,
                          }}
                        >
                          {label}
                        </Button>
                      </Tooltip>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

      </Stack>

      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title="Admin Confirmation"
        description="Enter admin password to save general settings."
      />
    </MainLayout>
  );
}
