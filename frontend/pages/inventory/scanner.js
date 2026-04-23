import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Alert from '@mui/material/Alert';
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

import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import StopIcon from '@mui/icons-material/Stop';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import InventoryIcon from '@mui/icons-material/Inventory';

import { useSnackbar } from 'notistack';
import MainLayout from '../../components/Layout/MainLayout';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../utils/api';

function TabPanel({ children, value, index }) {
  return (
    <Box hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

function ScannerCamera({ onScan, scanning, setScanning }) {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const containerId = 'qr-reader-container';

  const startScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode(containerId);
      }
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error('Scanner start error:', err);
    }
  }, [onScan, setScanning]);

  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch (_) {}
    }
    setScanning(false);
  }, [setScanning]);

  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <Box>
      <Box
        id={containerId}
        ref={scannerRef}
        sx={{
          width: '100%',
          minHeight: 300,
          bgcolor: 'grey.900',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!scanning && (
          <Box sx={{ textAlign: 'center', color: 'grey.400' }}>
            <QrCodeScannerIcon sx={{ fontSize: 80, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2" color="grey.400">
              Click Start Scan to activate camera
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
        {!scanning ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<QrCodeScannerIcon />}
            onClick={startScanner}
            size="large"
          >
            Start Scan
          </Button>
        ) : (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={stopScanner}
            size="large"
          >
            Stop Scan
          </Button>
        )}
      </Box>
    </Box>
  );
}

function ProductCard({ product }) {
  if (!product) return null;
  const stockColor =
    product.quantity <= 0 ? 'error' : product.quantity <= (product.reorderPoint || 5) ? 'warning' : 'success';
  const stockLabel =
    product.quantity <= 0 ? 'Out of Stock' : product.quantity <= (product.reorderPoint || 5) ? 'Low Stock' : 'In Stock';

  return (
    <Card elevation={2} sx={{ borderRadius: 2, mt: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{product.productName || product.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              SKU: {product.sku || product.barcode || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Brand: {product.brand?.name || product.brand || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Category: {product.category?.name || product.category || '—'}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Chip label={stockLabel} color={stockColor} size="small" sx={{ mb: 1 }} />
            <Typography variant="h5" fontWeight={700} color="primary">
              {product.quantity ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">In Stock</Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Location</Typography>
            <Typography variant="body2" fontWeight={600}>
              {product.location?.name || product.location || '—'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Cost / SRP</Typography>
            <Typography variant="body2" fontWeight={600}>
              ₱{(product.cost || 0).toLocaleString('en-PH')} / ₱{(product.srp || 0).toLocaleString('en-PH')}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default function ScannerPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [product, setProduct] = useState(null);
  const [searching, setSearching] = useState(false);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjusting, setAdjusting] = useState(false);
  const [lastScanned, setLastScanned] = useState('');

  const searchByBarcode = useCallback(async (value) => {
    if (!value || value === lastScanned) return;
    setLastScanned(value);
    setSearching(true);
    setProduct(null);
    try {
      const res = await api.get('/inventory', { params: { search: value, limit: 1 } });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.inventory || [];
      if (items.length > 0) {
        setProduct(items[0]);
        enqueueSnackbar(`Found: ${items[0].productName || items[0].name}`, { variant: 'success' });
      } else {
        enqueueSnackbar('No product found for this barcode', { variant: 'warning' });
      }
    } catch (err) {
      enqueueSnackbar('Search failed', { variant: 'error' });
    } finally {
      setSearching(false);
    }
  }, [lastScanned, enqueueSnackbar]);

  const handleScan = useCallback((decoded) => {
    setManualInput(decoded);
    searchByBarcode(decoded);
  }, [searchByBarcode]);

  const handleManualSearch = () => {
    if (!manualInput.trim()) return;
    setLastScanned('');
    searchByBarcode(manualInput.trim());
  };

  const handleAdjust = async (direction) => {
    if (!product) return;
    setAdjusting(true);
    try {
      const qty = direction === 'increment' ? adjustQty : -adjustQty;
      await api.post('/adjustments', {
        inventory: product._id || product.id,
        quantity: qty,
        reason: `Scanner adjustment (${direction})`,
      });
      setProduct((prev) => prev ? { ...prev, quantity: (prev.quantity || 0) + qty } : prev);
      enqueueSnackbar(`Stock ${direction === 'increment' ? 'increased' : 'decreased'} by ${adjustQty}`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Adjustment failed', { variant: 'error' });
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <MainLayout title="Barcode Scanner">
      <PageHeader
        title="Barcode Scanner"
        subtitle="Scan barcodes to look up or adjust inventory"
        icon={<QrCodeScannerIcon />}
        color="#37474f"
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Scanner' }]}
      />

      <Paper elevation={2} sx={{ borderRadius: 2, p: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setProduct(null); setLastScanned(''); }}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Scan to Find" icon={<SearchIcon />} iconPosition="start" />
          <Tab label="Scan to Adjust" icon={<InventoryIcon />} iconPosition="start" />
        </Tabs>

        {/* Manual Entry */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            label="Enter barcode / SKU manually"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {searching ? (
                    <CircularProgress size={20} />
                  ) : (
                    <IconButton onClick={handleManualSearch} size="small">
                      <SearchIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" onClick={handleManualSearch} disabled={searching}>
            Search
          </Button>
        </Box>

        {/* Tab 0: Scan to Find */}
        <TabPanel value={tab} index={0}>
          <ScannerCamera onScan={handleScan} scanning={scanning} setScanning={setScanning} />

          {lastScanned && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Last scanned: <strong>{lastScanned}</strong>
            </Alert>
          )}

          <ProductCard product={product} />
        </TabPanel>

        {/* Tab 1: Scan to Adjust */}
        <TabPanel value={tab} index={1}>
          <ScannerCamera onScan={handleScan} scanning={scanning} setScanning={setScanning} />

          {lastScanned && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Last scanned: <strong>{lastScanned}</strong>
            </Alert>
          )}

          <ProductCard product={product} />

          {product && (
            <Card elevation={1} sx={{ borderRadius: 2, mt: 2, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Adjust Stock
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  color="error"
                  onClick={() => setAdjustQty((v) => Math.max(1, v - 1))}
                  disabled={adjustQty <= 1}
                >
                  <RemoveIcon />
                </IconButton>
                <TextField
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                  size="small"
                  sx={{ width: 80, textAlign: 'center' }}
                  inputProps={{ min: 1, style: { textAlign: 'center' } }}
                />
                <IconButton
                  color="primary"
                  onClick={() => setAdjustQty((v) => v + 1)}
                >
                  <AddIcon />
                </IconButton>

                <Button
                  variant="contained"
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => handleAdjust('increment')}
                  disabled={adjusting}
                >
                  Add Stock
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RemoveIcon />}
                  onClick={() => handleAdjust('decrement')}
                  disabled={adjusting || (product.quantity || 0) < adjustQty}
                >
                  Remove Stock
                </Button>
                {adjusting && <CircularProgress size={24} />}
              </Box>
            </Card>
          )}
        </TabPanel>
      </Paper>
    </MainLayout>
  );
}
