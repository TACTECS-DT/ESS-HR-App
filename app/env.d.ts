/**
 * Type declarations for variables imported from the .env file via react-native-dotenv.
 * Every key defined in .env must have a matching declaration here.
 */
declare module '@env' {
  /** 'mock' | 'odoo' | 'django' — selects which backend the app talks to */
  export const ACTIVE_BACKEND: string;

  /** 'true' | 'false' — disables all network calls and uses local mock data */
  export const MOCK_MODE: string;

  /** Central ESS Admin server root (no path), e.g. http://192.168.1.10:8055 — Step 1 of login */
  export const ESS_ADMIN_URL: string;

  /** Django / middleware server, e.g. https://api.ess-hr.app/v1 */
  export const DJANGO_BASE_URL: string;

  /** Minimum simulated network delay in ms (mock mode only) */
  export const MOCK_DELAY_MIN: string;

  /** Maximum simulated network delay in ms (mock mode only) */
  export const MOCK_DELAY_MAX: string;
}
