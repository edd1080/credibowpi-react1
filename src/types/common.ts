// Common TypeScript types used throughout the application

export type ApplicationStatus =
  | 'draft'
  | 'kyc_pending'
  | 'form_in_progress'
  | 'ready_for_review'
  | 'submitted'
  | 'approved'
  | 'rejected';

export type SyncStatus =
  | 'local_only'
  | 'sync_pending'
  | 'sync_in_progress'
  | 'synced'
  | 'sync_failed';

export type DocumentType = 'dpi_front' | 'dpi_back' | 'selfie' | 'attachment';

export type Theme = 'light' | 'dark' | 'system';

export type Language = 'es' | 'en';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
