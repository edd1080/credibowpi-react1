# Database Patterns & Schema

## Overview

Esta guía establece los patrones de base de datos y esquemas para CrediBowpi Mobile, incluyendo el diseño de SQLite, estrategias de sincronización offline-first, patrones de encriptación y manejo de conflictos de datos.

## Table of Contents

1. [SQLite Schema Design](#sqlite-schema-design)
2. [Application Data Structure](#application-data-structure)
3. [Sync Status Management](#sync-status-management)
4. [Encryption Patterns](#encryption-patterns)
5. [Migration Strategies](#migration-strategies)
6. [Data Flow Patterns](#data-flow-patterns)
7. [Offline-First Data Handling](#offline-first-data-handling)
8. [Sync Conflict Resolution](#sync-conflict-resolution)
9. [Data Validation Layers](#data-validation-layers)
10. [Performance Optimization](#performance-optimization)
11. [Backup and Recovery](#backup-and-recovery)

## SQLite Schema Design

### Core Database Schema

```sql
-- Tabla principal de aplicaciones de crédito
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_dpi TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT NOT NULL,
  
  -- Información financiera
  requested_amount REAL NOT NULL,
  requested_term INTEGER NOT NULL,
  monthly_income REAL NOT NULL,
  income_source TEXT NOT NULL,
  
  -- Estado y metadatos
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  
  -- Información de sincronización
  sync_status TEXT NOT NULL DEFAULT 'pending',
  server_id TEXT,
  last_sync_at TEXT,
  sync_version INTEGER DEFAULT 1,
  
  -- Datos encriptados (JSON)
  encrypted_data TEXT,
  
  -- Índices para búsquedas
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Tabla de agentes
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  
  -- Configuración del agente
  max_application_amount REAL DEFAULT 50000,
  daily_application_limit INTEGER DEFAULT 10,
  
  -- Estado y metadatos
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  
  -- Información de sincronización
  sync_status TEXT NOT NULL DEFAULT 'synced',
  server_id TEXT,
  last_sync_at TEXT
);

-- Tabla de documentos
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Metadatos del documento
  upload_date TEXT NOT NULL,
  is_required BOOLEAN DEFAULT 0,
  validation_status TEXT DEFAULT 'pending',
  
  -- Información de sincronización
  sync_status TEXT NOT NULL DEFAULT 'pending',
  server_url TEXT,
  last_sync_at TEXT,
  
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Tabla de fiadores
CREATE TABLE guarantors (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  dpi TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT NOT NULL,
  
  -- Información financiera del fiador
  monthly_income REAL,
  occupation TEXT,
  
  -- Estado y metadatos
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  -- Información de sincronización
  sync_status TEXT NOT NULL DEFAULT 'pending',
  server_id TEXT,
  last_sync_at TEXT,
  
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Tabla de operaciones de sincronización
CREATE TABLE sync_operations (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  entity_type TEXT NOT NULL,    -- 'application', 'document', 'guarantor'
  entity_id TEXT NOT NULL,
  
  -- Datos de la operación
  operation_data TEXT NOT NULL, -- JSON con los datos
  priority INTEGER DEFAULT 1,   -- 1=LOW, 2=NORMAL, 3=HIGH
  
  -- Estado de la operación
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  created_at TEXT NOT NULL,
  scheduled_at TEXT,
  completed_at TEXT,
  
  -- Error handling
  error_message TEXT,
  last_error_at TEXT
);
```### Da
tabase Indexes for Performance

```sql
-- Índices para optimizar consultas frecuentes
CREATE INDEX idx_applications_agent_id ON applications(agent_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_sync_status ON applications(sync_status);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_applications_dpi ON applications(applicant_dpi);

CREATE INDEX idx_documents_application_id ON documents(application_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_sync_status ON documents(sync_status);

CREATE INDEX idx_guarantors_application_id ON guarantors(application_id);
CREATE INDEX idx_guarantors_dpi ON guarantors(dpi);

CREATE INDEX idx_sync_operations_status ON sync_operations(status);
CREATE INDEX idx_sync_operations_entity ON sync_operations(entity_type, entity_id);
CREATE INDEX idx_sync_operations_priority ON sync_operations(priority, created_at);

-- Índice compuesto para consultas de sincronización
CREATE INDEX idx_sync_pending ON sync_operations(status, priority, created_at) 
WHERE status IN ('pending', 'failed');
```

### Database Configuration

```typescript
// Configuración de la base de datos SQLite
export const DATABASE_CONFIG = {
  name: 'credibowpi.db',
  version: 1,
  
  // Configuraciones de SQLite
  settings: {
    // Habilitar WAL mode para mejor concurrencia
    journal_mode: 'WAL',
    
    // Configurar sincronización para mejor rendimiento
    synchronous: 'NORMAL',
    
    // Habilitar foreign keys
    foreign_keys: 'ON',
    
    // Configurar cache size (en páginas de 4KB)
    cache_size: -2000, // 2MB de cache
    
    // Configurar timeout para locks
    busy_timeout: 30000, // 30 segundos
    
    // Habilitar auto_vacuum
    auto_vacuum: 'INCREMENTAL'
  },
  
  // Configuraciones de encriptación
  encryption: {
    enabled: true,
    algorithm: 'AES-256',
    key_derivation: 'PBKDF2',
    iterations: 10000
  }
};

class DatabaseManager {
  private db: SQLite.Database | null = null;
  private isInitialized: boolean = false;
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Abrir base de datos con configuración
      this.db = await SQLite.openDatabase({
        name: DATABASE_CONFIG.name,
        version: DATABASE_CONFIG.version.toString(),
        description: 'CrediBowpi Mobile Database',
        size: 200000, // 200MB
        createFromLocation: undefined
      });
      
      // Aplicar configuraciones de SQLite
      await this.applyDatabaseSettings();
      
      // Crear tablas si no existen
      await this.createTables();
      
      // Ejecutar migraciones pendientes
      await this.runMigrations();
      
      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new DatabaseError('Failed to initialize database', error);
    }
  }
  
  private async applyDatabaseSettings(): Promise<void> {
    const settings = DATABASE_CONFIG.settings;
    
    for (const [key, value] of Object.entries(settings)) {
      await this.executeSql(`PRAGMA ${key} = ${value}`);
    }
  }
  
  private async createTables(): Promise<void> {
    const tables = [
      this.getAgentsTableSQL(),
      this.getApplicationsTableSQL(),
      this.getDocumentsTableSQL(),
      this.getGuarantorsTableSQL(),
      this.getSyncOperationsTableSQL()
    ];
    
    for (const tableSQL of tables) {
      await this.executeSql(tableSQL);
    }
    
    // Crear índices
    await this.createIndexes();
  }
  
  async executeSql(sql: string, params: any[] = []): Promise<SQLite.ResultSet> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, error) => {
            console.error('SQL Error:', error);
            reject(new DatabaseError(`SQL execution failed: ${error.message}`, error));
            return false;
          }
        );
      });
    });
  }
}
```

## Application Data Structure

### Application Entity Model

```typescript
// Modelo de datos para aplicaciones
export interface ApplicationData {
  // Identificadores
  id: string;
  agentId: string;
  serverId?: string;
  
  // Información del solicitante
  applicant: {
    names: string;
    lastNames: string;
    dpi: string;
    nit?: string;
    email?: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    gender: 'male' | 'female';
  };
  
  // Información financiera
  financial: {
    requestedAmount: number;
    requestedTerm: number;
    monthlyIncome: number;
    secondaryIncome?: number;
    incomeSource: 'employee' | 'business_owner' | 'pensioner' | 'remittances';
    expenses: {
      food: number;
      housing: number;
      transportation: number;
      utilities: number;
      education: number;
      healthcare: number;
      other: number;
    };
  };
  
  // Información del negocio (si aplica)
  business?: {
    name: string;
    type: string;
    yearsInBusiness: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    location: string;
  };
  
  // Estado y metadatos
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  
  // Información de sincronización
  syncStatus: SyncStatus;
  syncVersion: number;
  lastSyncAt?: string;
  
  // Referencias a entidades relacionadas
  documents: string[]; // IDs de documentos
  guarantors: string[]; // IDs de fiadores
}

// Enums para estados
export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  PENDING_DOCUMENTS = 'pending_documents',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  DISBURSED = 'disbursed',
  COMPLETED = 'completed'
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SYNCED = 'synced',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}
```

### Data Access Layer

```typescript
// Capa de acceso a datos para aplicaciones
export class ApplicationRepository {
  constructor(private dbManager: DatabaseManager) {}
  
  async create(applicationData: ApplicationData): Promise<ApplicationData> {
    const sql = `
      INSERT INTO applications (
        id, agent_id, applicant_name, applicant_dpi, applicant_email, 
        applicant_phone, requested_amount, requested_term, monthly_income, 
        income_source, status, created_at, updated_at, encrypted_data, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const encryptedData = await this.encryptSensitiveData(applicationData);
    
    const params = [
      applicationData.id,
      applicationData.agentId,
      `${applicationData.applicant.names} ${applicationData.applicant.lastNames}`,
      applicationData.applicant.dpi,
      applicationData.applicant.email,
      applicationData.applicant.phone,
      applicationData.financial.requestedAmount,
      applicationData.financial.requestedTerm,
      applicationData.financial.monthlyIncome,
      applicationData.financial.incomeSource,
      applicationData.status,
      applicationData.createdAt,
      applicationData.updatedAt,
      encryptedData,
      applicationData.syncStatus
    ];
    
    await this.dbManager.executeSql(sql, params);
    
    // Crear operación de sincronización
    await this.createSyncOperation('CREATE', 'application', applicationData.id, applicationData);
    
    return applicationData;
  }
  
  async findById(id: string): Promise<ApplicationData | null> {
    const sql = `
      SELECT * FROM applications WHERE id = ?
    `;
    
    const result = await this.dbManager.executeSql(sql, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows.item(0);
    return this.mapRowToApplication(row);
  }
  
  async findByAgent(agentId: string, filters?: ApplicationFilters): Promise<ApplicationData[]> {
    let sql = `
      SELECT * FROM applications 
      WHERE agent_id = ?
    `;
    const params: any[] = [agentId];
    
    // Aplicar filtros
    if (filters?.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }
    
    if (filters?.syncStatus) {
      sql += ` AND sync_status = ?`;
      params.push(filters.syncStatus);
    }
    
    if (filters?.dateFrom) {
      sql += ` AND created_at >= ?`;
      params.push(filters.dateFrom);
    }
    
    if (filters?.dateTo) {
      sql += ` AND created_at <= ?`;
      params.push(filters.dateTo);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    if (filters?.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }
    
    const result = await this.dbManager.executeSql(sql, params);
    const applications: ApplicationData[] = [];
    
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      applications.push(await this.mapRowToApplication(row));
    }
    
    return applications;
  }
  
  async update(id: string, updates: Partial<ApplicationData>): Promise<ApplicationData> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new DatabaseError(`Application with id ${id} not found`);
    }
    
    const updatedApplication = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      syncStatus: SyncStatus.PENDING,
      syncVersion: existing.syncVersion + 1
    };
    
    const encryptedData = await this.encryptSensitiveData(updatedApplication);
    
    const sql = `
      UPDATE applications 
      SET applicant_name = ?, applicant_email = ?, applicant_phone = ?,
          requested_amount = ?, requested_term = ?, monthly_income = ?,
          income_source = ?, status = ?, updated_at = ?, encrypted_data = ?,
          sync_status = ?, sync_version = ?
      WHERE id = ?
    `;
    
    const params = [
      `${updatedApplication.applicant.names} ${updatedApplication.applicant.lastNames}`,
      updatedApplication.applicant.email,
      updatedApplication.applicant.phone,
      updatedApplication.financial.requestedAmount,
      updatedApplication.financial.requestedTerm,
      updatedApplication.financial.monthlyIncome,
      updatedApplication.financial.incomeSource,
      updatedApplication.status,
      updatedApplication.updatedAt,
      encryptedData,
      updatedApplication.syncStatus,
      updatedApplication.syncVersion,
      id
    ];
    
    await this.dbManager.executeSql(sql, params);
    
    // Crear operación de sincronización
    await this.createSyncOperation('UPDATE', 'application', id, updatedApplication);
    
    return updatedApplication;
  }
  
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new DatabaseError(`Application with id ${id} not found`);
    }
    
    // Soft delete - marcar como eliminado
    await this.update(id, {
      status: ApplicationStatus.CANCELLED,
      syncStatus: SyncStatus.PENDING
    });
    
    // Crear operación de sincronización para eliminación
    await this.createSyncOperation('DELETE', 'application', id, existing);
  }
  
  private async mapRowToApplication(row: any): Promise<ApplicationData> {
    // Desencriptar datos sensibles
    const decryptedData = await this.decryptSensitiveData(row.encrypted_data);
    
    return {
      id: row.id,
      agentId: row.agent_id,
      serverId: row.server_id,
      applicant: decryptedData.applicant,
      financial: decryptedData.financial,
      business: decryptedData.business,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      submittedAt: row.submitted_at,
      syncStatus: row.sync_status,
      syncVersion: row.sync_version,
      lastSyncAt: row.last_sync_at,
      documents: [], // Se cargan por separado
      guarantors: []  // Se cargan por separado
    };
  }
  
  private async createSyncOperation(
    operationType: string,
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    const syncOp = {
      id: this.generateId(),
      operationType,
      entityType,
      entityId,
      operationData: JSON.stringify(data),
      priority: 2, // NORMAL
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString()
    };
    
    const sql = `
      INSERT INTO sync_operations (
        id, operation_type, entity_type, entity_id, operation_data,
        priority, status, retry_count, max_retries, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.dbManager.executeSql(sql, [
      syncOp.id, syncOp.operationType, syncOp.entityType, syncOp.entityId,
      syncOp.operationData, syncOp.priority, syncOp.status, syncOp.retryCount,
      syncOp.maxRetries, syncOp.createdAt
    ]);
  }
}
```## Sy
nc Status Management

### Sync Status Tracking

```typescript
// Sistema de seguimiento de estado de sincronización
export class SyncStatusManager {
  constructor(private dbManager: DatabaseManager) {}
  
  async updateSyncStatus(
    entityType: string,
    entityId: string,
    status: SyncStatus,
    metadata?: SyncMetadata
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Actualizar estado en la tabla principal
    const updateSql = this.getUpdateSqlForEntity(entityType);
    await this.dbManager.executeSql(updateSql, [
      status,
      timestamp,
      metadata?.serverId,
      entityId
    ]);
    
    // Registrar en historial de sincronización
    await this.recordSyncHistory(entityType, entityId, status, metadata);
  }
  
  async getPendingSyncOperations(limit: number = 50): Promise<SyncOperation[]> {
    const sql = `
      SELECT * FROM sync_operations 
      WHERE status IN ('pending', 'failed') 
        AND retry_count < max_retries
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `;
    
    const result = await this.dbManager.executeSql(sql, [limit]);
    const operations: SyncOperation[] = [];
    
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      operations.push({
        id: row.id,
        operationType: row.operation_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        operationData: JSON.parse(row.operation_data),
        priority: row.priority,
        status: row.status,
        retryCount: row.retry_count,
        maxRetries: row.max_retries,
        createdAt: row.created_at,
        scheduledAt: row.scheduled_at,
        completedAt: row.completed_at,
        errorMessage: row.error_message,
        lastErrorAt: row.last_error_at
      });
    }
    
    return operations;
  }
  
  async markOperationInProgress(operationId: string): Promise<void> {
    const sql = `
      UPDATE sync_operations 
      SET status = 'in_progress', scheduled_at = ?
      WHERE id = ?
    `;
    
    await this.dbManager.executeSql(sql, [
      new Date().toISOString(),
      operationId
    ]);
  }
  
  async markOperationCompleted(
    operationId: string,
    serverResponse?: any
  ): Promise<void> {
    const sql = `
      UPDATE sync_operations 
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `;
    
    await this.dbManager.executeSql(sql, [
      new Date().toISOString(),
      operationId
    ]);
    
    // Opcional: limpiar operaciones completadas después de un tiempo
    await this.cleanupCompletedOperations();
  }
  
  async markOperationFailed(
    operationId: string,
    errorMessage: string
  ): Promise<void> {
    const sql = `
      UPDATE sync_operations 
      SET status = 'failed', retry_count = retry_count + 1,
          error_message = ?, last_error_at = ?
      WHERE id = ?
    `;
    
    await this.dbManager.executeSql(sql, [
      errorMessage,
      new Date().toISOString(),
      operationId
    ]);
  }
  
  async getSyncStatistics(): Promise<SyncStatistics> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM sync_operations
      WHERE created_at > datetime('now', '-7 days')
    `;
    
    const result = await this.dbManager.executeSql(sql);
    const row = result.rows.item(0);
    
    return {
      total: row.total,
      pending: row.pending,
      inProgress: row.in_progress,
      completed: row.completed,
      failed: row.failed,
      successRate: row.total > 0 ? (row.completed / row.total) * 100 : 0
    };
  }
  
  private async cleanupCompletedOperations(): Promise<void> {
    // Eliminar operaciones completadas de más de 7 días
    const sql = `
      DELETE FROM sync_operations 
      WHERE status = 'completed' 
        AND completed_at < datetime('now', '-7 days')
    `;
    
    await this.dbManager.executeSql(sql);
  }
  
  private getUpdateSqlForEntity(entityType: string): string {
    switch (entityType) {
      case 'application':
        return `
          UPDATE applications 
          SET sync_status = ?, last_sync_at = ?, server_id = ?
          WHERE id = ?
        `;
      case 'document':
        return `
          UPDATE documents 
          SET sync_status = ?, last_sync_at = ?, server_url = ?
          WHERE id = ?
        `;
      case 'guarantor':
        return `
          UPDATE guarantors 
          SET sync_status = ?, last_sync_at = ?, server_id = ?
          WHERE id = ?
        `;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
}

// Interfaces para tipos de sincronización
export interface SyncOperation {
  id: string;
  operationType: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'application' | 'document' | 'guarantor';
  entityId: string;
  operationData: any;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
  errorMessage?: string;
  lastErrorAt?: string;
}

export interface SyncMetadata {
  serverId?: string;
  serverUrl?: string;
  version?: number;
  checksum?: string;
}

export interface SyncStatistics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  successRate: number;
}
```

### Batch Sync Operations

```typescript
// Operaciones de sincronización por lotes
export class BatchSyncManager {
  constructor(
    private dbManager: DatabaseManager,
    private syncStatusManager: SyncStatusManager
  ) {}
  
  async processBatch(batchSize: number = 10): Promise<BatchSyncResult> {
    const operations = await this.syncStatusManager.getPendingSyncOperations(batchSize);
    
    if (operations.length === 0) {
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        operations: []
      };
    }
    
    const results: OperationResult[] = [];
    let successful = 0;
    let failed = 0;
    
    // Procesar operaciones en paralelo (con límite)
    const concurrencyLimit = 3;
    const chunks = this.chunkArray(operations, concurrencyLimit);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(operation => 
        this.processOperation(operation)
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        const operation = chunk[index];
        
        if (result.status === 'fulfilled') {
          successful++;
          results.push({
            operationId: operation.id,
            success: true,
            result: result.value
          });
        } else {
          failed++;
          results.push({
            operationId: operation.id,
            success: false,
            error: result.reason
          });
        }
      });
    }
    
    return {
      processed: operations.length,
      successful,
      failed,
      operations: results
    };
  }
  
  private async processOperation(operation: SyncOperation): Promise<any> {
    try {
      // Marcar como en progreso
      await this.syncStatusManager.markOperationInProgress(operation.id);
      
      // Procesar según el tipo de operación
      let result;
      switch (operation.operationType) {
        case 'CREATE':
          result = await this.processCreateOperation(operation);
          break;
        case 'UPDATE':
          result = await this.processUpdateOperation(operation);
          break;
        case 'DELETE':
          result = await this.processDeleteOperation(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.operationType}`);
      }
      
      // Marcar como completado
      await this.syncStatusManager.markOperationCompleted(operation.id, result);
      
      // Actualizar estado de la entidad
      await this.syncStatusManager.updateSyncStatus(
        operation.entityType,
        operation.entityId,
        SyncStatus.SYNCED,
        { serverId: result.serverId, version: result.version }
      );
      
      return result;
      
    } catch (error) {
      // Marcar como fallido
      await this.syncStatusManager.markOperationFailed(
        operation.id,
        error.message
      );
      
      // Actualizar estado de la entidad
      await this.syncStatusManager.updateSyncStatus(
        operation.entityType,
        operation.entityId,
        SyncStatus.FAILED
      );
      
      throw error;
    }
  }
  
  private async processCreateOperation(operation: SyncOperation): Promise<any> {
    // Simular llamada a API para crear entidad
    const apiEndpoint = this.getApiEndpoint(operation.entityType, 'CREATE');
    const response = await this.makeApiCall('POST', apiEndpoint, operation.operationData);
    
    return {
      serverId: response.id,
      version: response.version || 1,
      createdAt: response.createdAt
    };
  }
  
  private async processUpdateOperation(operation: SyncOperation): Promise<any> {
    const apiEndpoint = this.getApiEndpoint(operation.entityType, 'UPDATE', operation.entityId);
    const response = await this.makeApiCall('PUT', apiEndpoint, operation.operationData);
    
    return {
      serverId: response.id,
      version: response.version,
      updatedAt: response.updatedAt
    };
  }
  
  private async processDeleteOperation(operation: SyncOperation): Promise<any> {
    const apiEndpoint = this.getApiEndpoint(operation.entityType, 'DELETE', operation.entityId);
    const response = await this.makeApiCall('DELETE', apiEndpoint);
    
    return {
      deletedAt: new Date().toISOString()
    };
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  private getApiEndpoint(entityType: string, operation: string, entityId?: string): string {
    const baseUrl = 'https://api.credibowpi.com';
    
    switch (entityType) {
      case 'application':
        if (operation === 'CREATE') return `${baseUrl}/applications`;
        if (operation === 'UPDATE') return `${baseUrl}/applications/${entityId}`;
        if (operation === 'DELETE') return `${baseUrl}/applications/${entityId}`;
        break;
      case 'document':
        if (operation === 'CREATE') return `${baseUrl}/documents`;
        if (operation === 'UPDATE') return `${baseUrl}/documents/${entityId}`;
        if (operation === 'DELETE') return `${baseUrl}/documents/${entityId}`;
        break;
      case 'guarantor':
        if (operation === 'CREATE') return `${baseUrl}/guarantors`;
        if (operation === 'UPDATE') return `${baseUrl}/guarantors/${entityId}`;
        if (operation === 'DELETE') return `${baseUrl}/guarantors/${entityId}`;
        break;
    }
    
    throw new Error(`No endpoint defined for ${entityType} ${operation}`);
  }
  
  private async makeApiCall(method: string, url: string, data?: any): Promise<any> {
    // Implementación simulada de llamada a API
    // En la implementación real, usar el httpClient configurado
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `server_${Date.now()}`,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }, Math.random() * 1000 + 500); // Simular latencia de red
    });
  }
}

export interface BatchSyncResult {
  processed: number;
  successful: number;
  failed: number;
  operations: OperationResult[];
}

export interface OperationResult {
  operationId: string;
  success: boolean;
  result?: any;
  error?: any;
}
```## En
cryption Patterns

### Data Encryption Strategy

```typescript
// Estrategia de encriptación para datos sensibles
export class DataEncryptionService {
  private static readonly ENCRYPTION_CONFIG = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    iterations: 100000,
    saltLength: 32,
    ivLength: 16,
    tagLength: 16
  };
  
  private encryptionKey: string | null = null;
  
  async initialize(masterPassword: string): Promise<void> {
    // Derivar clave de encriptación desde password maestro
    this.encryptionKey = await this.deriveKey(masterPassword);
  }
  
  async encryptSensitiveData(data: any): Promise<string> {
    if (!this.encryptionKey) {
      throw new EncryptionError('Encryption service not initialized');
    }
    
    try {
      // Identificar campos sensibles
      const sensitiveData = this.extractSensitiveFields(data);
      
      // Serializar datos
      const jsonData = JSON.stringify(sensitiveData);
      
      // Generar IV y salt únicos
      const iv = await this.generateRandomBytes(this.ENCRYPTION_CONFIG.ivLength);
      const salt = await this.generateRandomBytes(this.ENCRYPTION_CONFIG.saltLength);
      
      // Encriptar datos
      const encrypted = await this.encrypt(jsonData, this.encryptionKey, iv, salt);
      
      // Combinar IV, salt y datos encriptados
      const combined = {
        iv: this.bytesToBase64(iv),
        salt: this.bytesToBase64(salt),
        data: this.bytesToBase64(encrypted.ciphertext),
        tag: this.bytesToBase64(encrypted.tag),
        algorithm: this.ENCRYPTION_CONFIG.algorithm
      };
      
      return JSON.stringify(combined);
      
    } catch (error) {
      throw new EncryptionError('Failed to encrypt data', error);
    }
  }
  
  async decryptSensitiveData(encryptedData: string): Promise<any> {
    if (!this.encryptionKey) {
      throw new EncryptionError('Encryption service not initialized');
    }
    
    try {
      // Parsear datos encriptados
      const combined = JSON.parse(encryptedData);
      
      // Extraer componentes
      const iv = this.base64ToBytes(combined.iv);
      const salt = this.base64ToBytes(combined.salt);
      const ciphertext = this.base64ToBytes(combined.data);
      const tag = this.base64ToBytes(combined.tag);
      
      // Desencriptar
      const decrypted = await this.decrypt(
        { ciphertext, tag },
        this.encryptionKey,
        iv,
        salt
      );
      
      // Parsear JSON desencriptado
      return JSON.parse(decrypted);
      
    } catch (error) {
      throw new EncryptionError('Failed to decrypt data', error);
    }
  }
  
  private extractSensitiveFields(data: any): any {
    // Definir campos que requieren encriptación
    const sensitiveFields = [
      'applicant.dpi',
      'applicant.nit',
      'applicant.email',
      'applicant.phone',
      'applicant.address',
      'applicant.dateOfBirth',
      'financial.monthlyIncome',
      'financial.expenses',
      'business.monthlyRevenue',
      'business.monthlyExpenses'
    ];
    
    const sensitiveData: any = {};
    
    // Extraer solo campos sensibles
    sensitiveFields.forEach(fieldPath => {
      const value = this.getNestedValue(data, fieldPath);
      if (value !== undefined) {
        this.setNestedValue(sensitiveData, fieldPath, value);
      }
    });
    
    return sensitiveData;
  }
  
  private async deriveKey(password: string, salt?: Uint8Array): Promise<string> {
    if (!salt) {
      salt = await this.generateRandomBytes(this.ENCRYPTION_CONFIG.saltLength);
    }
    
    // Usar PBKDF2 para derivar clave
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ENCRYPTION_CONFIG.iterations,
        hash: 'SHA-256'
      },
      key,
      256 // 32 bytes = 256 bits
    );
    
    return this.bytesToBase64(new Uint8Array(derivedBits));
  }
  
  private async encrypt(
    plaintext: string,
    key: string,
    iv: Uint8Array,
    salt: Uint8Array
  ): Promise<{ ciphertext: Uint8Array; tag: Uint8Array }> {
    // Importar clave
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.base64ToBytes(key),
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    // Encriptar
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: salt
      },
      cryptoKey,
      new TextEncoder().encode(plaintext)
    );
    
    const encryptedArray = new Uint8Array(encrypted);
    const ciphertext = encryptedArray.slice(0, -16);
    const tag = encryptedArray.slice(-16);
    
    return { ciphertext, tag };
  }
  
  private async decrypt(
    encrypted: { ciphertext: Uint8Array; tag: Uint8Array },
    key: string,
    iv: Uint8Array,
    salt: Uint8Array
  ): Promise<string> {
    // Importar clave
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.base64ToBytes(key),
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    // Combinar ciphertext y tag
    const combined = new Uint8Array(encrypted.ciphertext.length + encrypted.tag.length);
    combined.set(encrypted.ciphertext);
    combined.set(encrypted.tag, encrypted.ciphertext.length);
    
    // Desencriptar
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: salt
      },
      cryptoKey,
      combined
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  private async generateRandomBytes(length: number): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  
  private bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }
  
  private base64ToBytes(base64: string): Uint8Array {
    return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

// Servicio de gestión de claves
export class KeyManagementService {
  private static readonly KEY_STORAGE_KEY = '@credibowpi_master_key';
  
  async generateMasterKey(): Promise<string> {
    // Generar clave maestra aleatoria
    const keyBytes = await crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...keyBytes));
  }
  
  async storeMasterKey(key: string, userPin: string): Promise<void> {
    // Encriptar clave maestra con PIN del usuario
    const encryptedKey = await this.encryptWithPin(key, userPin);
    
    // Almacenar en SecureStore
    await SecureStore.setItemAsync(this.KEY_STORAGE_KEY, encryptedKey);
  }
  
  async retrieveMasterKey(userPin: string): Promise<string | null> {
    try {
      // Recuperar clave encriptada
      const encryptedKey = await SecureStore.getItemAsync(this.KEY_STORAGE_KEY);
      if (!encryptedKey) return null;
      
      // Desencriptar con PIN del usuario
      return await this.decryptWithPin(encryptedKey, userPin);
      
    } catch (error) {
      console.error('Failed to retrieve master key:', error);
      return null;
    }
  }
  
  async deleteMasterKey(): Promise<void> {
    await SecureStore.deleteItemAsync(this.KEY_STORAGE_KEY);
  }
  
  private async encryptWithPin(data: string, pin: string): Promise<string> {
    // Implementación simplificada - en producción usar algoritmo más robusto
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin.padEnd(32, '0')),
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  private async decryptWithPin(encryptedData: string, pin: string): Promise<string> {
    const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin.padEnd(32, '0')),
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  }
}

export class EncryptionError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'EncryptionError';
  }
}
```

### Field-Level Encryption

```typescript
// Encriptación a nivel de campo
export class FieldEncryption {
  private static readonly FIELD_ENCRYPTION_MAP = {
    // Campos que requieren encriptación
    'applicant.dpi': { required: true, algorithm: 'AES-256-GCM' },
    'applicant.nit': { required: false, algorithm: 'AES-256-GCM' },
    'applicant.email': { required: false, algorithm: 'AES-256-GCM' },
    'applicant.phone': { required: true, algorithm: 'AES-256-GCM' },
    'applicant.address': { required: true, algorithm: 'AES-256-GCM' },
    'applicant.dateOfBirth': { required: true, algorithm: 'AES-256-GCM' },
    'financial.monthlyIncome': { required: true, algorithm: 'AES-256-GCM' },
    'financial.expenses': { required: true, algorithm: 'AES-256-GCM' },
    'business.monthlyRevenue': { required: false, algorithm: 'AES-256-GCM' },
    'business.monthlyExpenses': { required: false, algorithm: 'AES-256-GCM' }
  };
  
  static async encryptFields(data: any, encryptionService: DataEncryptionService): Promise<any> {
    const result = { ...data };
    
    for (const [fieldPath, config] of Object.entries(this.FIELD_ENCRYPTION_MAP)) {
      const value = this.getNestedValue(data, fieldPath);
      
      if (value !== undefined && value !== null) {
        try {
          const encryptedValue = await encryptionService.encryptSensitiveData({ value });
          this.setNestedValue(result, fieldPath, `encrypted:${encryptedValue}`);
        } catch (error) {
          if (config.required) {
            throw new EncryptionError(`Failed to encrypt required field: ${fieldPath}`);
          }
          console.warn(`Failed to encrypt optional field: ${fieldPath}`, error);
        }
      }
    }
    
    return result;
  }
  
  static async decryptFields(data: any, encryptionService: DataEncryptionService): Promise<any> {
    const result = { ...data };
    
    for (const fieldPath of Object.keys(this.FIELD_ENCRYPTION_MAP)) {
      const value = this.getNestedValue(data, fieldPath);
      
      if (typeof value === 'string' && value.startsWith('encrypted:')) {
        try {
          const encryptedData = value.substring('encrypted:'.length);
          const decryptedData = await encryptionService.decryptSensitiveData(encryptedData);
          this.setNestedValue(result, fieldPath, decryptedData.value);
        } catch (error) {
          console.error(`Failed to decrypt field: ${fieldPath}`, error);
          // Mantener valor encriptado si no se puede desencriptar
        }
      }
    }
    
    return result;
  }
  
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
```## 
Migration Strategies

### Database Migration System

```typescript
// Sistema de migraciones de base de datos
export class DatabaseMigrationManager {
  private static readonly MIGRATIONS_TABLE = 'schema_migrations';
  
  constructor(private dbManager: DatabaseManager) {}
  
  async initialize(): Promise<void> {
    // Crear tabla de migraciones si no existe
    await this.createMigrationsTable();
  }
  
  async runMigrations(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const availableMigrations = this.getAvailableMigrations();
    
    // Filtrar migraciones pendientes
    const pendingMigrations = availableMigrations.filter(
      migration => !appliedMigrations.includes(migration.version)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`🔄 Running ${pendingMigrations.length} pending migrations`);
    
    // Ejecutar migraciones en orden
    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }
    
    console.log('✅ All migrations completed successfully');
  }
  
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.MIGRATIONS_TABLE} (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        execution_time INTEGER NOT NULL
      )
    `;
    
    await this.dbManager.executeSql(sql);
  }
  
  private async getAppliedMigrations(): Promise<string[]> {
    const sql = `SELECT version FROM ${this.MIGRATIONS_TABLE} ORDER BY version`;
    const result = await this.dbManager.executeSql(sql);
    
    const versions: string[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      versions.push(result.rows.item(i).version);
    }
    
    return versions;
  }
  
  private getAvailableMigrations(): Migration[] {
    // Definir migraciones disponibles
    return [
      {
        version: '001',
        name: 'create_initial_tables',
        up: this.migration001Up.bind(this),
        down: this.migration001Down.bind(this)
      },
      {
        version: '002',
        name: 'add_sync_operations_table',
        up: this.migration002Up.bind(this),
        down: this.migration002Down.bind(this)
      },
      {
        version: '003',
        name: 'add_encryption_fields',
        up: this.migration003Up.bind(this),
        down: this.migration003Down.bind(this)
      },
      {
        version: '004',
        name: 'add_indexes_for_performance',
        up: this.migration004Up.bind(this),
        down: this.migration004Down.bind(this)
      }
    ];
  }
  
  private async runMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Running migration ${migration.version}: ${migration.name}`);
      
      // Ejecutar migración en transacción
      await this.dbManager.executeSql('BEGIN TRANSACTION');
      
      try {
        await migration.up();
        
        // Registrar migración aplicada
        await this.recordMigration(migration, Date.now() - startTime);
        
        await this.dbManager.executeSql('COMMIT');
        
        console.log(`✅ Migration ${migration.version} completed in ${Date.now() - startTime}ms`);
        
      } catch (error) {
        await this.dbManager.executeSql('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw new MigrationError(`Migration ${migration.version} failed: ${error.message}`, error);
    }
  }
  
  private async recordMigration(migration: Migration, executionTime: number): Promise<void> {
    const sql = `
      INSERT INTO ${this.MIGRATIONS_TABLE} (version, name, applied_at, execution_time)
      VALUES (?, ?, ?, ?)
    `;
    
    await this.dbManager.executeSql(sql, [
      migration.version,
      migration.name,
      new Date().toISOString(),
      executionTime
    ]);
  }
  
  // Migraciones específicas
  private async migration001Up(): Promise<void> {
    // Crear tablas iniciales
    const tables = [
      `CREATE TABLE agents (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'agent',
        is_active BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      
      `CREATE TABLE applications (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        applicant_name TEXT NOT NULL,
        applicant_dpi TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )`,
      
      `CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        upload_date TEXT NOT NULL,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE guarantors (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        dpi TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )`
    ];
    
    for (const sql of tables) {
      await this.dbManager.executeSql(sql);
    }
  }
  
  private async migration002Up(): Promise<void> {
    // Agregar tabla de operaciones de sincronización
    const sql = `
      CREATE TABLE sync_operations (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation_data TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at TEXT NOT NULL,
        scheduled_at TEXT,
        completed_at TEXT,
        error_message TEXT,
        last_error_at TEXT
      )
    `;
    
    await this.dbManager.executeSql(sql);
  }
  
  private async migration003Up(): Promise<void> {
    // Agregar campos de encriptación y sincronización
    const alterStatements = [
      'ALTER TABLE applications ADD COLUMN encrypted_data TEXT',
      'ALTER TABLE applications ADD COLUMN sync_status TEXT NOT NULL DEFAULT "pending"',
      'ALTER TABLE applications ADD COLUMN server_id TEXT',
      'ALTER TABLE applications ADD COLUMN last_sync_at TEXT',
      'ALTER TABLE applications ADD COLUMN sync_version INTEGER DEFAULT 1',
      
      'ALTER TABLE documents ADD COLUMN sync_status TEXT NOT NULL DEFAULT "pending"',
      'ALTER TABLE documents ADD COLUMN server_url TEXT',
      'ALTER TABLE documents ADD COLUMN last_sync_at TEXT',
      
      'ALTER TABLE guarantors ADD COLUMN sync_status TEXT NOT NULL DEFAULT "pending"',
      'ALTER TABLE guarantors ADD COLUMN server_id TEXT',
      'ALTER TABLE guarantors ADD COLUMN last_sync_at TEXT'
    ];
    
    for (const sql of alterStatements) {
      await this.dbManager.executeSql(sql);
    }
  }
  
  private async migration004Up(): Promise<void> {
    // Crear índices para mejorar rendimiento
    const indexes = [
      'CREATE INDEX idx_applications_agent_id ON applications(agent_id)',
      'CREATE INDEX idx_applications_status ON applications(status)',
      'CREATE INDEX idx_applications_sync_status ON applications(sync_status)',
      'CREATE INDEX idx_documents_application_id ON documents(application_id)',
      'CREATE INDEX idx_guarantors_application_id ON guarantors(application_id)',
      'CREATE INDEX idx_sync_operations_status ON sync_operations(status)',
      'CREATE INDEX idx_sync_operations_entity ON sync_operations(entity_type, entity_id)'
    ];
    
    for (const sql of indexes) {
      await this.dbManager.executeSql(sql);
    }
  }
  
  // Métodos de rollback (para desarrollo/testing)
  private async migration001Down(): Promise<void> {
    const tables = ['guarantors', 'documents', 'applications', 'agents'];
    for (const table of tables) {
      await this.dbManager.executeSql(`DROP TABLE IF EXISTS ${table}`);
    }
  }
  
  private async migration002Down(): Promise<void> {
    await this.dbManager.executeSql('DROP TABLE IF EXISTS sync_operations');
  }
  
  private async migration003Down(): Promise<void> {
    // SQLite no soporta DROP COLUMN, necesitaríamos recrear las tablas
    console.warn('Migration 003 rollback not implemented - SQLite limitation');
  }
  
  private async migration004Down(): Promise<void> {
    const indexes = [
      'DROP INDEX IF EXISTS idx_applications_agent_id',
      'DROP INDEX IF EXISTS idx_applications_status',
      'DROP INDEX IF EXISTS idx_applications_sync_status',
      'DROP INDEX IF EXISTS idx_documents_application_id',
      'DROP INDEX IF EXISTS idx_guarantors_application_id',
      'DROP INDEX IF EXISTS idx_sync_operations_status',
      'DROP INDEX IF EXISTS idx_sync_operations_entity'
    ];
    
    for (const sql of indexes) {
      await this.dbManager.executeSql(sql);
    }
  }
}

// Interfaces para migraciones
export interface Migration {
  version: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export class MigrationError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'MigrationError';
  }
}
```

### Schema Versioning

```typescript
// Sistema de versionado de esquema
export class SchemaVersionManager {
  private static readonly SCHEMA_VERSION_KEY = '@credibowpi_schema_version';
  private static readonly CURRENT_SCHEMA_VERSION = 4;
  
  constructor(private dbManager: DatabaseManager) {}
  
  async getCurrentVersion(): Promise<number> {
    try {
      const versionStr = await AsyncStorage.getItem(this.SCHEMA_VERSION_KEY);
      return versionStr ? parseInt(versionStr, 10) : 0;
    } catch (error) {
      console.error('Failed to get schema version:', error);
      return 0;
    }
  }
  
  async setCurrentVersion(version: number): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SCHEMA_VERSION_KEY, version.toString());
    } catch (error) {
      console.error('Failed to set schema version:', error);
      throw error;
    }
  }
  
  async checkSchemaCompatibility(): Promise<CompatibilityResult> {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = this.CURRENT_SCHEMA_VERSION;
    
    if (currentVersion === targetVersion) {
      return {
        compatible: true,
        currentVersion,
        targetVersion,
        action: 'none'
      };
    }
    
    if (currentVersion < targetVersion) {
      return {
        compatible: false,
        currentVersion,
        targetVersion,
        action: 'upgrade',
        migrationRequired: true
      };
    }
    
    if (currentVersion > targetVersion) {
      return {
        compatible: false,
        currentVersion,
        targetVersion,
        action: 'downgrade',
        migrationRequired: true,
        warning: 'App version is older than database schema'
      };
    }
    
    return {
      compatible: false,
      currentVersion,
      targetVersion,
      action: 'unknown'
    };
  }
  
  async performSchemaUpgrade(): Promise<void> {
    const compatibility = await this.checkSchemaCompatibility();
    
    if (compatibility.compatible) {
      console.log('✅ Schema is already up to date');
      return;
    }
    
    if (compatibility.action !== 'upgrade') {
      throw new SchemaError(`Cannot perform upgrade: ${compatibility.action} required`);
    }
    
    console.log(`🔄 Upgrading schema from v${compatibility.currentVersion} to v${compatibility.targetVersion}`);
    
    // Crear backup antes de la migración
    await this.createSchemaBackup();
    
    try {
      // Ejecutar migraciones
      const migrationManager = new DatabaseMigrationManager(this.dbManager);
      await migrationManager.runMigrations();
      
      // Actualizar versión del esquema
      await this.setCurrentVersion(compatibility.targetVersion);
      
      console.log('✅ Schema upgrade completed successfully');
      
    } catch (error) {
      console.error('❌ Schema upgrade failed:', error);
      
      // Intentar restaurar backup
      await this.restoreSchemaBackup();
      
      throw new SchemaError('Schema upgrade failed and backup restored', error);
    }
  }
  
  private async createSchemaBackup(): Promise<void> {
    // Implementar backup del esquema
    console.log('📦 Creating schema backup...');
    
    // En una implementación real, aquí se haría:
    // 1. Exportar datos críticos
    // 2. Guardar estructura actual
    // 3. Crear punto de restauración
  }
  
  private async restoreSchemaBackup(): Promise<void> {
    // Implementar restauración del backup
    console.log('🔄 Restoring schema backup...');
    
    // En una implementación real, aquí se haría:
    // 1. Restaurar estructura anterior
    // 2. Reimportar datos
    // 3. Verificar integridad
  }
}

export interface CompatibilityResult {
  compatible: boolean;
  currentVersion: number;
  targetVersion: number;
  action: 'none' | 'upgrade' | 'downgrade' | 'unknown';
  migrationRequired?: boolean;
  warning?: string;
}

export class SchemaError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'SchemaError';
  }
}
```## Data
 Flow Patterns

### Offline-First Data Handling

```typescript
// Patrón de manejo de datos offline-first
export class OfflineDataManager {
  constructor(
    private dbManager: DatabaseManager,
    private syncManager: BatchSyncManager,
    private networkMonitor: NetworkMonitor
  ) {}
  
  async saveData<T>(
    entityType: string,
    data: T,
    options: SaveOptions = {}
  ): Promise<SaveResult<T>> {
    try {
      // 1. Validar datos localmente
      const validationResult = await this.validateData(entityType, data);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          data: null
        };
      }
      
      // 2. Guardar localmente (siempre exitoso)
      const savedData = await this.saveLocally(entityType, data, options);
      
      // 3. Intentar sincronización inmediata si hay conexión
      if (await this.networkMonitor.isConnected()) {
        try {
          await this.syncImmediately(entityType, savedData);
        } catch (syncError) {
          // No fallar si la sincronización falla - los datos están guardados localmente
          console.warn('Immediate sync failed, will retry later:', syncError);
        }
      }
      
      return {
        success: true,
        data: savedData,
        syncStatus: savedData.syncStatus
      };
      
    } catch (error) {
      console.error('Failed to save data:', error);
      return {
        success: false,
        errors: [error.message],
        data: null
      };
    }
  }
  
  async loadData<T>(
    entityType: string,
    filters: DataFilters = {}
  ): Promise<LoadResult<T>> {
    try {
      // 1. Cargar datos locales (fuente de verdad)
      const localData = await this.loadLocally<T>(entityType, filters);
      
      // 2. Intentar actualización desde servidor si hay conexión
      if (await this.networkMonitor.isConnected() && !filters.offlineOnly) {
        try {
          await this.refreshFromServer(entityType, filters);
          // Recargar datos después de la actualización
          const refreshedData = await this.loadLocally<T>(entityType, filters);
          return {
            success: true,
            data: refreshedData,
            source: 'server_updated'
          };
        } catch (refreshError) {
          console.warn('Server refresh failed, using local data:', refreshError);
        }
      }
      
      return {
        success: true,
        data: localData,
        source: 'local'
      };
      
    } catch (error) {
      console.error('Failed to load data:', error);
      return {
        success: false,
        errors: [error.message],
        data: []
      };
    }
  }
  
  async deleteData(
    entityType: string,
    entityId: string,
    options: DeleteOptions = {}
  ): Promise<DeleteResult> {
    try {
      // 1. Verificar que la entidad existe
      const existing = await this.findById(entityType, entityId);
      if (!existing) {
        return {
          success: false,
          errors: ['Entity not found']
        };
      }
      
      // 2. Soft delete local (marcar como eliminado)
      await this.markAsDeleted(entityType, entityId);
      
      // 3. Programar sincronización de eliminación
      await this.scheduleDeleteSync(entityType, entityId, existing);
      
      return {
        success: true,
        syncStatus: 'pending'
      };
      
    } catch (error) {
      console.error('Failed to delete data:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
  
  private async saveLocally<T>(
    entityType: string,
    data: T,
    options: SaveOptions
  ): Promise<T & { syncStatus: SyncStatus }> {
    // Agregar metadatos de sincronización
    const dataWithSync = {
      ...data,
      syncStatus: SyncStatus.PENDING,
      lastModified: new Date().toISOString(),
      version: options.version || 1
    };
    
    // Guardar en la tabla correspondiente
    switch (entityType) {
      case 'application':
        return await this.applicationRepo.save(dataWithSync as any) as any;
      case 'document':
        return await this.documentRepo.save(dataWithSync as any) as any;
      case 'guarantor':
        return await this.guarantorRepo.save(dataWithSync as any) as any;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
  
  private async loadLocally<T>(
    entityType: string,
    filters: DataFilters
  ): Promise<T[]> {
    // Cargar desde la tabla correspondiente
    switch (entityType) {
      case 'application':
        return await this.applicationRepo.findWithFilters(filters) as any;
      case 'document':
        return await this.documentRepo.findWithFilters(filters) as any;
      case 'guarantor':
        return await this.guarantorRepo.findWithFilters(filters) as any;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
  
  private async syncImmediately<T>(entityType: string, data: T): Promise<void> {
    // Crear operación de sincronización de alta prioridad
    await this.syncManager.queueOperation({
      type: 'CREATE',
      entityType,
      entityId: (data as any).id,
      data,
      priority: 'HIGH'
    });
    
    // Procesar inmediatamente
    await this.syncManager.processBatch(1);
  }
  
  private async refreshFromServer(
    entityType: string,
    filters: DataFilters
  ): Promise<void> {
    // Obtener datos del servidor
    const serverData = await this.fetchFromServer(entityType, filters);
    
    // Comparar con datos locales y resolver conflictos
    for (const serverItem of serverData) {
      const localItem = await this.findById(entityType, serverItem.id);
      
      if (!localItem) {
        // Nuevo item del servidor
        await this.saveLocally(entityType, serverItem, { fromServer: true });
      } else {
        // Resolver conflicto
        const resolved = await this.resolveConflict(localItem, serverItem);
        if (resolved !== localItem) {
          await this.saveLocally(entityType, resolved, { fromServer: true });
        }
      }
    }
  }
}

// Interfaces para el manejo de datos
export interface SaveOptions {
  version?: number;
  fromServer?: boolean;
  skipValidation?: boolean;
}

export interface DeleteOptions {
  hardDelete?: boolean;
  skipSync?: boolean;
}

export interface DataFilters {
  offlineOnly?: boolean;
  syncStatus?: SyncStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface SaveResult<T> {
  success: boolean;
  data: T | null;
  errors?: string[];
  syncStatus?: SyncStatus;
}

export interface LoadResult<T> {
  success: boolean;
  data: T[];
  errors?: string[];
  source: 'local' | 'server_updated';
}

export interface DeleteResult {
  success: boolean;
  errors?: string[];
  syncStatus?: SyncStatus;
}
```

### Network State Management

```typescript
// Gestión del estado de red para datos offline-first
export class NetworkMonitor {
  private isOnline: boolean = true;
  private listeners: NetworkListener[] = [];
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 5;
  
  constructor() {
    this.setupNetworkMonitoring();
  }
  
  private setupNetworkMonitoring(): void {
    // Monitorear cambios de conectividad
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline) {
        this.handleReconnection();
      } else if (wasOnline && !this.isOnline) {
        this.handleDisconnection();
      }
      
      // Notificar a listeners
      this.notifyListeners({
        isConnected: this.isOnline,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable
      });
    });
  }
  
  async isConnected(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      console.error('Failed to check network state:', error);
      return false;
    }
  }
  
  addListener(listener: NetworkListener): void {
    this.listeners.push(listener);
  }
  
  removeListener(listener: NetworkListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  private handleReconnection(): void {
    console.log('🌐 Network reconnected');
    this.reconnectionAttempts = 0;
    
    // Disparar sincronización automática
    this.triggerAutoSync();
  }
  
  private handleDisconnection(): void {
    console.log('📴 Network disconnected');
    
    // Programar intentos de reconexión
    this.scheduleReconnectionAttempts();
  }
  
  private async triggerAutoSync(): Promise<void> {
    try {
      // Notificar que la sincronización está comenzando
      this.notifyListeners({
        isConnected: true,
        syncInProgress: true
      });
      
      // Ejecutar sincronización
      const syncManager = new BatchSyncManager(/* dependencies */);
      const result = await syncManager.processBatch(20);
      
      console.log(`✅ Auto-sync completed: ${result.successful}/${result.processed} operations`);
      
      // Notificar que la sincronización terminó
      this.notifyListeners({
        isConnected: true,
        syncInProgress: false,
        lastSyncResult: result
      });
      
    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
      
      this.notifyListeners({
        isConnected: true,
        syncInProgress: false,
        syncError: error.message
      });
    }
  }
  
  private scheduleReconnectionAttempts(): void {
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }
    
    const delay = Math.pow(2, this.reconnectionAttempts) * 1000; // Exponential backoff
    
    setTimeout(async () => {
      this.reconnectionAttempts++;
      
      if (await this.isConnected()) {
        this.handleReconnection();
      } else {
        this.scheduleReconnectionAttempts();
      }
    }, delay);
  }
  
  private notifyListeners(state: NetworkState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }
}

export interface NetworkState {
  isConnected: boolean;
  connectionType?: string;
  isInternetReachable?: boolean;
  syncInProgress?: boolean;
  lastSyncResult?: any;
  syncError?: string;
}

export type NetworkListener = (state: NetworkState) => void;
```

## Sync Conflict Resolution

### Conflict Resolution Strategies

```typescript
// Estrategias de resolución de conflictos
export class ConflictResolver {
  private static readonly RESOLUTION_STRATEGIES = {
    // Estrategias por tipo de entidad
    application: 'server_wins_with_merge',
    document: 'server_wins',
    guarantor: 'last_modified_wins',
    
    // Estrategias por campo
    field_strategies: {
      'status': 'server_wins',
      'sync_version': 'server_wins',
      'created_at': 'keep_earliest',
      'updated_at': 'keep_latest'
    }
  };
  
  async resolveConflict<T>(
    localData: T & ConflictMetadata,
    serverData: T & ConflictMetadata,
    entityType: string
  ): Promise<T & ConflictMetadata> {
    const strategy = this.RESOLUTION_STRATEGIES[entityType] || 'last_modified_wins';
    
    console.log(`🔄 Resolving conflict for ${entityType} using strategy: ${strategy}`);
    
    switch (strategy) {
      case 'server_wins':
        return this.serverWinsStrategy(localData, serverData);
        
      case 'client_wins':
        return this.clientWinsStrategy(localData, serverData);
        
      case 'last_modified_wins':
        return this.lastModifiedWinsStrategy(localData, serverData);
        
      case 'server_wins_with_merge':
        return this.serverWinsWithMergeStrategy(localData, serverData);
        
      case 'field_level_resolution':
        return this.fieldLevelResolutionStrategy(localData, serverData);
        
      default:
        console.warn(`Unknown resolution strategy: ${strategy}, using last_modified_wins`);
        return this.lastModifiedWinsStrategy(localData, serverData);
    }
  }
  
  private serverWinsStrategy<T>(
    localData: T & ConflictMetadata,
    serverData: T & ConflictMetadata
  ): T & ConflictMetadata {
    console.log('📥 Server wins strategy applied');
    
    return {
      ...serverData,
      conflictResolution: {
        strategy: 'server_wins',
        resolvedAt: new Date().toISOString(),
        localVersion: localData.version,
        serverVersion: serverData.version
      }
    };
  }
  
  private clientWinsStrategy<T>(
    localData: T & ConflictMetadata,
    serverData: T & ConflictMetadata
  ): T & ConflictMetadata {
    console.log('📤 Client wins strategy applied');
    
    return {
      ...localData,
      version: Math.max(localData.version || 1, serverData.version || 1) + 1,
      conflictResolution: {
        strategy: 'client_wins',
        resolvedAt: new Date().toISOString(),
        localVersion: localData.version,
        serverVersion: serverData.version
      }
    };
  }
  
  private lastModifiedWinsStrategy<T>(
    localData: T & ConflictMetadata,
    serverData: T & ConflictMetadata
  ): T & ConflictMetadata {
    const localModified = new Date(localData.lastModified || 0);
    const serverModified = new Date(serverData.lastModified || 0);
    
    const winner = serverModified > localModified ? serverData : localData;
    const loser = winner === serverData ? localData : serverData;
    
    console.log(`⏰ Last modified wins: ${winner === serverData ? 'server' : 'client'}`);
    
    return {
      ...winner,
      conflictResolution: {
        strategy: 'last_modified_wins',
        resolvedAt: new Date().toISOString(),
        winner: winner === serverData ? 'server' : 'client',
        localVersion: localData.version,
        serverVersion: serverData.version,
        localModified: localData.lastModified,
        serverModified: serverData.lastModified
      }
    };
  }
  
  private serverWinsWithMergeStrategy<T>(
    localData: T & ConflictMetadata,
    serverData: T & ConflictMetadata
  ): T & ConflictMetadata {
    console.log('🔀 Server wins with merge strategy applied');
    
    // Comenzar con datos del servidor
    const resolved = { ...serverData };
    
    // Mergear campos específicos del cliente si son más recientes
    const mergeableFields = ['notes', 'tags', 'localMetadata'];
    
    for (const field of mergeableFields) {
      if (localData[field] && !serverData[field]) {
        resolved[field] = localData[field];
      }
    }
    
    return {
      ...resolved,
      conflictResolution: {
        strategy: 'server_wins_with_merge',
        resolvedAt: new Date().toISOString(),
        mergedFields: mergeableFields.filter(field => 
          localData[field] && !serverData[field]
        ),
        localVersion: localData.version,
        serverVersion: serverData.version
      }
    };
  }
  
  private fieldLevelResolutionStrategy<T>(
    localData: T & ConflictMetadata,
    serverData: T & ConflictMetadata
  ): T & ConflictMetadata {
    console.log('🔍 Field-level resolution strategy applied');
    
    const resolved = { ...localData };
    const fieldResolutions: Record<string, string> = {};
    
    // Resolver cada campo según su estrategia específica
    for (const [field, strategy] of Object.entries(this.RESOLUTION_STRATEGIES.field_strategies)) {
      if (localData[field] !== serverData[field]) {
        switch (strategy) {
          case 'server_wins':
            resolved[field] = serverData[field];
            fieldResolutions[field] = 'server';
            break;
            
          case 'client_wins':
            resolved[field] = localData[field];
            fieldResolutions[field] = 'client';
            break;
            
          case 'keep_earliest':
            const earliestValue = localData[field] < serverData[field] 
              ? localData[field] 
              : serverData[field];
            resolved[field] = earliestValue;
            fieldResolutions[field] = earliestValue === localData[field] ? 'client' : 'server';
            break;
            
          case 'keep_latest':
            const latestValue = localData[field] > serverData[field] 
              ? localData[field] 
              : serverData[field];
            resolved[field] = latestValue;
            fieldResolutions[field] = latestValue === localData[field] ? 'client' : 'server';
            break;
        }
      }
    }
    
    return {
      ...resolved,
      conflictResolution: {
        strategy: 'field_level_resolution',
        resolvedAt: new Date().toISOString(),
        fieldResolutions,
        localVersion: localData.version,
        serverVersion: serverData.version
      }
    };
  }
  
  async detectConflicts<T>(
    localData: T & ConflictMetadata,
    serverData: T & ConflictMetadata
  ): Promise<ConflictDetectionResult> {
    const conflicts: FieldConflict[] = [];
    
    // Comparar campos principales
    const fieldsToCheck = Object.keys(localData).filter(key => 
      !['id', 'conflictResolution', 'syncStatus'].includes(key)
    );
    
    for (const field of fieldsToCheck) {
      if (this.hasFieldConflict(localData[field], serverData[field])) {
        conflicts.push({
          field,
          localValue: localData[field],
          serverValue: serverData[field],
          conflictType: this.getConflictType(localData[field], serverData[field])
        });
      }
    }
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      severity: this.calculateConflictSeverity(conflicts)
    };
  }
  
  private hasFieldConflict(localValue: any, serverValue: any): boolean {
    // Comparación profunda para objetos
    if (typeof localValue === 'object' && typeof serverValue === 'object') {
      return JSON.stringify(localValue) !== JSON.stringify(serverValue);
    }
    
    return localValue !== serverValue;
  }
  
  private getConflictType(localValue: any, serverValue: any): ConflictType {
    if (localValue === null || localValue === undefined) {
      return 'local_missing';
    }
    
    if (serverValue === null || serverValue === undefined) {
      return 'server_missing';
    }
    
    return 'value_mismatch';
  }
  
  private calculateConflictSeverity(conflicts: FieldConflict[]): ConflictSeverity {
    if (conflicts.length === 0) return 'none';
    if (conflicts.length <= 2) return 'low';
    if (conflicts.length <= 5) return 'medium';
    return 'high';
  }
}

// Interfaces para resolución de conflictos
export interface ConflictMetadata {
  version?: number;
  lastModified?: string;
  syncStatus?: SyncStatus;
  conflictResolution?: ConflictResolutionInfo;
}

export interface ConflictResolutionInfo {
  strategy: string;
  resolvedAt: string;
  winner?: 'client' | 'server';
  mergedFields?: string[];
  fieldResolutions?: Record<string, string>;
  localVersion?: number;
  serverVersion?: number;
  localModified?: string;
  serverModified?: string;
}

export interface FieldConflict {
  field: string;
  localValue: any;
  serverValue: any;
  conflictType: ConflictType;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: FieldConflict[];
  severity: ConflictSeverity;
}

export type ConflictType = 'value_mismatch' | 'local_missing' | 'server_missing';
export type ConflictSeverity = 'none' | 'low' | 'medium' | 'high';
```

---

**Última Actualización**: Enero 2025  
**Versión**: 1.0  
**Mantenido por**: Equipo de Desarrollo CrediBowpi