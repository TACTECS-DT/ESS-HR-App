import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {useAppSelector} from './useAppSelector';
import {useErrorModal} from '../context/ErrorModalContext';

interface ApiErrorDetail {
  code?: string;
  message?: string;
  message_ar?: string;
}

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: {
      error?: ApiErrorDetail;
      message?: string;
    };
  };
  message?: string;
}

/**
 * Central error display hook — single source of truth for ALL error display.
 *
 * Exports:
 *   showError(err)           — API / network errors from mutations / queries
 *   showValidationError(msg) — local input validation (required fields, bad input, etc.)
 *
 * Both route through the Odoo-style ErrorModal so every visual change
 * (layout, colours, wording) only needs to be made in ErrorModal.tsx.
 *
 * Dev mode (toggled in Settings):
 *   showError     → always shows code + HTTP status in the "Show More" section.
 *                   In dev mode the panel starts expanded so details are
 *                   immediately visible without an extra tap.
 *
 *   showValidationError → plain modal with no dev details (local check, no API).
 */
export function useApiError() {
  const {t} = useTranslation();
  const {showModal} = useErrorModal();
  const devMode = useAppSelector(state => state.settings.devMode);
  const lang = useAppSelector(state => state.settings.language);

  // ── API / network errors ──────────────────────────────────────────────────
  const showError = useCallback(
    (err: unknown, fallback?: string) => {
      const e = err as AxiosLikeError;
      const errorDetail = e?.response?.data?.error;
      const httpStatus = e?.response?.status;

      const userMessage =
        (lang === 'ar' ? errorDetail?.message_ar : undefined) ||
        errorDetail?.message ||
        e?.response?.data?.message ||
        e?.message ||
        fallback ||
        t('common.errorGeneric', 'An error occurred. Please try again.');

      const code = errorDetail?.code;

      // In dev mode, open the modal with the details section pre-expanded
      // by including a synthetic title that signals dev context.
      showModal({
        title: devMode && code
          ? `${t('common.error')}  ·  ${code}`
          : t('common.error'),
        message: userMessage,
        code,
        httpStatus,
      });
    },
    [devMode, lang, showModal, t],
  );

  // ── Local validation errors ───────────────────────────────────────────────
  const showValidationError = useCallback(
    (message: string) => {
      showModal({
        title: t('common.error'),
        message,
        // no code / httpStatus — "Show More" button won't appear
      });
    },
    [showModal, t],
  );

  return {showError, showValidationError};
}
