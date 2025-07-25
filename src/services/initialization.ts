import { databaseService } from './database';
import { secureStorageService } from './secureStorage';
import { fileSystemService } from './fileSystem';
import { useAppStore } from '../stores/appStore';

export interface InitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class InitializationService {
  private initialized = false;

  async initialize(): Promise<InitializationResult> {
    if (this.initialized) {
      return { success: true, errors: [], warnings: ['Already initialized'] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log(
        'Starting CrediBowpi offline infrastructure initialization...'
      );

      // Initialize database service
      try {
        await databaseService.initialize();
        console.log('✓ Database service initialized');
      } catch (error) {
        const errorMsg = `Database initialization failed: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // Initialize file system service
      try {
        await fileSystemService.initialize();
        console.log('✓ File system service initialized');
      } catch (error) {
        const errorMsg = `File system initialization failed: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // Check secure storage availability
      try {
        const storageInfo = await secureStorageService.getStorageInfo();
        console.log('✓ Secure storage service available', storageInfo);
      } catch (error) {
        const warningMsg = `Secure storage check warning: ${error.message}`;
        console.warn(warningMsg);
        warnings.push(warningMsg);
      }

      // Initialize app store with persisted data
      try {
        const { setLoading } = useAppStore.getState();
        setLoading(false);
        console.log('✓ App store initialized');
      } catch (error) {
        const warningMsg = `App store initialization warning: ${error.message}`;
        console.warn(warningMsg);
        warnings.push(warningMsg);
      }

      // Cleanup temp files
      try {
        await fileSystemService.cleanupTempFiles();
        console.log('✓ Temp files cleaned up');
      } catch (error) {
        const warningMsg = `Temp cleanup warning: ${error.message}`;
        console.warn(warningMsg);
        warnings.push(warningMsg);
      }

      // Check storage space
      try {
        const storageInfo = await fileSystemService.getStorageInfo();
        const freeSpaceGB = storageInfo.freeSpace / (1024 * 1024 * 1024);

        if (freeSpaceGB < 1) {
          warnings.push('Low storage space detected (< 1GB free)');
        }

        console.log(
          `✓ Storage check complete: ${freeSpaceGB.toFixed(2)}GB free`
        );
      } catch (error) {
        const warningMsg = `Storage check warning: ${error.message}`;
        console.warn(warningMsg);
        warnings.push(warningMsg);
      }

      this.initialized = errors.length === 0;

      if (this.initialized) {
        console.log(
          '🎉 CrediBowpi offline infrastructure initialized successfully'
        );
      } else {
        console.error('❌ CrediBowpi initialization completed with errors');
      }

      return {
        success: this.initialized,
        errors,
        warnings,
      };
    } catch (error) {
      const errorMsg = `Critical initialization error: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);

      return {
        success: false,
        errors,
        warnings,
      };
    }
  }

  async checkHealth(): Promise<{
    database: boolean;
    fileSystem: boolean;
    secureStorage: boolean;
    overall: boolean;
  }> {
    const health = {
      database: false,
      fileSystem: false,
      secureStorage: false,
      overall: false,
    };

    try {
      // Check database
      const db = await databaseService.getDatabase();
      health.database = !!db;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      // Check file system
      const storageInfo = await fileSystemService.getStorageInfo();
      health.fileSystem = storageInfo.freeSpace > 0;
    } catch (error) {
      console.error('File system health check failed:', error);
    }

    try {
      // Check secure storage
      const hasSession = await secureStorageService.hasValidSession();
      health.secureStorage = true; // Service is available even if no session
    } catch (error) {
      console.error('Secure storage health check failed:', error);
    }

    health.overall =
      health.database && health.fileSystem && health.secureStorage;

    return health;
  }

  async reset(): Promise<void> {
    console.log('Resetting CrediBowpi offline infrastructure...');

    try {
      // Clear app store
      const { reset } = useAppStore.getState();
      reset();

      // Clear secure storage (but keep encryption keys)
      await secureStorageService.clearAllData();

      // Close database connection
      await databaseService.close();

      // Cleanup temp files
      await fileSystemService.cleanupTempFiles();

      this.initialized = false;
      console.log('✓ Infrastructure reset complete');
    } catch (error) {
      console.error('Failed to reset infrastructure:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const initializationService = new InitializationService();
