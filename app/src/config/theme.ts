/**
 * App design tokens — colors, typography, spacing, border radii.
 * Two themes: light and dark.
 */

export const colors = {
  // Brand
  primary: '#007AFF',
  primaryDark: '#0055CC',
  primaryLight: '#4DA3FF',
  // Status
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F2F2F7',
  gray200: '#E5E5EA',
  gray300: '#D1D1D6',
  gray400: '#C7C7CC',
  gray500: '#AEAEB2',
  gray600: '#8E8E93',
  gray700: '#636366',
  gray800: '#48484A',
  gray900: '#3A3A3C',
  // Status chips
  statusDraft: '#8E8E93',
  statusPending: '#FF9500',
  statusApproved: '#34C759',
  statusRefused: '#FF3B30',
  statusValidated: '#007AFF',
  statusPaid: '#34C759',
  statusDone: '#34C759',
  statusActive: '#007AFF',
} as const;

export const lightTheme = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9F9F9',
  border: '#E5E5EA',
  text: '#000000',
  textSecondary: '#636366',
  textPlaceholder: '#C7C7CC',
  tabBar: '#FFFFFF',
  header: '#FFFFFF',
  card: '#FFFFFF',
  isDark: false,
};

export const darkTheme = {
  background: '#1C1C1E',
  surface: '#2C2C2E',
  surfaceSecondary: '#3A3A3C',
  border: '#38383A',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textPlaceholder: '#48484A',
  tabBar: '#1C1C1E',
  header: '#1C1C1E',
  card: '#2C2C2E',
  isDark: true,
};

export type Theme = typeof lightTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Map status strings to colors. */
export function statusColor(status: string): string {
  switch (status) {
    case 'draft': return colors.statusDraft;
    case 'pending': return colors.statusPending;
    case 'approved': case 'validated': case 'paid': case 'done': case 'active': return colors.statusApproved;
    case 'refused': case 'rejected': return colors.statusRefused;
    default: return colors.statusDraft;
  }
}
