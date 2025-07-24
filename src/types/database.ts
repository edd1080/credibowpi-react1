// Database types and interfaces for offline-first data infrastructure

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

export type DocumentType = 
  | 'dpi_front' 
  | 'dpi_back' 
  | 'selfie' 
  | 'attachment';

export type DocumentStatus = 
  | 'captured' 
  | 'validated' 
  | 'uploaded' 
  | 'failed';

export type SyncOperationType = 
  | 'create' 
  | 'update' 
  | 'upload';

export type SyncEntityType = 
  | 'application' 
  | 'document';

// Database row interfaces
export interface ApplicationRow {
  id: string;
  agent_id: string;
  status: ApplicationStatus;
  sync_status: SyncStatus;
  data: string; // JSON blob
  created_at: number;
  updated_at: number;
  synced_at?: number;
}

export interface DocumentRow {
  id: string;
  application_id: string;
  type: DocumentType;
  local_path: string;
  remote_path?: string;
  status: DocumentStatus;
  metadata: string; // JSON blob
  created_at: number;
}

export interface SyncQueueRow {
  id: string;
  operation_type: SyncOperationType;
  entity_type: SyncEntityType;
  entity_id: string;
  payload: string; // JSON blob
  retry_count: number;
  created_at: number;
  last_attempt?: number;
}

// Application data structures
export interface KYCData {
  dpiImages: {
    front?: string; // local file path
    back?: string; // local file path
  };
  selfieImage?: string; // local file path
  isComplete: boolean;
  completedAt?: Date;
}

export interface IdentificationData {
  firstName: string;
  lastName: string;
  dpi: string;
  birthDate: Date;
  nationality: string;
  maritalStatus: string;
  address: {
    street: string;
    city: string;
    department: string;
    postalCode: string;
  };
  phone: string;
  email: string;
}

export interface FinancialData {
  monthlyIncome: number;
  monthlyExpenses: number;
  assets: {
    type: string;
    value: number;
    description: string;
  }[];
  liabilities: {
    type: string;
    amount: number;
    monthlyPayment: number;
    creditor: string;
  }[];
}

export interface BusinessData {
  employmentType: 'employed' | 'self_employed' | 'business_owner' | 'unemployed';
  companyName?: string;
  position?: string;
  workAddress?: string;
  workPhone?: string;
  businessType?: string;
  businessDescription?: string;
  yearsInBusiness?: number;
}

export interface GuaranteeData {
  guarantors: {
    id: string;
    firstName: string;
    lastName: string;
    dpi: string;
    phone: string;
    email: string;
    relationship: string;
    monthlyIncome: number;
  }[];
  collateral: {
    type: string;
    description: string;
    estimatedValue: number;
    location?: string;
  }[];
}

export interface AttachmentData {
  id: string;
  name: string;
  type: string;
  localPath: string;
  remotePath?: string;
  size: number;
  uploadedAt?: Date;
}

export interface SignatureData {
  signatureImage: string; // base64 or local file path
  signedAt: Date;
  signedBy: string; // client name
}

export interface ReviewData {
  reviewedSections: string[];
  isComplete: boolean;
  reviewedAt?: Date;
  notes?: string;
}

// Complete application data structure
export interface CreditApplication {
  id: string;
  agentId: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus;
  
  // Application sections
  kyc: KYCData;
  identification: IdentificationData;
  finances: FinancialData;
  business: BusinessData;
  guarantees: GuaranteeData;
  attachments: AttachmentData[];
  signature?: SignatureData;
  review: ReviewData;
}

// Document metadata
export interface DocumentMetadata {
  timestamp: Date;
  quality: number;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
  checksum?: string;
}

export interface DocumentCapture {
  id: string;
  type: DocumentType;
  localPath: string;
  remotePath?: string;
  status: DocumentStatus;
  metadata: DocumentMetadata;
}

// Sync operation payload
export interface SyncOperation {
  id: string;
  operationType: SyncOperationType;
  entityType: SyncEntityType;
  entityId: string;
  payload: any;
  retryCount: number;
  createdAt: Date;
  lastAttempt?: Date;
}