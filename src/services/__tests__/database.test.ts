import { databaseService } from '../database';
import { CreditApplication, ApplicationStatus, SyncStatus } from '../../types/database';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid-123'),
  digestStringAsync: jest.fn().mockResolvedValue('test-hash-456'),
}));

// Mock secure storage
jest.mock('../secureStorage', () => ({
  secureStorageService: {
    getOrCreateEncryptionKey: jest.fn().mockResolvedValue('test-encryption-key'),
  },
}));

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize database successfully', async () => {
      await expect(databaseService.initialize()).resolves.not.toThrow();
    });

    it('should generate secure IDs', () => {
      const id = databaseService.generateId();
      expect(id).toBe('test-uuid-123');
    });
  });

  describe('application CRUD operations', () => {
    const mockApplication: CreditApplication = {
      id: 'test-app-1',
      agentId: 'agent-1',
      status: 'draft' as ApplicationStatus,
      syncStatus: 'local_only' as SyncStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      kyc: {
        dpiImages: {},
        isComplete: false,
      },
      identification: {
        firstName: 'John',
        lastName: 'Doe',
        dpi: '1234567890123',
        birthDate: new Date('1990-01-01'),
        nationality: 'Guatemalan',
        maritalStatus: 'single',
        address: {
          street: '123 Main St',
          city: 'Guatemala City',
          department: 'Guatemala',
          postalCode: '01001',
        },
        phone: '+502 1234-5678',
        email: 'john.doe@example.com',
      },
      finances: {
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        assets: [],
        liabilities: [],
      },
      business: {
        employmentType: 'employed',
      },
      guarantees: {
        guarantors: [],
        collateral: [],
      },
      attachments: [],
      review: {
        reviewedSections: [],
        isComplete: false,
      },
    };

    it('should create application successfully', async () => {
      await databaseService.initialize();
      await expect(databaseService.createApplication(mockApplication)).resolves.not.toThrow();
    });

    it('should handle application retrieval', async () => {
      await databaseService.initialize();
      const result = await databaseService.getApplication('test-app-1');
      expect(result).toBeNull(); // Mock returns null
    });

    it('should get applications by agent', async () => {
      await databaseService.initialize();
      const applications = await databaseService.getApplicationsByAgent('agent-1');
      expect(Array.isArray(applications)).toBe(true);
    });
  });

  describe('sync queue operations', () => {
    it('should add items to sync queue', async () => {
      await databaseService.initialize();
      
      const syncOperation = {
        id: 'sync-1',
        operationType: 'create' as const,
        entityType: 'application' as const,
        entityId: 'app-1',
        payload: { test: 'data' },
        retryCount: 0,
        createdAt: new Date(),
      };

      await expect(databaseService.addToSyncQueue(syncOperation)).resolves.not.toThrow();
    });

    it('should get sync queue items', async () => {
      await databaseService.initialize();
      const queue = await databaseService.getSyncQueue();
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should get application count', async () => {
      await databaseService.initialize();
      const count = await databaseService.getApplicationCount('agent-1');
      expect(typeof count).toBe('number');
    });

    it('should get pending sync count', async () => {
      await databaseService.initialize();
      const count = await databaseService.getPendingSyncCount();
      expect(typeof count).toBe('number');
    });
  });
});