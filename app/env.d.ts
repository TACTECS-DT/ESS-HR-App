/**
 * Type declarations for variables imported from the .env file via react-native-dotenv.
 * Every key defined in .env must have a matching declaration here.
 */
declare module '@env' {
  /** 'mock' | 'odoo' | 'django' — selects which backend the app talks to */
  export const ACTIVE_BACKEND: string;

  /** Odoo server root + base API path, e.g. http://your-odoo-server.com/ess/api */
  export const ODOO_BASE_URL: string;

  /** Django / middleware server, e.g. https://api.ess-hr.app/v1 */
  export const DJANGO_BASE_URL: string;

  /** Minimum simulated network delay in ms (mock mode only) */
  export const MOCK_DELAY_MIN: string;

  /** Maximum simulated network delay in ms (mock mode only) */
  export const MOCK_DELAY_MAX: string;
}
