## Storage Management

### Intelligent Storage Manager

```typescript
// Gestor inteligente de almacenamiento
export class IntelligentStorageManager {
  private static instance: IntelligentStorageManager;
  private storageStats: StorageStats = {
    totalSpace: 0,
    usedSpace: 0,
    freeSpace: 0,
    appUsage: 0,
    lastUpdate: Date.now()
  };
  
  private readonly STORAGE_THRESHOLDS = {
    WARNING_THRESHOLD: 0.8,    // 80% de uso
    CRITICAL_THRESHOLD: 0.9,   // 90% de uso
    CLEANUP_THRESHOLD: 0.85,   // 85% para limpieza automática
    MIN_FREE_SPACE: 100 * 1024 * 1024 // 100MB mínimo libre
  };
  
  private constructor() {
    this.initializeStorageMonitoring();
  }
  
  static getInstance(): IntelligentStorageManager {
    if (!this.instance) {
      this.instance = new IntelligentStorageManager();
    }
    return this.instance;
  }
  
  private async initializeStorageMonitoring(): Promise<void> {
    await this.updateStorageStats();
    this.startStorageMonitoring();
  }
  
  private startStorageMonitoring(): void {
    // Monitorear almacenamiento cada 10 minutos
    setInterval(async () => {
      await this.updateStorageStats();
      await this.checkStorageThresholds();
    }, 10 * 60 * 1000);
  }
  
  private async updateStorageStats(): Promise<void> {
    try {
      const deviceStorage = await DeviceInfo.getFreeDiskStorage();
      const totalStorage = await DeviceInfo.getTotalDiskCapacity();
      const appUsage = await this.calculateAppStorageUsage();
      
      this.storageStats = {
        totalSpace: totalStorage,
        usedSpace: totalStorage - deviceStorage,
        freeSpace: deviceStorage,
        appUsage,
        lastUpdate: Date.now(),
        usagePercentage: ((totalStorage - deviceStorage) / totalStorage) * 100
      };
      
    } catch (error) {
      console.error('Failed to update storage stats:', error);
    }
  }
  
  private async calculateAppStorageUsage(): Promise<number> {
    try {
      let totalSize = 0;
      
      // Calcular tamaño de base de datos
      const dbPath = `${RNFS.DocumentDirectoryPath}/credibowpi.db`;
      if (await RNFS.exists(dbPath)) {
        const dbStats = await RNFS.stat(dbPath);
        totalSize += dbStats.size;
      }
      
      // Calcular tamaño de caché de imágenes
      const imageCachePath = `${RNFS.CachesDirectoryPath}/images`;
      if (await RNFS.exists(imageCachePath)) {
        const imageFiles = await RNFS.readDir(imageCachePath);
        for (const file of imageFiles) {
          totalSize += file.size;
        }
      }
      
      // Calcular tamaño de documentos
      const documentsPath = `${RNFS.DocumentDirectoryPath}/documents`;
      if (await RNFS.exists(documentsPath)) {
        const documentFiles = await RNFS.readDir(documentsPath);
        for (const file of documentFiles) {
          totalSize += file.size;
        }
      }
      
      return totalSize;
      
    } catch (error) {
      console.error('Failed to calculate app storage usage:', error);
      return 0;
    }
  }
  
  private async checkStorageThresholds(): Promise<void> {
    const usagePercentage = this.storageStats.usagePercentage || 0;
    const freeSpace = this.storageStats.freeSpace;
    
    if (usagePercentage >= this.STORAGE_THRESHOLDS.CRITICAL_THRESHOLD * 100 ||
        freeSpace < this.STORAGE_THRESHOLDS.MIN_FREE_SPACE) {
      await this.handleCriticalStorage();
    } else if (usagePercentage >= this.STORAGE_THRESHOLDS.WARNING_THRESHOLD * 100) {
      await this.handleStorageWarning();
    } else if (usagePercentage >= this.STORAGE_THRESHOLDS.CLEANUP_THRESHOLD * 100) {
      await this.performAutomaticCleanup();
    }
  }
  
  private async handleCriticalStorage(): Promise<void> {
    console.error('🚨 Critical storage usage detected!');
    
    // Mostrar alerta al usuario
    Alert.alert(
      'Almacenamiento Crítico',
      'El espacio de almacenamiento está casi lleno. La aplicación realizará una limpieza automática.',
      [{ text: 'Entendido' }]
    );
    
    // Limpieza agresiva
    await this.performAggressiveCleanup();
  }
  
  private async handleStorageWarning(): Promise<void> {
    console.warn('⚠️ High storage usage detected');\n    \n    // Mostrar notificación discreta\n    Toast.show({\n      type: 'warning',\n      text1: 'Espacio de Almacenamiento',\n      text2: 'El almacenamiento está llegando al límite.',\n      visibilityTime: 5000\n    });\n    \n    // Limpieza moderada\n    await this.performModerateCleanup();\n  }\n  \n  private async performAutomaticCleanup(): Promise<void> {\n    console.log('🧹 Performing automatic storage cleanup');\n    \n    const cleanupTasks = [\n      this.cleanupImageCache(),\n      this.cleanupTempFiles(),\n      this.cleanupOldLogs(),\n      this.compactDatabase()\n    ];\n    \n    await Promise.all(cleanupTasks);\n  }\n  \n  private async performAggressiveCleanup(): Promise<void> {\n    console.log('🧹 Performing aggressive storage cleanup');\n    \n    // Limpiar caché de imágenes agresivamente\n    await ImageCacheManager.getInstance().reduceCacheSize(0.2); // Reducir a 20%\n    \n    // Limpiar archivos temporales\n    await this.cleanupTempFiles();\n    \n    // Limpiar logs antiguos\n    await this.cleanupOldLogs();\n    \n    // Compactar base de datos\n    await this.compactDatabase();\n    \n    // Limpiar documentos en caché\n    await this.cleanupCachedDocuments();\n    \n    // Limpiar datos de sincronización antiguos\n    await this.cleanupOldSyncData();\n  }\n  \n  private async performModerateCleanup(): Promise<void> {\n    console.log('🧹 Performing moderate storage cleanup');\n    \n    // Limpiar caché de imágenes moderadamente\n    await ImageCacheManager.getInstance().reduceCacheSize(0.7); // Reducir a 70%\n    \n    // Limpiar archivos temporales\n    await this.cleanupTempFiles();\n    \n    // Limpiar logs antiguos\n    await this.cleanupOldLogs();\n  }\n  \n  private async cleanupImageCache(): Promise<void> {\n    try {\n      await ImageCacheManager.getInstance().cleanup();\n      console.log('✅ Image cache cleaned up');\n    } catch (error) {\n      console.error('Failed to cleanup image cache:', error);\n    }\n  }\n  \n  private async cleanupTempFiles(): Promise<void> {\n    try {\n      const tempPath = RNFS.TemporaryDirectoryPath;\n      const tempFiles = await RNFS.readDir(tempPath);\n      \n      let removedCount = 0;\n      let freedSpace = 0;\n      \n      for (const file of tempFiles) {\n        // Eliminar archivos temporales de más de 1 día\n        const fileAge = Date.now() - new Date(file.mtime).getTime();\n        if (fileAge > 24 * 60 * 60 * 1000) {\n          await RNFS.unlink(file.path);\n          removedCount++;\n          freedSpace += file.size;\n        }\n      }\n      \n      console.log(`✅ Cleaned up ${removedCount} temp files, freed ${this.formatBytes(freedSpace)}`);\n      \n    } catch (error) {\n      console.error('Failed to cleanup temp files:', error);\n    }\n  }\n  \n  private async cleanupOldLogs(): Promise<void> {\n    try {\n      const logsPath = `${RNFS.DocumentDirectoryPath}/logs`;\n      \n      if (await RNFS.exists(logsPath)) {\n        const logFiles = await RNFS.readDir(logsPath);\n        \n        let removedCount = 0;\n        let freedSpace = 0;\n        \n        for (const file of logFiles) {\n          // Eliminar logs de más de 7 días\n          const fileAge = Date.now() - new Date(file.mtime).getTime();\n          if (fileAge > 7 * 24 * 60 * 60 * 1000) {\n            await RNFS.unlink(file.path);\n            removedCount++;\n            freedSpace += file.size;\n          }\n        }\n        \n        console.log(`✅ Cleaned up ${removedCount} old log files, freed ${this.formatBytes(freedSpace)}`);\n      }\n      \n    } catch (error) {\n      console.error('Failed to cleanup old logs:', error);\n    }\n  }\n  \n  private async compactDatabase(): Promise<void> {\n    try {\n      const db = await DatabaseManager.getInstance().getDatabase();\n      \n      // Ejecutar VACUUM para compactar la base de datos\n      await db.executeSql('VACUUM');\n      \n      console.log('✅ Database compacted');\n      \n    } catch (error) {\n      console.error('Failed to compact database:', error);\n    }\n  }\n  \n  private async cleanupCachedDocuments(): Promise<void> {\n    try {\n      const documentsPath = `${RNFS.CachesDirectoryPath}/documents`;\n      \n      if (await RNFS.exists(documentsPath)) {\n        const documentFiles = await RNFS.readDir(documentsPath);\n        \n        let removedCount = 0;\n        let freedSpace = 0;\n        \n        for (const file of documentFiles) {\n          // Eliminar documentos en caché de más de 3 días\n          const fileAge = Date.now() - new Date(file.mtime).getTime();\n          if (fileAge > 3 * 24 * 60 * 60 * 1000) {\n            await RNFS.unlink(file.path);\n            removedCount++;\n            freedSpace += file.size;\n          }\n        }\n        \n        console.log(`✅ Cleaned up ${removedCount} cached documents, freed ${this.formatBytes(freedSpace)}`);\n      }\n      \n    } catch (error) {\n      console.error('Failed to cleanup cached documents:', error);\n    }\n  }\n  \n  private async cleanupOldSyncData(): Promise<void> {\n    try {\n      const db = await DatabaseManager.getInstance().getDatabase();\n      \n      // Eliminar operaciones de sincronización completadas de más de 30 días\n      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);\n      \n      await db.executeSql(\n        'DELETE FROM sync_operations WHERE status = \"completed\" AND completed_at < ?',\n        [thirtyDaysAgo]\n      );\n      \n      console.log('✅ Cleaned up old sync data');\n      \n    } catch (error) {\n      console.error('Failed to cleanup old sync data:', error);\n    }\n  }\n  \n  private formatBytes(bytes: number): string {\n    if (bytes === 0) return '0 Bytes';\n    \n    const k = 1024;\n    const sizes = ['Bytes', 'KB', 'MB', 'GB'];\n    const i = Math.floor(Math.log(bytes) / Math.log(k));\n    \n    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];\n  }\n  \n  // API pública\n  getStorageStats(): StorageStats {\n    return { ...this.storageStats };\n  }\n  \n  async forceCleanup(): Promise<void> {\n    await this.performAggressiveCleanup();\n    await this.updateStorageStats();\n  }\n  \n  async getDetailedStorageBreakdown(): Promise<StorageBreakdown> {\n    const breakdown: StorageBreakdown = {\n      database: 0,\n      imageCache: 0,\n      documents: 0,\n      tempFiles: 0,\n      logs: 0,\n      other: 0\n    };\n    \n    try {\n      // Base de datos\n      const dbPath = `${RNFS.DocumentDirectoryPath}/credibowpi.db`;\n      if (await RNFS.exists(dbPath)) {\n        const dbStats = await RNFS.stat(dbPath);\n        breakdown.database = dbStats.size;\n      }\n      \n      // Caché de imágenes\n      const imageCachePath = `${RNFS.CachesDirectoryPath}/images`;\n      if (await RNFS.exists(imageCachePath)) {\n        const imageFiles = await RNFS.readDir(imageCachePath);\n        breakdown.imageCache = imageFiles.reduce((sum, file) => sum + file.size, 0);\n      }\n      \n      // Documentos\n      const documentsPath = `${RNFS.DocumentDirectoryPath}/documents`;\n      if (await RNFS.exists(documentsPath)) {\n        const documentFiles = await RNFS.readDir(documentsPath);\n        breakdown.documents = documentFiles.reduce((sum, file) => sum + file.size, 0);\n      }\n      \n      // Archivos temporales\n      const tempFiles = await RNFS.readDir(RNFS.TemporaryDirectoryPath);\n      breakdown.tempFiles = tempFiles.reduce((sum, file) => sum + file.size, 0);\n      \n      // Logs\n      const logsPath = `${RNFS.DocumentDirectoryPath}/logs`;\n      if (await RNFS.exists(logsPath)) {\n        const logFiles = await RNFS.readDir(logsPath);\n        breakdown.logs = logFiles.reduce((sum, file) => sum + file.size, 0);\n      }\n      \n      // Otros archivos\n      const totalCalculated = Object.values(breakdown).reduce((sum, size) => sum + size, 0);\n      breakdown.other = Math.max(0, this.storageStats.appUsage - totalCalculated);\n      \n    } catch (error) {\n      console.error('Failed to get detailed storage breakdown:', error);\n    }\n    \n    return breakdown;\n  }\n}\n\ninterface StorageStats {\n  totalSpace: number;\n  usedSpace: number;\n  freeSpace: number;\n  appUsage: number;\n  lastUpdate: number;\n  usagePercentage?: number;\n}\n\ninterface StorageBreakdown {\n  database: number;\n  imageCache: number;\n  documents: number;\n  tempFiles: number;\n  logs: number;\n  other: number;\n}\n```\n\n## Network Optimization\n\n### Adaptive Network Manager\n\n```typescript\n// Gestor adaptativo de red\nexport class AdaptiveNetworkManager {\n  private static instance: AdaptiveNetworkManager;\n  private networkState: NetworkState = {\n    isConnected: false,\n    type: 'unknown',\n    effectiveType: 'unknown',\n    downlink: 0,\n    rtt: 0\n  };\n  \n  private networkMetrics: NetworkMetrics = {\n    averageLatency: 0,\n    averageThroughput: 0,\n    successRate: 1,\n    errorRate: 0,\n    lastMeasurement: Date.now()\n  };\n  \n  private readonly NETWORK_THRESHOLDS = {\n    SLOW_NETWORK_RTT: 1000,      // 1 segundo\n    FAST_NETWORK_RTT: 100,       // 100ms\n    LOW_BANDWIDTH: 0.5,          // 0.5 Mbps\n    HIGH_BANDWIDTH: 10,          // 10 Mbps\n    TIMEOUT_MULTIPLIERS: {\n      '2g': 3,\n      '3g': 2,\n      '4g': 1,\n      'wifi': 1\n    }\n  };\n  \n  private constructor() {\n    this.initializeNetworkMonitoring();\n  }\n  \n  static getInstance(): AdaptiveNetworkManager {\n    if (!this.instance) {\n      this.instance = new AdaptiveNetworkManager();\n    }\n    return this.instance;\n  }\n  \n  private initializeNetworkMonitoring(): void {\n    // Monitorear cambios de red\n    NetInfo.addEventListener(state => {\n      this.updateNetworkState(state);\n    });\n    \n    // Medir rendimiento de red periódicamente\n    setInterval(() => {\n      this.measureNetworkPerformance();\n    }, 30000); // Cada 30 segundos\n  }\n  \n  private updateNetworkState(state: any): void {\n    this.networkState = {\n      isConnected: state.isConnected || false,\n      type: state.type || 'unknown',\n      effectiveType: state.details?.effectiveType || 'unknown',\n      downlink: state.details?.downlink || 0,\n      rtt: state.details?.rtt || 0\n    };\n    \n    console.log(`📶 Network state updated: ${this.networkState.type} (${this.networkState.effectiveType})`);\n  }\n  \n  private async measureNetworkPerformance(): Promise<void> {\n    if (!this.networkState.isConnected) {\n      return;\n    }\n    \n    try {\n      const startTime = Date.now();\n      \n      // Hacer una petición pequeña para medir latencia\n      const response = await fetch('/api/ping', {\n        method: 'GET',\n        cache: 'no-cache',\n        headers: {\n          'Cache-Control': 'no-cache'\n        }\n      });\n      \n      const endTime = Date.now();\n      const latency = endTime - startTime;\n      \n      // Actualizar métricas\n      this.updateNetworkMetrics(latency, response.ok);\n      \n    } catch (error) {\n      this.updateNetworkMetrics(5000, false); // Timeout como latencia alta\n    }\n  }\n  \n  private updateNetworkMetrics(latency: number, success: boolean): void {\n    // Promedio móvil para latencia\n    this.networkMetrics.averageLatency = \n      (this.networkMetrics.averageLatency * 0.8) + (latency * 0.2);\n    \n    // Actualizar tasa de éxito\n    this.networkMetrics.successRate = \n      (this.networkMetrics.successRate * 0.9) + (success ? 0.1 : 0);\n    \n    this.networkMetrics.errorRate = 1 - this.networkMetrics.successRate;\n    this.networkMetrics.lastMeasurement = Date.now();\n  }\n  \n  getOptimalRequestConfig(requestType: RequestType): RequestConfig {\n    const baseConfig: RequestConfig = {\n      timeout: 15000,\n      retryAttempts: 3,\n      retryDelay: 1000,\n      compressionEnabled: false,\n      batchingEnabled: false\n    };\n    \n    // Ajustar según el tipo de red\n    const networkMultiplier = this.NETWORK_THRESHOLDS.TIMEOUT_MULTIPLIERS[\n      this.networkState.effectiveType as keyof typeof this.NETWORK_THRESHOLDS.TIMEOUT_MULTIPLIERS\n    ] || 2;\n    \n    baseConfig.timeout *= networkMultiplier;\n    \n    // Ajustar según latencia medida\n    if (this.networkMetrics.averageLatency > this.NETWORK_THRESHOLDS.SLOW_NETWORK_RTT) {\n      baseConfig.timeout *= 2;\n      baseConfig.retryAttempts = 5;\n      baseConfig.retryDelay = 3000;\n      baseConfig.compressionEnabled = true;\n    } else if (this.networkMetrics.averageLatency < this.NETWORK_THRESHOLDS.FAST_NETWORK_RTT) {\n      baseConfig.timeout *= 0.5;\n      baseConfig.retryAttempts = 2;\n      baseConfig.retryDelay = 500;\n    }\n    \n    // Ajustar según tipo de request\n    switch (requestType) {\n      case 'AUTHENTICATION':\n        baseConfig.timeout = Math.max(baseConfig.timeout, 30000);\n        baseConfig.retryAttempts = 2;\n        break;\n        \n      case 'FILE_UPLOAD':\n        baseConfig.timeout = Math.max(baseConfig.timeout, 120000);\n        baseConfig.retryAttempts = 3;\n        baseConfig.compressionEnabled = true;\n        break;\n        \n      case 'DATA_SYNC':\n        baseConfig.batchingEnabled = true;\n        baseConfig.compressionEnabled = true;\n        break;\n        \n      case 'QUICK_ACTION':\n        baseConfig.timeout = Math.min(baseConfig.timeout, 5000);\n        baseConfig.retryAttempts = 1;\n        break;\n    }\n    \n    return baseConfig;\n  }\n  \n  shouldEnableDataSaving(): boolean {\n    return (\n      this.networkState.type === 'cellular' ||\n      this.networkState.downlink < this.NETWORK_THRESHOLDS.LOW_BANDWIDTH ||\n      this.networkMetrics.averageLatency > this.NETWORK_THRESHOLDS.SLOW_NETWORK_RTT\n    );\n  }\n  \n  getRecommendedImageQuality(): number {\n    if (this.networkState.type === 'wifi' && \n        this.networkState.downlink > this.NETWORK_THRESHOLDS.HIGH_BANDWIDTH) {\n      return 0.9; // Alta calidad en WiFi rápido\n    } else if (this.networkState.type === 'cellular') {\n      return 0.6; // Calidad media en celular\n    } else {\n      return 0.7; // Calidad estándar\n    }\n  }\n  \n  shouldBatchRequests(): boolean {\n    return (\n      this.networkMetrics.averageLatency > 500 || // Latencia alta\n      this.networkState.type === 'cellular' ||    // Red celular\n      this.networkMetrics.errorRate > 0.1         // Tasa de error alta\n    );\n  }\n  \n  getOptimalBatchSize(): number {\n    if (this.networkState.type === 'wifi') {\n      return 20; // Lotes grandes en WiFi\n    } else if (this.networkState.effectiveType === '4g') {\n      return 10; // Lotes medianos en 4G\n    } else {\n      return 5;  // Lotes pequeños en redes lentas\n    }\n  }\n  \n  // API pública\n  getNetworkState(): NetworkState {\n    return { ...this.networkState };\n  }\n  \n  getNetworkMetrics(): NetworkMetrics {\n    return { ...this.networkMetrics };\n  }\n  \n  isSlowNetwork(): boolean {\n    return (\n      this.networkMetrics.averageLatency > this.NETWORK_THRESHOLDS.SLOW_NETWORK_RTT ||\n      this.networkState.downlink < this.NETWORK_THRESHOLDS.LOW_BANDWIDTH\n    );\n  }\n  \n  isFastNetwork(): boolean {\n    return (\n      this.networkMetrics.averageLatency < this.NETWORK_THRESHOLDS.FAST_NETWORK_RTT &&\n      this.networkState.downlink > this.NETWORK_THRESHOLDS.HIGH_BANDWIDTH\n    );\n  }\n}\n\ninterface NetworkState {\n  isConnected: boolean;\n  type: string;\n  effectiveType: string;\n  downlink: number;\n  rtt: number;\n}\n\ninterface NetworkMetrics {\n  averageLatency: number;\n  averageThroughput: number;\n  successRate: number;\n  errorRate: number;\n  lastMeasurement: number;\n}\n\ninterface RequestConfig {\n  timeout: number;\n  retryAttempts: number;\n  retryDelay: number;\n  compressionEnabled: boolean;\n  batchingEnabled: boolean;\n}\n\ntype RequestType = 'AUTHENTICATION' | 'FILE_UPLOAD' | 'DATA_SYNC' | 'QUICK_ACTION';\n```"