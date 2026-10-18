import {createTheme} from '@mui/material/styles'
import {type Colors, type ColorScheme, palette} from '@hse/shared/theme'
import LinkBehavior from '@/components/LinkBehavior'

// Material Design 3 on top of MUI: the shared M3 color roles become the MUI palette (plus `palette.md`
// for roles MUI has no slot for), with the M3 type scale, shapes and component styles.

declare module '@mui/material/styles' {
  interface Palette {
    md: Colors
  }
  interface PaletteOptions {
    md?: Colors
  }
}

/** CSS variable of an M3 color role for the active scheme, e.g. `md('primaryContainer')`. */
export const md = (role: keyof Colors) => `var(--mui-palette-md-${role})`

const muiPalette = (c: Colors) => ({
  md: c,
  primary: { main: c.primary, contrastText: c.onPrimary },
  secondary: { main: c.secondary, contrastText: c.onSecondary },
  error: { main: c.error, contrastText: c.onError },
  warning: { main: c.warning, contrastText: c.onWarning },
  info: { main: c.tertiary, contrastText: c.onTertiary },
  success: { main: c.primary, contrastText: c.onPrimary },
  background: { default: c.surface, paper: c.surfaceContainerLow },
  text: { primary: c.onSurface, secondary: c.onSurfaceVariant },
  divider: c.outlineVariant,
})

const scheme = (s: ColorScheme) => ({ palette: muiPalette(palette[s]) })

const type = (size: number, lineHeight: number, weight = 400, tracking = 0) => ({
  fontSize: `${size / 16}rem`,
  lineHeight: `${lineHeight / 16}rem`,
  fontWeight: weight,
  letterSpacing: `${tracking / 16}rem`,
})

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-theme' },
  colorSchemes: { light: scheme('light'), dark: scheme('dark') },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Roboto Flex Variable', Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif",
    // M3 type scale: display / headline / title / body / label.
    h1: type(45, 52),
    h2: type(32, 40),
    h3: type(28, 36),
    h4: type(24, 32),
    h5: type(22, 28),
    h6: type(16, 24, 500, 0.15),
    subtitle1: type(16, 24, 500, 0.15),
    subtitle2: type(14, 20, 500, 0.1),
    body1: type(16, 24, 400, 0.5),
    body2: type(14, 20, 400, 0.25),
    caption: type(12, 16, 400, 0.4),
    overline: { ...type(11, 16, 500, 0.5), textTransform: 'uppercase' },
    button: { ...type(14, 20, 500, 0.1), textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          paddingLeft: 'var(--inset-left)',
          paddingRight: 'var(--inset-right)',
          WebkitFontSmoothing: 'antialiased',
        },
      },
    },
    MuiLink: {
      defaultProps: { component: LinkBehavior, underline: 'hover' },
    },
    MuiButtonBase: {
      defaultProps: { LinkComponent: LinkBehavior },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 24, minHeight: 40 },
        sizeSmall: { paddingInline: 16, minHeight: 32 },
        sizeLarge: { minHeight: 48, fontSize: '1rem' },
        text: { paddingInline: 12 },
        outlined: { borderColor: md('outline') },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { color: md('onSurfaceVariant') } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      styleOverrides: { root: { backgroundColor: md('surfaceContainerLow'), borderRadius: 12 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: { root: { backgroundColor: md('surface'), color: md('onSurface') } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, height: 32, fontWeight: 500 },
        outlined: { borderColor: md('outlineVariant') },
        sizeSmall: { height: 24 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 4 },
        notchedOutline: { borderColor: md('outline') },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: '3px 3px 0 0' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 48, color: md('onSurfaceVariant'), '&.Mui-selected': { color: md('primary') } },
      },
    },
    MuiToggleButtonGroup: {
      // M3 segmented buttons.
      styleOverrides: {
        root: { borderRadius: 999 },
        grouped: {
          paddingInline: 16,
          minHeight: 40,
          borderColor: md('outline'),
          '&:first-of-type': { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
          '&:last-of-type': { borderTopRightRadius: 999, borderBottomRightRadius: 999 },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          gap: 8,
          textTransform: 'none',
          color: md('onSurface'),
          fontWeight: 500,
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: md('secondaryContainer'),
            color: md('onSecondaryContainer'),
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          alignItems: 'flex-start',
          variants: (
            [
              ['error', 'errorContainer', 'onErrorContainer'],
              ['warning', 'warningContainer', 'onWarningContainer'],
              ['success', 'primaryContainer', 'onPrimaryContainer'],
              ['info', 'secondaryContainer', 'onSecondaryContainer'],
            ] as const
          ).map(([severity, bg, fg]) => ({
            props: { variant: 'standard', severity },
            style: { backgroundColor: md(bg), color: md(fg) },
          })),
        },
        icon: { color: 'inherit !important' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 6, borderRadius: 999, backgroundColor: md('surfaceContainerHighest') },
        bar: { borderRadius: 999 },
      },
    },
    MuiMenu: {
      styleOverrides: { paper: { backgroundColor: md('surfaceContainer'), borderRadius: 4, minWidth: 200 } },
    },
    MuiPopover: {
      defaultProps: { slotProps: { paper: { elevation: 2 } } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 28, backgroundColor: md('surfaceContainerHigh') } },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: md('onSurfaceVariant') } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: md('outlineVariant') } },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: md('outlineVariant') } },
    },
    MuiBottomNavigation: {
      // M3 navigation bar.
      styleOverrides: { root: { height: 80, backgroundColor: md('surfaceContainer') } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          gap: 4,
          minWidth: 0,
          paddingInline: 4,
          color: md('onSurfaceVariant'),
          '& .MuiSvgIcon-root': {
            width: 64,
            height: 32,
            padding: '4px 20px',
            borderRadius: 999,
            transition: 'background-color 150ms',
          },
          '&.Mui-selected': { color: md('onSurface') },
          '&.Mui-selected .MuiSvgIcon-root': {
            backgroundColor: md('secondaryContainer'),
            color: md('onSecondaryContainer'),
          },
        },
        label: {
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.03rem',
          whiteSpace: 'nowrap',
          '&.Mui-selected': { fontSize: '0.75rem', fontWeight: 700 },
        },
      },
    },
  },
})
