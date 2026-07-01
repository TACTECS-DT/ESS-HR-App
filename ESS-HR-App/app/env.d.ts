/**
 * Type declarations for variables imported from the .env file via react-native-dotenv.
 * Every key defined in .env must have a matching declaration here.
 */
declare module '@env' {
  /** 'odoo' | 'django' — selects which backend the app talks to */
  export const ACTIVE_BACKEND: string;

  /** Central ESS Admin server root (no path), e.g. http://192.168.1.10:8069 — Step 1 of login */
  export const ESS_ADMIN_URL: string;

  /** Django / middleware server, e.g. https://api.ess-hr.app/v1 */
  export const DJANGO_BASE_URL: string;
}
