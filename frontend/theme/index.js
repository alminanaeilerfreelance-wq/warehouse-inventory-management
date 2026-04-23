import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1565c0',
    },
    secondary: {
      main: '#f57c00',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    actions: {
      add: '#2196f3',
      edit: '#ff9800',
      delete: '#f44336',
      update: '#4caf50',
      print: '#607d8b',
      pdf: '#e91e63',
      excel: '#4caf50',
      import: '#9c27b0',
      calendar: '#00bcd4',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
