// Bowpi Secure Storage Service - Enhanced secure storage for Bowpi authentication data
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import { BOWPI_STORAGE_KEYS } from '../types/bowpi';

/**
 * Configuración de almacenamiento seguro
 */
interface SecureStorageConfig {
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  integrityCheckEnabled: boolean;
  maxRetries: number;
  backupEnabled: boolean;
}

/**
 * Metadatos de almacenamiento
 */
interface StorageMetadata {
  version: string;
  timestamp: number;
  checksum?: string;
  encrypted: boolean;
  compressed: boolean;
}

/**
 * Contenedor de datos seguros
 */
interface SecureDataContainer<T> {
  data: T;
  metadata: StorageMetadata;
}

/**
 * Resultado de operación de almacenamiento
 */
interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  recovered?: boolean;
}

/**
 * Estadísticas de almacenamiento
 */
interface StorageStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  recoveredOperations: number;
  corruptedData: number;
  lastOperation: number;
}

/**
 * Servicio de almacenamiento seguro mejorado para Bowpi
 */
export class BowpiSecureStorageService {
  private static instance: BowpiSecureStorageService;
  private config: SecureStorageConfig;
  private stats: StorageStats;
  private encryptionKey: string | null = null;

  private constructor() {
    this.config = {
      encryptionEnabled: true,
      compressionEnabled: false, // Disabled for simplicity, can be enabled later
      integrityCheckEnabled: true,
      maxRetries: 3,
      backupEnabled: true
    };

    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      recoveredOperations: 0,
      corruptedData: 0,
      lastOperation: 0
    };
  }

  /**
   * Obtener instancia singleton
   */
  static getInstance(): BowpiSecureStorageService {
    if (!BowpiSecureStorageService.instance) {
      BowpiSecureStorageService.instance = new BowpiSecureStorageService();
    }
    return BowpiSecureStorageService.instance;
  }

  /**
   * Inicializar el servicio
   */
  async initialize(): Promise<void> {
    console.log('🔍 [BOWPI_SECURE_STORAGE] Initializing secure storage service...');
    
    try {
      // Obtener o crear clave de encriptación
      await this.initializeEncryptionKey();
      
      // Verificar integridad de datos existentes
      await this.verifyStorageIntegrity();
      
      console.log('✅ [BOWPI_SECURE_STORAGE] Secure storage service initialized successfully');
    } catch (error) {
      console.error('❌ [BOWPI_SECURE_STORAGE] Failed to initialize secure storage:', error);
      throw error;
    }
  }

  /**
   * Inicializar clave de encriptación
   */
  private async initializeEncryptionKey(): Promise<void> {
    try {
      let key = await SecureStore.getItemAsync('bowpi_encryption_master_key');
      
      if (!key) {
        // Generar nueva clave maestra
        key = await this.generateEncryptionKey();
        await SecureStore.setItemAsync('bowpi_encryption_master_key', key);
        console.log('🔍 [BOWPI_SECURE_STORAGE] Generated new encryption master key');
      }
      
      this.encryptionKey = key;
      console.log('✅ [BOWPI_SECURE_STORAGE] Encryption key initialized');
    } catch (error) {
      console.error('❌ [BOWPI_SECURE_STORAGE] Failed to initialize encryption key:', error);
      throw error;
    }
  }

  /**
   * Generar clave de encriptación segura
   */
  private async generateEncryptionKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Almacenar datos de forma segura
   */
  async secureStore<T>(key: string, data: T): Promise<StorageResult<void>> {
    console.log(`🔍 [BOWPI_SECURE_STORAGE] Storing data for key: ${key}`);
    
    this.stats.totalOperations++;
    this.stats.lastOperation = Date.now();

    try {
      // Crear contenedor de datos con metadatos
      const container = await this.createDataContainer(data);
      
      // Serializar y encriptar si está habilitado
      const serializedData = await this.serializeData(container);
      
      // Almacenar datos principales
      await this.storeWithRetry(key, serializedData);
      
      // Crear backup si está habilitado
      if (this.config.backupEnabled) {
        await this.createBackup(key, serializedData);
      }

      this.stats.successfulOperations++;
      console.log(`✅ [BOWPI_SECURE_STORAGE] Data stored successfully for key: ${key}`);
      
      return { success: true };

    } catch (error) {
      this.stats.failedOperations++;
      console.error(`❌ [BOWPI_SECURE_STORAGE] Failed to store data for key ${key}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error'
      };
    }
  }

  /**
   * Recuperar datos de forma segura
   */
  async secureRetrieve<T>(key: string): Promise<StorageResult<T>> {
    console.log(`🔍 [BOWPI_SECURE_STORAGE] Retrieving data for key: ${key}`);
    
    this.stats.totalOperations++;
    this.stats.lastOperation = Date.now();

    try {
      // Intentar recuperar datos principales
      let serializedData = await this.retrieveWithRetry(key);
      let recovered = false;

      // Si fallan los datos principales, intentar backup
      if (!serializedData && this.config.backupEnabled) {
        console.log(`🔍 [BOWPI_SECURE_STORAGE] Main data failed, trying backup for key: ${key}`);
        serializedData = await this.retrieveBackup(key);
        recovered = true;
        this.stats.recoveredOperations++;
      }

      if (!serializedData) {
        console.log(`❌ [BOWPI_SECURE_STORAGE] No data found for key: ${key}`);
        return { success: false, error: 'No data found' };
      }

      // Deserializar y desencriptar
      const container = await this.deserializeData<T>(serializedData);
      
      // Verificar integridad si está habilitada
      if (this.config.integrityCheckEnabled) {
        const isValid = await this.verifyDataIntegrity(container);
        if (!isValid) {
          this.stats.corruptedData++;
          console.error(`❌ [BOWPI_SECURE_STORAGE] Data integrity check failed for key: ${key}`);
          return { success: false, error: 'Data integrity check failed' };
        }
      }

      this.stats.successfulOperations++;
      console.log(`✅ [BOWPI_SECURE_STORAGE] Data retrieved successfully for key: ${key}`);
      
      return {
        success: true,
        data: container.data,
        recovered
      };

    } catch (error) {
      this.stats.failedOperations++;
      console.error(`❌ [BOWPI_SECURE_STORAGE] Failed to retrieve data for key ${key}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown retrieval error'
      };
    }
  }

  /**
   * Eliminar datos de forma segura
   */
  async secureDelete(key: string): Promise<StorageResult<void>> {
    console.log(`🔍 [BOWPI_SECURE_STORAGE] Deleting data for key: ${key}`);
    
    this.stats.totalOperations++;
    this.stats.lastOperation = Date.now();

    try {
      // Eliminar datos principales
      await SecureStore.deleteItemAsync(key);
      
      // Eliminar backup si existe
      if (this.config.backupEnabled) {
        await this.deleteBackup(key);
      }

      this.stats.successfulOperations++;
      console.log(`✅ [BOWPI_SECURE_STORAGE] Data deleted successfully for key: ${key}`);
      
      return { success: true };

    } catch (error) {
      this.stats.failedOperations++;
      console.error(`❌ [BOWPI_SECURE_STORAGE] Failed to delete data for key ${key}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deletion error'
      };
    }
  }

  /**
   * Crear contenedor de datos con metadatos
   */
  private async createDataContainer<T>(data: T): Promise<SecureDataContainer<T>> {
    const metadata: StorageMetadata = {
      version: '1.0.0',
      timestamp: Date.now(),
      encrypted: this.config.encryptionEnabled,
      compressed: this.config.compressionEnabled
    };

    // Calcular checksum si está habilitado
    if (this.config.integrityCheckEnabled) {
      const dataString = JSON.stringify(data);
      metadata.checksum = CryptoJS.SHA256(dataString).toString();
    }

    return { data, metadata };
  }

  /**
   * Serializar y encriptar datos
   */
  private async serializeData<T>(container: SecureDataContainer<T>): Promise<string> {
    let serialized = JSON.stringify(container);

    // Encriptar si está habilitado
    if (this.config.encryptionEnabled && this.encryptionKey) {
      serialized = CryptoJS.AES.encrypt(serialized, this.encryptionKey).toString();
    }

    return serialized;
  }

  /**
   * Deserializar y desencriptar datos
   */
  private async deserializeData<T>(serializedData: string): Promise<SecureDataContainer<T>> {
    let data = serializedData;

    // Desencriptar si está habilitado
    if (this.config.encryptionEnabled && this.encryptionKey) {
      const decrypted = CryptoJS.AES.decrypt(data, this.encryptionKey);
      data = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!data) {
        throw new Error('Failed to decrypt data - invalid key or corrupted data');
      }
    }

    return JSON.parse(data);
  }

  /**
   * Almacenar con reintentos
   */
  private async storeWithRetry(key: string, data: string): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        await SecureStore.setItemAsync(key, data);
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ [BOWPI_SECURE_STORAGE] Store attempt ${attempt} failed for key ${key}:`, error);
        
        if (attempt < this.config.maxRetries) {
          await this.delay(attempt * 100); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Recuperar con reintentos
   */
  private async retrieveWithRetry(key: string): Promise<string | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ [BOWPI_SECURE_STORAGE] Retrieve attempt ${attempt} failed for key ${key}:`, error);
        
        if (attempt < this.config.maxRetries) {
          await this.delay(attempt * 100);
        }
      }
    }

    console.error(`❌ [BOWPI_SECURE_STORAGE] All retrieve attempts failed for key ${key}:`, lastError);
    return null;
  }

  /**
   * Crear backup de datos
   */
  private async createBackup(key: string, data: string): Promise<void> {
    try {
      const backupKey = `${key}_backup`;
      await SecureStore.setItemAsync(backupKey, data);
      console.log(`🔍 [BOWPI_SECURE_STORAGE] Backup created for key: ${key}`);
    } catch (error) {
      console.warn(`⚠️ [BOWPI_SECURE_STORAGE] Failed to create backup for key ${key}:`, error);
      // No lanzar error - el backup es opcional
    }
  }

  /**
   * Recuperar backup de datos
   */
  private async retrieveBackup(key: string): Promise<string | null> {
    try {
      const backupKey = `${key}_backup`;
      return await SecureStore.getItemAsync(backupKey);
    } catch (error) {
      console.warn(`⚠️ [BOWPI_SECURE_STORAGE] Failed to retrieve backup for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Eliminar backup
   */
  private async deleteBackup(key: string): Promise<void> {
    try {
      const backupKey = `${key}_backup`;
      await SecureStore.deleteItemAsync(backupKey);
    } catch (error) {
      console.warn(`⚠️ [BOWPI_SECURE_STORAGE] Failed to delete backup for key ${key}:`, error);
      // No lanzar error - la eliminación del backup es opcional
    }
  }

  /**
   * Verificar integridad de datos
   */
  private async verifyDataIntegrity<T>(container: SecureDataContainer<T>): Promise<boolean> {
    if (!this.config.integrityCheckEnabled || !container.metadata.checksum) {
      return true;
    }

    try {
      const dataString = JSON.stringify(container.data);
      const calculatedChecksum = CryptoJS.SHA256(dataString).toString();
      return calculatedChecksum === container.metadata.checksum;
    } catch (error) {
      console.error('❌ [BOWPI_SECURE_STORAGE] Error verifying data integrity:', error);
      return false;
    }
  }

  /**
   * Verificar integridad de todo el almacenamiento
   */
  private async verifyStorageIntegrity(): Promise<void> {
    console.log('🔍 [BOWPI_SECURE_STORAGE] Verifying storage integrity...');
    
    const keysToCheck = Object.values(BOWPI_STORAGE_KEYS);
    let corruptedCount = 0;

    for (const key of keysToCheck) {
      try {
        const result = await this.secureRetrieve(key);
        if (!result.success && result.error?.includes('integrity')) {
          corruptedCount++;
          console.warn(`⚠️ [BOWPI_SECURE_STORAGE] Corrupted data detected for key: ${key}`);
        }
      } catch (error) {
        console.warn(`⚠️ [BOWPI_SECURE_STORAGE] Error checking integrity for key ${key}:`, error);
      }
    }

    if (corruptedCount > 0) {
      console.warn(`⚠️ [BOWPI_SECURE_STORAGE] Found ${corruptedCount} corrupted data entries`);
    } else {
      console.log('✅ [BOWPI_SECURE_STORAGE] Storage integrity verification completed');
    }
  }

  /**
   * Limpiar todos los datos de Bowpi
   */
  async clearAllBowpiData(): Promise<StorageResult<void>> {
    console.log('🔍 [BOWPI_SECURE_STORAGE] Clearing all Bowpi data...');
    
    try {
      const keysToDelete = Object.values(BOWPI_STORAGE_KEYS);
      const deletePromises = keysToDelete.map(key => this.secureDelete(key));
      
      await Promise.all(deletePromises);
      
      console.log('✅ [BOWPI_SECURE_STORAGE] All Bowpi data cleared successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ [BOWPI_SECURE_STORAGE] Failed to clear all Bowpi data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  getStorageStats(): StorageStats {
    return { ...this.stats };
  }

  /**
   * Obtener información de configuración
   */
  getConfig(): SecureStorageConfig {
    return { ...this.config };
  }

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig: Partial<SecureStorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔍 [BOWPI_SECURE_STORAGE] Configuration updated:', this.config);
  }

  /**
   * Verificar si existe una clave
   */
  async exists(key: string): Promise<boolean> {
    try {
      const data = await SecureStore.getItemAsync(key);
      return data !== null;
    } catch (error) {
      console.error(`❌ [BOWPI_SECURE_STORAGE] Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Obtener información de debug
   */
  async getDebugInfo(): Promise<{
    config: SecureStorageConfig;
    stats: StorageStats;
    hasEncryptionKey: boolean;
    bowpiKeysStatus: Record<string, boolean>;
  }> {
    const bowpiKeysStatus: Record<string, boolean> = {};
    
    for (const [name, key] of Object.entries(BOWPI_STORAGE_KEYS)) {
      bowpiKeysStatus[name] = await this.exists(key);
    }

    return {
      config: this.config,
      stats: this.stats,
      hasEncryptionKey: !!this.encryptionKey,
      bowpiKeysStatus
    };
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const bowpiSecureStorage = BowpiSecureStorageService.getInstance();