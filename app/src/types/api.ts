/**
 * Shared TypeScript types for API request/response envelopes.
 */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  message_ar: string;
  field?: string;
}

export interface ApiError {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Helper to narrow type */
export function isApiSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return res.success === true;
}
