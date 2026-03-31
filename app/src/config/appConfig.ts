/**
 * App Configuration — single source of truth for environment and design tokens.
 *
 * Everything is here: backend / API settings and all design tokens.
 * env.ts and theme.ts re-export from this file so all existing imports keep working.
 *
 * Role-based access control stays in roleAccess.ts (business logic, not config).
 *
 * ─── To switch backends ───────────────────────────────────────────────────────
 *   Edit ACTIVE_BACKEND in .env, then restart Metro bundler.
 *
 *   mock   → axios-mock-adapter intercepts all calls locally (no server needed)
 *   odoo   → calls go directly to ODOO_BASE_URL
 *            ODOO_BASE_URL must include the /ess/api prefix so API_MAP paths append correctly
 *            e.g.  http://your-odoo-server.com/ess/api
 *   django → calls go through the Django middleware at DJANGO_BASE_URL
 *            Django mirrors the same REST paths — API_MAP needs no change
 *            e.g.  https://api.ess-hr.app/v1
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENVIRONMENT / BACKEND  (source: .env)
// ─────────────────────────────────────────────────────────────────────────────
import {
  ACTIVE_BACKEND,
  ESS_ADMIN_URL,
  ODOO_BASE_URL,
  DJANGO_BASE_URL,
  MOCK_DELAY_MIN,
  MOCK_DELAY_MAX,
} from '@env';

export type BackendMode = 'mock' | 'odoo' | 'django';

const _backend = ACTIVE_BACKEND as BackendMode;

function _resolveBaseUrl(mode: BackendMode): string {
  if (mode === 'odoo')   {return ODOO_BASE_URL;}
  if (mode === 'django') {return DJANGO_BASE_URL;}
  return DJANGO_BASE_URL; // mock — value ignored; mock adapter intercepts all calls
}

export const ENV = {
  /** Active backend: 'mock' | 'odoo' | 'django' */
  ACTIVE_BACKEND: _backend,
  /** True only in mock mode — enables axios-mock-adapter */
  MOCK_MODE: _backend === 'mock',
  /** Base URL prepended to every API_MAP path by the axios client */
  API_BASE_URL: _resolveBaseUrl(_backend),
  /**
   * Central ESS Admin server root URL (no path suffix).
   * Used for Step 1 of login: POST /ess/admin/api/validate
   * This is the ONLY server URL fixed in .env — all client URLs are user-entered.
   */
  ESS_ADMIN_URL,
  /** Odoo client server root + /ess/api prefix — dev fallback only */
  ODOO_BASE_URL,
  /** Django / middleware server root — edit in .env */
  DJANGO_BASE_URL,
  MOCK_DELAY_MIN: Number(MOCK_DELAY_MIN),
  MOCK_DELAY_MAX: Number(MOCK_DELAY_MAX),
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 2. DESIGN TOKENS  (colors, typography, spacing, radii, themes)
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  primary:      '#007AFF',
  primaryDark:  '#0055CC',
  primaryLight: '#4DA3FF',
  // Status
  success: '#34C759',
  warning: '#FF9500',
  error:   '#FF3B30',
  info:    '#5AC8FA',
  // Neutrals
  white:   '#FFFFFF',
  black:   '#000000',
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
  statusDraft:     '#8E8E93',
  statusPending:   '#FF9500',
  statusApproved:  '#34C759',
  statusRefused:   '#FF3B30',
  statusValidated: '#007AFF',
  statusPaid:      '#34C759',
  statusDone:      '#34C759',
  statusActive:    '#007AFF',
} as const;

export const lightTheme = {
  background:       '#F2F2F7',
  surface:          '#FFFFFF',
  surfaceSecondary: '#F9F9F9',
  border:           '#E5E5EA',
  text:             '#000000',
  textSecondary:    '#636366',
  textPlaceholder:  '#C7C7CC',
  tabBar:           '#FFFFFF',
  header:           '#FFFFFF',
  card:             '#FFFFFF',
  isDark:           false,
};

export const darkTheme = {
  background:       '#1C1C1E',
  surface:          '#2C2C2E',
  surfaceSecondary: '#3A3A3C',
  border:           '#38383A',
  text:             '#FFFFFF',
  textSecondary:    '#AEAEB2',
  textPlaceholder:  '#48484A',
  tabBar:           '#1C1C1E',
  header:           '#1C1C1E',
  card:             '#2C2C2E',
  isDark:           true,
};

export type Theme = typeof lightTheme;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const radius = {
  sm:    6,
  md:    12,
  lg:    16,
  xl:    24,
  round: 999,
} as const;

export const fontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

export const fontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};

/** Map a record status string to its display color. */
export function statusColor(status: string): string {
  switch (status) {
    case 'draft':                                        return colors.statusDraft;
    case 'pending':                                      return colors.statusPending;
    case 'approved': case 'validated': case 'paid':
    case 'done':     case 'active':                      return colors.statusApproved;
    case 'refused':  case 'rejected':                   return colors.statusRefused;
    default:                                             return colors.statusDraft;
  }
}
