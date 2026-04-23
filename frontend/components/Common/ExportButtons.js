import React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useSettings } from '../../context/SettingsContext';

/**
 * ExportButtons
 *
 * Props:
 *   onPrint       {() => void}
 *   onPDF         {() => void}
 *   onExcel       {() => void}
 *   actionColors  {object}  — optional override; falls back to SettingsContext
 */
export default function ExportButtons({ onPrint, onPDF, onExcel, actionColors: colorsProp }) {
  const { settings } = useSettings();
  const colors = colorsProp || settings.actionColors || {};

  return (
    <ButtonGroup variant="outlined" size="small">
      {onPrint && (
        <Tooltip title="Print">
          <Button
            onClick={onPrint}
            startIcon={<PrintIcon />}
            sx={{
              color: colors.print || '#607d8b',
              borderColor: colors.print || '#607d8b',
              '&:hover': { borderColor: colors.print || '#607d8b', bgcolor: 'action.hover' },
            }}
          >
            Print
          </Button>
        </Tooltip>
      )}
      {onPDF && (
        <Tooltip title="Export PDF">
          <Button
            onClick={onPDF}
            startIcon={<PictureAsPdfIcon />}
            sx={{
              color: colors.pdf || '#e91e63',
              borderColor: colors.pdf || '#e91e63',
              '&:hover': { borderColor: colors.pdf || '#e91e63', bgcolor: 'action.hover' },
            }}
          >
            PDF
          </Button>
        </Tooltip>
      )}
      {onExcel && (
        <Tooltip title="Export Excel">
          <Button
            onClick={onExcel}
            startIcon={<TableChartIcon />}
            sx={{
              color: colors.excel || '#4caf50',
              borderColor: colors.excel || '#4caf50',
              '&:hover': { borderColor: colors.excel || '#4caf50', bgcolor: 'action.hover' },
            }}
          >
            Excel
          </Button>
        </Tooltip>
      )}
    </ButtonGroup>
  );
}
