import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  ApplicationRow,
  DocumentRow,
  SyncQueueRow,
  CreditApplication,
  DocumentCapture,
  SyncOperation,
  ApplicationStatus,
  SyncStatus,
  DocumentType,
  DocumentStatus,
  SyncOperationType,
  SyncEntityType,
} from '../types/database';

// Database configuration
const DB_NAME = 'credibowpi.db';
const ENCRYPTION_KEY_LENGTH = 32;

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private encryptionKey: string | null = null;

  async initialize(): Promise<void> {
    try {
      // Generate or retrieve encryption key
      this.encryptionKey = await this.getOrCreateEncryptionKey();

      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async getOrCreateEncryptionKey(): Promise<string> {
    // Use SecureStore for proper encryption key management
    // Import at runtime to avoid circular dependencies
    try {
      const secureStorageModule = require('./secureStorage');
      return await secureStorageModule.secureStorageService.getOrCreateEncryptionKey();
    } catch (error) {
      // Fallback for testing or when SecureStore is not available
      console.warn('SecureStore not available, using fallback encryption key');
      const deviceId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        'credibowpi-device-key-fallback'
      );
      return deviceId.substring(0, ENCRYPTION_KEY_LENGTH);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Applications table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        status TEXT NOT NULL,
        sync_status TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER
      );
    `);

    // Documents table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        type TEXT NOT NULL,
        local_path TEXT NOT NULL,
        remote_path TEXT,
        status TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (application_id) REFERENCES applications (id)
      );
    `);

    // Sync queue table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_attempt INTEGER
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_applications_agent_id ON applications(agent_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
      CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
    `);
  }

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  // Utility methods
  generateId(): string {
    return Crypto.randomUUID();
  }

  private async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption key not available');
    // Simple encryption - in production, use proper encryption
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data + this.encryptionKey
    );
    return (
      Buffer.from(data).toString('base64') + '.' + encrypted.substring(0, 16)
    );
  }

  private async decryptData(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption key not available');
    // Simple decryption - in production, use proper decryption
    const [data] = encryptedData.split('.');
    return Buffer.from(data, 'base64').toString('utf8');
  }

  // Application CRUD operations
  async createApplication(application: CreditApplication): Promise<void> {
    const db = await this.getDatabase();
    const encryptedData = await this.encryptData(JSON.stringify(application));

    await db.runAsync(
      `INSERT INTO applications (id, agent_id, status, sync_status, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        application.id,
        application.agentId,
        application.status,
        application.syncStatus,
        encryptedData,
        application.createdAt.getTime(),
        application.updatedAt.getTime(),
      ]
    );
  }

  async getApplication(id: string): Promise<CreditApplication | null> {
    const db = await this.getDatabase();
    const result = await db.getFirstAsync<ApplicationRow>(
      'SELECT * FROM applications WHERE id = ?',
      [id]
    );

    if (!result) return null;

    const decryptedData = await this.decryptData(result.data);
    const applicationData = JSON.parse(decryptedData);

    return {
      ...applicationData,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
      syncStatus: result.sync_status,
    };
  }

  async updateApplication(application: CreditApplication): Promise<void> {
    const db = await this.getDatabase();
    const encryptedData = await this.encryptData(JSON.stringify(application));

    await db.runAsync(
      `UPDATE applications 
       SET status = ?, sync_status = ?, data = ?, updated_at = ?
       WHERE id = ?`,
      [
        application.status,
        application.syncStatus,
        encryptedData,
        application.updatedAt.getTime(),
        application.id,
      ]
    );
  }

  async getApplicationsByAgent(agentId: string): Promise<CreditApplication[]> {
    const db = await this.getDatabase();
    const results = await db.getAllAsync<ApplicationRow>(
      'SELECT * FROM applications WHERE agent_id = ? ORDER BY updated_at DESC',
      [agentId]
    );

    const applications: CreditApplication[] = [];
    for (const row of results) {
      const decryptedData = await this.decryptData(row.data);
      const applicationData = JSON.parse(decryptedData);

      applications.push({
        ...applicationData,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        syncStatus: row.sync_status,
      });
    }

    return applications;
  }

  async deleteApplication(id: string): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync('DELETE FROM applications WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM documents WHERE application_id = ?', [id]);
  }

  // Document CRUD operations
  async createDocument(
    document: DocumentCapture,
    applicationId: string
  ): Promise<void> {
    const db = await this.getDatabase();
    const metadataJson = JSON.stringify(document.metadata);

    await db.runAsync(
      `INSERT INTO documents (id, application_id, type, local_path, remote_path, status, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.id,
        applicationId,
        document.type,
        document.localPath,
        document.remotePath || null,
        document.status,
        metadataJson,
        Date.now(),
      ]
    );
  }

  async getDocumentsByApplication(
    applicationId: string
  ): Promise<DocumentCapture[]> {
    const db = await this.getDatabase();
    const results = await db.getAllAsync<DocumentRow>(
      'SELECT * FROM documents WHERE application_id = ? ORDER BY created_at ASC',
      [applicationId]
    );

    return results.map(row => ({
      id: row.id,
      type: row.type as DocumentType,
      localPath: row.local_path,
      remotePath: row.remote_path || undefined,
      status: row.status as DocumentStatus,
      metadata: JSON.parse(row.metadata),
    }));
  }

  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    remotePath?: string
  ): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      'UPDATE documents SET status = ?, remote_path = ? WHERE id = ?',
      [status, remotePath || null, documentId]
    );
  }

  // Sync queue operations
  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    const db = await this.getDatabase();
    const payloadJson = JSON.stringify(operation.payload);

    await db.runAsync(
      `INSERT INTO sync_queue (id, operation_type, entity_type, entity_id, payload, retry_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        operation.id,
        operation.operationType,
        operation.entityType,
        operation.entityId,
        payloadJson,
        operation.retryCount,
        operation.createdAt.getTime(),
      ]
    );
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    const db = await this.getDatabase();
    const results = await db.getAllAsync<SyncQueueRow>(
      'SELECT * FROM sync_queue ORDER BY created_at ASC'
    );

    return results.map(row => ({
      id: row.id,
      operationType: row.operation_type as SyncOperationType,
      entityType: row.entity_type as SyncEntityType,
      entityId: row.entity_id,
      payload: JSON.parse(row.payload),
      retryCount: row.retry_count,
      createdAt: new Date(row.created_at),
      lastAttempt: row.last_attempt ? new Date(row.last_attempt) : undefined,
    }));
  }

  async updateSyncQueueItem(id: string, retryCount: number): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      'UPDATE sync_queue SET retry_count = ?, last_attempt = ? WHERE id = ?',
      [retryCount, Date.now(), id]
    );
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync('DELETE FROM sync_queue');
  }

  // Utility queries
  async getApplicationCount(agentId: string): Promise<number> {
    const db = await this.getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM applications WHERE agent_id = ?',
      [agentId]
    );
    return result?.count || 0;
  }

  async getPendingSyncCount(): Promise<number> {
    const db = await this.getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue'
    );
    return result?.count || 0;
  }

  async getApplicationsByStatus(
    agentId: string,
    status: ApplicationStatus
  ): Promise<CreditApplication[]> {
    const db = await this.getDatabase();
    const results = await db.getAllAsync<ApplicationRow>(
      'SELECT * FROM applications WHERE agent_id = ? AND status = ? ORDER BY updated_at DESC',
      [agentId, status]
    );

    const applications: CreditApplication[] = [];
    for (const row of results) {
      const decryptedData = await this.decryptData(row.data);
      const applicationData = JSON.parse(decryptedData);

      applications.push({
        ...applicationData,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        syncStatus: row.sync_status,
      });
    }

    return applications;
  }

  async getAllApplications(): Promise<CreditApplication[]> {
    const db = await this.getDatabase();
    const results = await db.getAllAsync<ApplicationRow>(
      'SELECT * FROM applications ORDER BY updated_at DESC'
    );

    const applications: CreditApplication[] = [];
    for (const row of results) {
      const decryptedData = await this.decryptData(row.data);
      const applicationData = JSON.parse(decryptedData);

      applications.push({
        ...applicationData,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        syncStatus: row.sync_status,
      });
    }

    return applications;
  }

  async updateApplicationSyncStatus(
    applicationId: string,
    syncStatus: SyncStatus
  ): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      'UPDATE applications SET sync_status = ?, updated_at = ? WHERE id = ?',
      [syncStatus, Date.now(), applicationId]
    );
  }

  // Singleton instance getter
  static async getInstance(): Promise<DatabaseService> {
    if (!databaseService.db) {
      await databaseService.initialize();
    }
    return databaseService;
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
