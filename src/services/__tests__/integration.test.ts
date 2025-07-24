/**
 * Integration test for offline-first data infrastructure
 * Tests the basic functionality without mocking external dependencies
 */

describe('Offline Infrastructure Integration', () => {
  it('should export all required services', () => {
    // Test that all services are properly exported
    const services = require('../index');
    
    expect(services.databaseService).toBeDefined();
    expect(services.secureStorageService).toBeDefined();
    expect(services.fileSystemService).toBeDefined();
    expect(services.initializationService).toBeDefined();
  });

  it('should have proper service structure', () => {
    const { databaseService } = require('../database');
    const { secureStorageService } = require('../secureStorage');
    const { fileSystemService } = require('../fileSystem');
    const { initializationService } = require('../initialization');

    // Check database service methods
    expect(typeof databaseService.initialize).toBe('function');
    expect(typeof databaseService.generateId).toBe('function');
    expect(typeof databaseService.createApplication).toBe('function');
    expect(typeof databaseService.getApplication).toBe('function');

    // Check secure storage service methods
    expect(typeof secureStorageService.storeAuthTokens).toBe('function');
    expect(typeof secureStorageService.getAuthTokens).toBe('function');
    expect(typeof secureStorageService.clearAuthTokens).toBe('function');

    // Check file system service methods
    expect(typeof fileSystemService.initialize).toBe('function');
    expect(typeof fileSystemService.saveDocument).toBe('function');
    expect(typeof fileSystemService.getDocument).toBe('function');

    // Check initialization service methods
    expect(typeof initializationService.initialize).toBe('function');
    expect(typeof initializationService.checkHealth).toBe('function');
    expect(typeof initializationService.reset).toBe('function');
  });

  it('should have proper type definitions', () => {
    const types = require('../../types/database');
    
    // Check that types are properly exported
    expect(types).toBeDefined();
    
    // These should not throw when imported
    expect(() => {
      const { ApplicationStatus, SyncStatus, DocumentType } = types;
      return { ApplicationStatus, SyncStatus, DocumentType };
    }).not.toThrow();
  });

  it('should generate unique IDs', () => {
    const { databaseService } = require('../database');
    
    const id1 = databaseService.generateId();
    const id2 = databaseService.generateId();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
  });

  it('should have proper store structure', () => {
    const { useAppStore } = require('../../stores/appStore');
    
    expect(useAppStore).toBeDefined();
    expect(typeof useAppStore).toBe('function');
    
    // Test that store has expected methods
    const store = useAppStore.getState();
    expect(typeof store.setUser).toBe('function');
    expect(typeof store.setAuthenticated).toBe('function');
    expect(typeof store.setOnlineStatus).toBe('function');
    expect(typeof store.addApplication).toBe('function');
  });
});