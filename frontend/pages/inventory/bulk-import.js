import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { useSnackbar } from 'notistack';
import MainLayout from '../../components/Layout/MainLayout';
import PageHeader from '../../components/Common/PageHeader';
import { bulkImportInventory } from '../../utils/api';

const TEMPLATE_HEADERS = [
  'productName', 'brand', 'supplier', 'category', 'quantity',
  'cost', 'srp', 'zone', 'bin', 'rack', 'location',
  'warehouse', 'type', 'unit', 'vatType', 'expirationDate',
];

const SAMPLE_ROWS = [
  {
    productName: 'Sample Product A', brand: 'Brand X', supplier: 'Supplier Co', category: 'Electronics',
    quantity: 100, cost: 500, srp: 750, zone: 'Zone A', bin: 'Bin 1', rack: 'Rack 1',
    location: 'Main Warehouse', warehouse: 'WH-001', type: 'Goods', unit: 'pcs', vatType: 'vatable', expirationDate: '',
  },
  {
    productName: 'Sample Product B', brand: 'Brand Y', supplier: 'Distributor Inc', category: 'Food',
    quantity: 200, cost: 50, srp: 80, zone: 'Zone B', bin: 'Bin 2', rack: 'Rack 2',
    location: 'Cold Storage', warehouse: 'WH-002', type: 'Perishable', unit: 'kg', vatType: 'vat-exempt', expirationDate: '2025-12-31',
  },
];

const STEPS = ['Download Template', 'Upload File', 'Preview Data', 'Import'];

function DropZone({ onFileDrop, file }) {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileDrop(dropped);
  };

  const handleChange = (e) => {
    if (e.target.files[0]) onFileDrop(e.target.files[0]);
  };

  return (
    <Paper
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      sx={{
        border: '2px dashed',
        borderColor: file ? 'success.main' : 'primary.main',
        borderRadius: 2,
        p: 5,
        textAlign: 'center',
        cursor: 'pointer',
        bgcolor: file ? 'success.50' : 'action.hover',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: 'action.selected' },
      }}
    >
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleChange} />
      <CloudUploadIcon sx={{ fontSize: 60, color: file ? 'success.main' : 'primary.main', mb: 1 }} />
      {file ? (
        <>
          <Typography variant="subtitle1" fontWeight={700} color="success.main">
            {file.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {(file.size / 1024).toFixed(1)} KB — Click to change file
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="subtitle1" fontWeight={600}>
            Drag & drop your Excel file here
          </Typography>
          <Typography variant="body2" color="text.secondary">
            or click to browse — supports .xlsx, .xls, .csv
          </Typography>
        </>
      )}
    </Paper>
  );
}

export default function BulkImportPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [TEMPLATE_HEADERS, ...SAMPLE_ROWS.map((r) => TEMPLATE_HEADERS.map((h) => r[h] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style header row width
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Import');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'inventory_import_template.xlsx');
    enqueueSnackbar('Template downloaded', { variant: 'success' });
    setActiveStep(1);
  };

  const handleFileSelect = (f) => {
    setFile(f);
    setRows([]);
    setResult(null);
  };

  const parseFile = () => {
    if (!file) {
      enqueueSnackbar('Please select a file first', { variant: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (parsed.length === 0) {
          enqueueSnackbar('No data found in file', { variant: 'warning' });
          return;
        }
        setRows(parsed);
        setActiveStep(2);
        enqueueSnackbar(`${parsed.length} rows loaded`, { variant: 'info' });
      } catch (err) {
        enqueueSnackbar('Failed to parse file. Make sure it is a valid Excel or CSV.', { variant: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setProgress(10);
    try {
      setProgress(40);
      const res = await bulkImportInventory(rows);
      setProgress(100);
      const data = res.data.data || res.data;
      setResult({
        imported: data.imported ?? rows.length,
        failed: data.failed ?? 0,
        errors: data.errors || [],
      });
      setActiveStep(3);
      enqueueSnackbar(`Import complete: ${data.imported ?? rows.length} items imported`, { variant: 'success' });
    } catch (err) {
      setProgress(0);
      const msg = err?.response?.data?.message || 'Import failed';
      enqueueSnackbar(msg, { variant: 'error' });
      const errData = err?.response?.data;
      if (errData?.errors) {
        setResult({ imported: errData.imported || 0, failed: errData.failed || rows.length, errors: errData.errors });
        setActiveStep(3);
      }
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    setProgress(0);
    setActiveStep(0);
  };

  const previewCols = rows.length > 0 ? Object.keys(rows[0]).slice(0, 8) : [];

  return (
    <MainLayout title="Bulk Import">
      <PageHeader
        title="Bulk Import Inventory"
        subtitle="Import multiple inventory items from Excel"
        icon={<UploadFileIcon />}
        color="#1b5e20"
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Bulk Import' }]}
      />

      <Paper elevation={2} sx={{ borderRadius: 2, p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step 1 — Download Template */}
      <Paper elevation={2} sx={{ borderRadius: 2, p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1}>
          Step 1 — Download Template
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Download the Excel template with the required columns. Fill it in and upload it in the next step.
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={downloadTemplate}
        >
          Download Template
        </Button>
      </Paper>

      {/* Step 2 — Upload File */}
      <Paper elevation={2} sx={{ borderRadius: 2, p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Step 2 — Upload File
        </Typography>
        <DropZone onFileDrop={handleFileSelect} file={file} />
        {file && (
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="secondary" onClick={parseFile}>
              Parse & Preview
            </Button>
          </Box>
        )}
      </Paper>

      {/* Step 3 — Preview */}
      {rows.length > 0 && (
        <Paper elevation={2} sx={{ borderRadius: 2, p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Step 3 — Preview ({rows.length} rows)
            </Typography>
            <Chip label={`${rows.length} rows`} color="primary" size="small" />
          </Box>
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  {previewCols.map((col) => (
                    <TableCell key={col} sx={{ fontWeight: 700 }}>{col}</TableCell>
                  ))}
                  {Object.keys(rows[0]).length > 8 && (
                    <TableCell sx={{ fontWeight: 700 }}>...</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.slice(0, 20).map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{idx + 1}</TableCell>
                    {previewCols.map((col) => (
                      <TableCell key={col}>{String(row[col] ?? '')}</TableCell>
                    ))}
                    {Object.keys(rows[0]).length > 8 && <TableCell color="text.secondary">...</TableCell>}
                  </TableRow>
                ))}
                {rows.length > 20 && (
                  <TableRow>
                    <TableCell colSpan={previewCols.length + 2} align="center">
                      <Typography variant="caption" color="text.secondary">
                        ...and {rows.length - 20} more rows
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />

          {importing && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" mb={0.5}>Importing...</Typography>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleImport}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
          >
            {importing ? 'Importing...' : `Import ${rows.length} Items`}
          </Button>
        </Paper>
      )}

      {/* Step 4 — Result */}
      {result && (
        <Paper elevation={2} sx={{ borderRadius: 2, p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>
            Step 4 — Import Result
          </Typography>

          <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6" fontWeight={700} color="success.main">
                {result.imported} Imported
              </Typography>
            </Box>
            {result.failed > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorIcon color="error" />
                <Typography variant="h6" fontWeight={700} color="error.main">
                  {result.failed} Failed
                </Typography>
              </Box>
            )}
          </Box>

          {result.errors && result.errors.length > 0 && (
            <>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Failed Rows:</Typography>
              <TableContainer sx={{ maxHeight: 240 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.errors.map((err, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{err.row ?? idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error">{err.message || String(err)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={reset}>
              Start New Import
            </Button>
          </Box>
        </Paper>
      )}
    </MainLayout>
  );
}
