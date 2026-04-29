'use client';

import { createTheme } from '@mui/material/styles';

// Enterprise Design Language System Theme
// Based on NDLS-for-Claude-Code/Enterprise/design-tokens.md

export const theme = createTheme({
  palette: {
    primary: {
      main: '#4b37e5', // Primary interactive color
    },
    error: {
      main: '#d8290d',
    },
    warning: {
      main: '#b85006',
    },
    info: {
      main: '#1d6ddc',
    },
    success: {
      main: '#2e7d32',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontSize: '29px',
      fontWeight: 800,
      lineHeight: '40px',
    },
    h2: {
      fontSize: '23px',
      fontWeight: 800,
      lineHeight: '32px',
    },
    h3: {
      fontSize: '19px',
      fontWeight: 800,
      lineHeight: '28px',
    },
    subtitle1: {
      fontSize: '15px',
      fontWeight: 700,
      lineHeight: '24px',
    },
    body1: {
      fontSize: '15px',
      fontWeight: 400,
      lineHeight: '24px',
    },
    body2: {
      fontSize: '15px',
      fontWeight: 500,
      lineHeight: '20px',
    },
    caption: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: 1.66,
    },
  },
  spacing: 4, // Base unit: 4px, so theme.spacing(1) = 4px
  shape: {
    borderRadius: 4, // Default for buttons/inputs
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200, // Most common for forms
      xl: 1536, // Tables
    },
  },
  components: {
    MuiCard: {
      defaultProps: {
        variant: 'outlined', // Enterprise DLS uses outlined, no elevation
      },
      styleOverrides: {
        root: {
          borderRadius: 12, // Cards use 12px radius
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4, // Buttons use 4px radius
          textTransform: 'none', // Don't uppercase button text
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
  },
});
