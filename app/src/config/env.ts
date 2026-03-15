/**
 * App environment configuration.
 * MOCK_MODE = true  → all API calls are intercepted by axios-mock-adapter (Stage 1)
 * MOCK_MODE = false → all API calls go to the real Django backend (Stage 3)
 */
export const ENV = {
  MOCK_MODE: true,
  API_BASE_URL: 'https://api.ess-hr.app/v1',
  MOCK_DELAY_MIN: 300,
  MOCK_DELAY_MAX: 800,
} as const;
