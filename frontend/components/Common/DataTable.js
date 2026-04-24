import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';

/**
 * DataTable
 *
 * Props:
 *   columns             {Array<{ field, headerName, width, renderCell }>}
 *   rows                {Array<object>}
 *   loading             {boolean}
 *   page                {number}   zero-based
 *   rowsPerPage         {number}
 *   total               {number}
 *   onPageChange        {(event, newPage) => void}
 *   onRowsPerPageChange {(event) => void}
 *   searchValue         {string}
 *   onSearchChange      {(value) => void}
 *   actions             {React.ReactNode}
 *   onExport            {(type: 'print'|'pdf'|'excel') => void}
 *   title               {string}
 */
export default function DataTable({
  columns = [],
  rows = [],
  loading = false,
  page = 0,
  rowsPerPage = 10,
  total = 0,
  onPageChange,
  onRowsPerPageChange,
  searchValue = '',
  onSearchChange,
  actions,
  onExport,
  title,
  getRowSx,
}) {
  const showExport = Boolean(onExport);

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {/* ── Toolbar ── */}
      {(title || onSearchChange || actions || showExport) && (
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fafafa',
          }}
        >
          {title && (
            <Typography variant="subtitle1" fontWeight={700} sx={{ mr: 'auto' }}>
              {title}
            </Typography>
          )}

          {onSearchChange && (
            <TextField
              size="small"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: 240,
                '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' },
              }}
            />
          )}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: title ? 0 : 'auto' }}>
            {actions}

            {showExport && (
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="Print">
                  <Button onClick={() => onExport('print')} sx={{ px: 1.2 }}>
                    <PrintIcon fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="Export PDF">
                  <Button onClick={() => onExport('pdf')} sx={{ px: 1.2 }}>
                    <PictureAsPdfIcon fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="Export Excel">
                  <Button onClick={() => onExport('excel')} sx={{ px: 1.2 }}>
                    <TableChartIcon fontSize="small" />
                  </Button>
                </Tooltip>
              </ButtonGroup>
            )}
          </Stack>
        </Box>
      )}

      {/* ── Loading bar ── */}
      {loading && <LinearProgress sx={{ height: 2 }} />}

      {/* ── Table ── */}
      <TableContainer>
        <Table size="small" sx={{ minWidth: 400 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8faff' }}>
              {columns.map((col) => (
                <TableCell
                  key={col.field}
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    py: 1.5,
                    width: col.width,
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                  }}
                >
                  {col.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && rows.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col.field}>
                        <Skeleton variant="text" width="80%" height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1,
                          color: 'text.disabled',
                        }}
                      >
                        <InboxIcon sx={{ fontSize: 48 }} />
                        <Typography variant="body2">No records found</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              : rows.map((row, idx) => (
                  <TableRow
                    key={row._id || row.id || idx}
                    hover
                    sx={getRowSx ? getRowSx(row) : {
                      '&:last-child td': { borderBottom: 0 },
                      '&:hover': { bgcolor: '#f0f7ff' },
                    }}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.field} sx={{ py: 1.2, fontSize: 13 }}>
                        {col.renderCell
                          ? col.renderCell({ value: row[col.field], row })
                          : (() => {
                            const value = row[col.field];
                            // If value is an object, extract name property; otherwise render as-is
                            if (value && typeof value === 'object' && !Array.isArray(value)) {
                              return value.name || value.title || String(value._id || value.id || '—');
                            }
                            return value ?? '—';
                          })()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Pagination ── */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fafafa' }}>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{ '& .MuiTablePagination-toolbar': { minHeight: 48 } }}
        />
      </Box>
    </Card>
  );
}
