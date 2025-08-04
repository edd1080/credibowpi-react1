# Performance Guidelines

## Overview

Esta guía establece las mejores prácticas de rendimiento para CrediBowpi Mobile, incluyendo optimizaciones específicas para dispositivos móviles, manejo eficiente de recursos y estrategias para maximizar el rendimiento en entornos offline-first.

## Table of Contents

1. [Mobile Optimization](#mobile-optimization)
2. [Image Compression and Handling](#image-compression-and-handling)
3. [Database Query Optimization](#database-query-optimization)
4. [Memory Management Patterns](#memory-management-patterns)
5. [Battery Usage Considerations](#battery-usage-considerations)
6. [Offline Performance](#offline-performance)
7. [Data Caching Strategies](#data-caching-strategies)
8. [Sync Optimization](#sync-optimization)
9. [Storage Management](#storage-management)
10. [Network Optimization](#network-optimization)
11. [UI Performance](#ui-performance)
12. [Performance Monitoring](#performance-monitoring)

## Mobile Optimization

### React Native Performance Best Practices

```typescript
// Optimizaciones específicas para React Native
export class MobileOptimizationManager {
  private static readonly PERFORMANCE_CONFIG = {
    // Configuración de renderizado
    rendering: {
      enableHermes: true,
      enableFabric: true,
      enableTurboModules: true,
      removeClippedSubviews: true,
      maxToRenderPerBatch: 10,
      initialNumToRender: 10,
      windowSize: 5
    },
    
    // Configuración de imágenes
    images: {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      compressionQuality: 0.8,
      resizeMode: 'contain',
      enableProgressiveJPEG: true
    },
    
    // Configuración de memoria
    memory: {
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      gcThreshold: 0.8,
      enableMemoryWarnings: true
    }
  };
  
  static optimizeAppStartup(): void {
    // 1. Lazy loading de módulos no críticos
    this.setupLazyLoading();
    
    // 2. Precargar datos críticos
    this.preloadCriticalData();
    
    // 3. Optimizar bundle splitting
    this.optimizeBundleSplitting();
    
    // 4. Configurar performance monitoring
    this.setupPerformanceMonitoring();
  }
  
  private static setupLazyLoading(): void {
    // Lazy loading de screens no críticas
    const LazyScreens = {
      Settings: React.lazy(() => import('../screens/Settings')),
      Reports: React.lazy(() => import('../screens/Reports')),
      Help: React.lazy(() => import('../screens/Help'))
    };
    
    // Lazy loading de servicios pesados
    const LazyServices = {
      AnalyticsService: () => import('../services/AnalyticsService'),
      ReportingService: () => import('../services/ReportingService'),
      ExportService: () => import('../services/ExportService')
    };
  }
  
  private static async preloadCriticalData(): Promise<void> {
    // Precargar datos que se necesitan inmediatamente
    const criticalData = [
      'user_session',
      'app_configuration',
      'cached_forms'
    ];
    
    const preloadPromises = criticalData.map(async (dataType) => {
      try {
        await this.preloadDataType(dataType);
      } catch (error) {
        console.warn(`Failed to preload ${dataType}:`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
  }
  
  private static optimizeBundleSplitting(): void {
    // Configurar code splitting para reducir bundle inicial
    const bundleConfig = {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true
          }
        }
      }
    };
  }
}
```

### Component Optimization Patterns

```typescript
// Patrones de optimización para componentes
export const OptimizedComponent = React.memo<ComponentProps>(({ data, onPress }) => {
  // 1. Memoizar cálculos costosos
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayValue: formatCurrency(item.amount),
      riskColor: getRiskColor(item.riskLevel)
    }));
  }, [data]);
  
  // 2. Memoizar callbacks
  const handlePress = useCallback((itemId: string) => {
    onPress?.(itemId);
  }, [onPress]);
  
  // 3. Usar keys estables para listas
  const renderItem = useCallback(({ item, index }) => (
    <ListItem
      key={`${item.id}-${item.version}`} // Key estable
      data={item}
      onPress={handlePress}
    />
  ), [handlePress]);
  
  return (
    <FlatList
      data={processedData}
      renderItem={renderItem}
      // Optimizaciones de FlatList
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      initialNumToRender={10}
      windowSize={5}
      getItemLayout={(data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      // Evitar re-renders innecesarios
      keyExtractor={(item) => `${item.id}-${item.version}`}
    />
  );
});

// Hook personalizado para optimizar re-renders
export const useOptimizedState = <T>(initialValue: T) => {
  const [state, setState] = useState(initialValue);
  
  // Evitar actualizaciones innecesarias
  const setOptimizedState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prevState)
        : newValue;
      
      // Solo actualizar si realmente cambió
      return JSON.stringify(prevState) !== JSON.stringify(nextState) 
        ? nextState 
        : prevState;
    });
  }, []);
  
  return [state, setOptimizedState] as const;
};

// Componente optimizado para listas grandes
export const VirtualizedList = React.memo<VirtualizedListProps>(({
  data,
  renderItem,
  itemHeight,
  containerHeight
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Calcular elementos visibles
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollOffset / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      data.length
    );
    
    return { startIndex, endIndex };
  }, [scrollOffset, itemHeight, containerHeight, data.length]);
  
  // Solo renderizar elementos visibles
  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [data, visibleRange]);
  
  return (
    <ScrollView
      onScroll={(event) => {
        setScrollOffset(event.nativeEvent.contentOffset.y);
      }}
      scrollEventThrottle={16}
    >
      {/* Spacer superior */}
      <View style={{ height: visibleRange.startIndex * itemHeight }} />
      
      {/* Elementos visibles */}
      {visibleItems.map((item, index) => (
        <View key={item.id} style={{ height: itemHeight }}>
          {renderItem(item, visibleRange.startIndex + index)}
        </View>
      ))}
      
      {/* Spacer inferior */}
      <View style={{ 
        height: (data.length - visibleRange.endIndex) * itemHeight 
      }} />
    </ScrollView>
  );
});
```#
# Image Compression and Handling

### Image Optimization Service

```typescript
// Servicio de optimización de imágenes
export class ImageOptimizationService {
  private static readonly COMPRESSION_CONFIG = {
    // Configuración por tipo de imagen
    document: {
      maxWidth: 1200,
      maxHeight: 1600,
      quality: 0.85,
      format: 'jpeg'
    },
    selfie: {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.8,
      format: 'jpeg'
    },
    signature: {
      maxWidth: 600,
      maxHeight: 300,
      quality: 0.9,
      format: 'png'
    }
  };
  
  private static readonly CACHE_CONFIG = {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    compressionLevel: 6
  };
  
  static async optimizeImage(
    imageUri: string,
    imageType: 'document' | 'selfie' | 'signature',
    options?: ImageOptimizationOptions
  ): Promise<OptimizedImageResult> {
    const config = this.COMPRESSION_CONFIG[imageType];
    const startTime = performance.now();
    
    try {
      // 1. Validar imagen
      const validation = await this.validateImage(imageUri);
      if (!validation.isValid) {
        throw new ImageOptimizationError(validation.errors.join(', '));
      }
      
      // 2. Redimensionar si es necesario
      const resized = await this.resizeImage(imageUri, config, options);
      
      // 3. Comprimir imagen
      const compressed = await this.compressImage(resized.uri, config);
      
      // 4. Generar thumbnail si es necesario
      const thumbnail = await this.generateThumbnail(compressed.uri, imageType);
      
      // 5. Calcular métricas
      const metrics = await this.calculateMetrics(imageUri, compressed.uri);
      
      const processingTime = performance.now() - startTime;
      
      return {
        originalUri: imageUri,
        optimizedUri: compressed.uri,
        thumbnailUri: thumbnail?.uri,
        metrics: {
          ...metrics,
          processingTime,
          compressionRatio: metrics.originalSize / metrics.optimizedSize
        }
      };
      
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw new ImageOptimizationError(`Failed to optimize image: ${error.message}`);
    }
  }
  
  private static async validateImage(imageUri: string): Promise<ValidationResult> {
    const errors: string[] = [];
    
    try {
      // Verificar que el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        errors.push('Image file does not exist');
        return { isValid: false, errors };
      }
      
      // Verificar tamaño del archivo
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (fileInfo.size > maxFileSize) {
        errors.push(`Image file too large: ${fileInfo.size} bytes (max: ${maxFileSize})`);
      }
      
      // Verificar dimensiones
      const imageInfo = await this.getImageDimensions(imageUri);
      if (imageInfo.width > 4000 || imageInfo.height > 4000) {
        errors.push(`Image dimensions too large: ${imageInfo.width}x${imageInfo.height}`);
      }
      
      return { isValid: errors.length === 0, errors };
      
    } catch (error) {
      return { 
        isValid: false, 
        errors: [`Failed to validate image: ${error.message}`] 
      };
    }
  }
  
  private static async resizeImage(
    imageUri: string,
    config: any,
    options?: ImageOptimizationOptions
  ): Promise<{ uri: string; width: number; height: number }> {
    const targetWidth = options?.maxWidth || config.maxWidth;
    const targetHeight = options?.maxHeight || config.maxHeight;
    
    // Usar ImageManipulator de Expo para redimensionar
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: targetWidth,
            height: targetHeight
          }
        }
      ],
      {
        compress: 1.0, // Sin compresión en este paso
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    return {
      uri: result.uri,
      width: result.width,
      height: result.height
    };
  }
  
  private static async compressImage(
    imageUri: string,
    config: any
  ): Promise<{ uri: string; size: number }> {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [], // Sin transformaciones adicionales
      {
        compress: config.quality,
        format: config.format === 'jpeg' 
          ? ImageManipulator.SaveFormat.JPEG 
          : ImageManipulator.SaveFormat.PNG,
        base64: false
      }
    );
    
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    
    return {
      uri: result.uri,
      size: fileInfo.size
    };
  }
  
  private static async generateThumbnail(
    imageUri: string,
    imageType: string
  ): Promise<{ uri: string } | null> {
    // Solo generar thumbnails para documentos
    if (imageType !== 'document') {
      return null;
    }
    
    const thumbnail = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: 200,
            height: 200
          }
        }
      ],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    return { uri: thumbnail.uri };
  }
  
  static async cacheImage(
    imageUri: string,
    cacheKey: string
  ): Promise<string> {
    const cacheDir = `${FileSystem.cacheDirectory}images/`;
    const cachedPath = `${cacheDir}${cacheKey}`;
    
    try {
      // Crear directorio de cache si no existe
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      
      // Verificar si ya está en cache
      const cacheInfo = await FileSystem.getInfoAsync(cachedPath);
      if (cacheInfo.exists) {
        // Verificar si no ha expirado
        const age = Date.now() - cacheInfo.modificationTime;
        if (age < this.CACHE_CONFIG.maxAge) {
          return cachedPath;
        }
      }
      
      // Copiar imagen al cache
      await FileSystem.copyAsync({
        from: imageUri,
        to: cachedPath
      });
      
      // Limpiar cache si es necesario
      await this.cleanupImageCache();
      
      return cachedPath;
      
    } catch (error) {
      console.error('Failed to cache image:', error);
      return imageUri; // Retornar URI original si falla el cache
    }
  }
  
  private static async cleanupImageCache(): Promise<void> {
    try {
      const cacheDir = `${FileSystem.cacheDirectory}images/`;
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      
      let totalSize = 0;
      const fileInfos: Array<{ name: string; size: number; modificationTime: number }> = [];
      
      // Obtener información de todos los archivos
      for (const fileName of files) {
        const filePath = `${cacheDir}${fileName}`;
        const info = await FileSystem.getInfoAsync(filePath);
        
        if (info.exists) {
          totalSize += info.size;
          fileInfos.push({
            name: fileName,
            size: info.size,
            modificationTime: info.modificationTime
          });
        }
      }
      
      // Limpiar si excede el tamaño máximo
      if (totalSize > this.CACHE_CONFIG.maxSize) {
        // Ordenar por fecha de modificación (más antiguos primero)
        fileInfos.sort((a, b) => a.modificationTime - b.modificationTime);
        
        let sizeToRemove = totalSize - this.CACHE_CONFIG.maxSize;
        
        for (const fileInfo of fileInfos) {
          if (sizeToRemove <= 0) break;
          
          const filePath = `${cacheDir}${fileInfo.name}`;
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          sizeToRemove -= fileInfo.size;
        }
      }
      
    } catch (error) {
      console.error('Failed to cleanup image cache:', error);
    }
  }
}

// Interfaces para optimización de imágenes
export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

export interface OptimizedImageResult {
  originalUri: string;
  optimizedUri: string;
  thumbnailUri?: string;
  metrics: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    processingTime: number;
  };
}

export class ImageOptimizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageOptimizationError';
  }
}
```

### Progressive Image Loading

```typescript
// Componente para carga progresiva de imágenes
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  thumbnailSource,
  style,
  onLoad,
  onError,
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const thumbnailOpacity = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  
  const handleThumbnailLoad = useCallback(() => {
    setThumbnailLoaded(true);
    Animated.timing(thumbnailOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [thumbnailOpacity]);
  
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Fade out thumbnail después de que la imagen principal cargue
      Animated.timing(thumbnailOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    
    onLoad?.();
  }, [imageOpacity, thumbnailOpacity, onLoad]);
  
  const handleError = useCallback((errorEvent: any) => {
    setError(errorEvent.nativeEvent.error);
    onError?.(errorEvent);
  }, [onError]);
  
  return (
    <View style={style}>
      {/* Thumbnail (baja calidad, carga rápida) */}
      {thumbnailSource && (
        <Animated.Image
          source={thumbnailSource}
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: thumbnailOpacity }
          ]}
          onLoad={handleThumbnailLoad}
          blurRadius={1}
          {...props}
        />
      )}
      
      {/* Imagen principal */}
      <Animated.Image
        source={source}
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: imageOpacity }
        ]}
        onLoad={handleImageLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Loading indicator */}
      {!imageLoaded && !error && (
        <View style={[
          StyleSheet.absoluteFillObject,
          styles.loadingContainer
        ]}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
      
      {/* Error state */}
      {error && (
        <View style={[
          StyleSheet.absoluteFillObject,
          styles.errorContainer
        ]}>
          <Icon name="image-broken" size={24} color="#999" />
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
});
```#
# Database Query Optimization

### SQLite Performance Optimization

```typescript
// Optimizaciones específicas para SQLite
export class DatabasePerformanceOptimizer {
  private static readonly OPTIMIZATION_CONFIG = {
    // Configuración de conexión
    connection: {
      busyTimeout: 30000,
      cacheSize: -2000, // 2MB
      journalMode: 'WAL',
      synchronous: 'NORMAL',
      tempStore: 'MEMORY',
      mmapSize: 268435456 // 256MB
    },
    
    // Configuración de queries
    query: {
      maxBatchSize: 100,
      maxInClauseItems: 999,
      defaultLimit: 50,
      maxLimit: 1000
    },
    
    // Configuración de índices
    indexes: {
      autoAnalyze: true,
      analyzeThreshold: 1000,
      vacuumThreshold: 0.25
    }
  };
  
  static async optimizeDatabase(db: SQLite.Database): Promise<void> {
    console.log('🔧 Optimizing database performance...');
    
    try {
      // 1. Aplicar configuraciones de rendimiento
      await this.applyPerformanceSettings(db);
      
      // 2. Analizar estadísticas de tablas
      await this.analyzeTableStatistics(db);
      
      // 3. Optimizar índices
      await this.optimizeIndexes(db);
      
      // 4. Limpiar base de datos si es necesario
      await this.performMaintenance(db);
      
      console.log('✅ Database optimization completed');
      
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
      throw error;
    }
  }
  
  private static async applyPerformanceSettings(db: SQLite.Database): Promise<void> {
    const settings = this.OPTIMIZATION_CONFIG.connection;
    
    const pragmas = [
      `PRAGMA busy_timeout = ${settings.busyTimeout}`,
      `PRAGMA cache_size = ${settings.cacheSize}`,
      `PRAGMA journal_mode = ${settings.journalMode}`,
      `PRAGMA synchronous = ${settings.synchronous}`,
      `PRAGMA temp_store = ${settings.tempStore}`,
      `PRAGMA mmap_size = ${settings.mmapSize}`,
      `PRAGMA optimize`
    ];
    
    for (const pragma of pragmas) {
      await this.executeSql(db, pragma);
    }
  }
  
  private static async analyzeTableStatistics(db: SQLite.Database): Promise<void> {
    // Obtener lista de tablas
    const tables = await this.executeSql(db, `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    // Analizar cada tabla
    for (const table of tables.rows._array) {
      await this.executeSql(db, `ANALYZE ${table.name}`);
    }
  }
  
  private static async optimizeIndexes(db: SQLite.Database): Promise<void> {
    // Verificar uso de índices
    const indexUsage = await this.getIndexUsageStats(db);
    
    // Crear índices faltantes para queries frecuentes
    await this.createMissingIndexes(db, indexUsage);
    
    // Eliminar índices no utilizados
    await this.removeUnusedIndexes(db, indexUsage);
  }
  
  static createOptimizedQuery(
    baseQuery: string,
    conditions: QueryCondition[],
    options: QueryOptions = {}
  ): OptimizedQuery {
    let query = baseQuery;
    const params: any[] = [];
    
    // 1. Agregar condiciones WHERE optimizadas
    if (conditions.length > 0) {
      const whereClause = this.buildOptimizedWhereClause(conditions, params);
      query += ` WHERE ${whereClause}`;
    }
    
    // 2. Agregar ORDER BY si es necesario
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
      if (options.orderDirection) {
        query += ` ${options.orderDirection}`;
      }
    }
    
    // 3. Agregar LIMIT para evitar queries costosos
    const limit = Math.min(
      options.limit || this.OPTIMIZATION_CONFIG.query.defaultLimit,
      this.OPTIMIZATION_CONFIG.query.maxLimit
    );
    query += ` LIMIT ${limit}`;
    
    // 4. Agregar OFFSET si es necesario
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    return {
      sql: query,
      params,
      estimatedCost: this.estimateQueryCost(query, conditions),
      usesPrimaryIndex: this.checkPrimaryIndexUsage(conditions)
    };
  }
  
  private static buildOptimizedWhereClause(
    conditions: QueryCondition[],
    params: any[]
  ): string {
    // Ordenar condiciones por selectividad (más selectivas primero)
    const sortedConditions = conditions.sort((a, b) => {
      return this.getConditionSelectivity(b) - this.getConditionSelectivity(a);
    });
    
    const clauses: string[] = [];
    
    for (const condition of sortedConditions) {
      switch (condition.operator) {
        case 'equals':
          clauses.push(`${condition.field} = ?`);
          params.push(condition.value);
          break;
          
        case 'in':
          // Optimizar IN clauses grandes
          if (Array.isArray(condition.value) && condition.value.length > this.OPTIMIZATION_CONFIG.query.maxInClauseItems) {
            // Dividir en múltiples IN clauses
            const chunks = this.chunkArray(condition.value, this.OPTIMIZATION_CONFIG.query.maxInClauseItems);
            const inClauses = chunks.map(chunk => {
              const placeholders = chunk.map(() => '?').join(',');
              params.push(...chunk);
              return `${condition.field} IN (${placeholders})`;
            });
            clauses.push(`(${inClauses.join(' OR ')})`);
          } else {
            const placeholders = condition.value.map(() => '?').join(',');
            clauses.push(`${condition.field} IN (${placeholders})`);
            params.push(...condition.value);
          }
          break;
          
        case 'range':
          if (condition.value.min !== undefined) {
            clauses.push(`${condition.field} >= ?`);
            params.push(condition.value.min);
          }
          if (condition.value.max !== undefined) {
            clauses.push(`${condition.field} <= ?`);
            params.push(condition.value.max);
          }
          break;
          
        case 'like':
          clauses.push(`${condition.field} LIKE ?`);
          params.push(condition.value);
          break;
      }
    }
    
    return clauses.join(' AND ');
  }
  
  private static getConditionSelectivity(condition: QueryCondition): number {
    // Estimar selectividad basada en el tipo de condición
    switch (condition.operator) {
      case 'equals':
        return condition.field === 'id' ? 1.0 : 0.8;
      case 'in':
        return 0.6;
      case 'range':
        return 0.4;
      case 'like':
        return 0.2;
      default:
        return 0.1;
    }
  }
  
  static async executeBatchQuery<T>(
    db: SQLite.Database,
    queries: BatchQueryItem[]
  ): Promise<BatchQueryResult<T>> {
    const results: T[] = [];
    const errors: string[] = [];
    const startTime = performance.now();
    
    try {
      // Ejecutar en transacción para mejor rendimiento
      await db.transaction(async (tx) => {
        for (const queryItem of queries) {
          try {
            const result = await this.executeTransactionQuery(tx, queryItem);
            if (result) {
              results.push(...result);
            }
          } catch (error) {
            errors.push(`Query failed: ${error.message}`);
            
            // Decidir si continuar o abortar
            if (queryItem.critical) {
              throw error;
            }
          }
        }
      });
      
      const executionTime = performance.now() - startTime;
      
      return {
        success: true,
        results,
        errors,
        executionTime,
        queriesExecuted: queries.length
      };
      
    } catch (error) {
      return {
        success: false,
        results: [],
        errors: [error.message],
        executionTime: performance.now() - startTime,
        queriesExecuted: 0
      };
    }
  }
}

// Interfaces para optimización de queries
export interface QueryCondition {
  field: string;
  operator: 'equals' | 'in' | 'range' | 'like';
  value: any;
}

export interface QueryOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface OptimizedQuery {
  sql: string;
  params: any[];
  estimatedCost: number;
  usesPrimaryIndex: boolean;
}

export interface BatchQueryItem {
  sql: string;
  params?: any[];
  critical?: boolean;
}

export interface BatchQueryResult<T> {
  success: boolean;
  results: T[];
  errors: string[];
  executionTime: number;
  queriesExecuted: number;
}
```

### Query Caching Strategy

```typescript
// Sistema de cache para queries
export class QueryCacheManager {
  private static cache = new Map<string, CachedQuery>();
  private static readonly CACHE_CONFIG = {
    maxSize: 100,
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    maxTTL: 30 * 60 * 1000,    // 30 minutos
    cleanupInterval: 60 * 1000  // 1 minuto
  };
  
  static {
    // Configurar limpieza automática del cache
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CACHE_CONFIG.cleanupInterval);
  }
  
  static async getCachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = this.CACHE_CONFIG.defaultTTL
  ): Promise<T> {
    // Verificar si existe en cache y no ha expirado
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`📦 Cache hit for query: ${cacheKey}`);
      return cached.data;
    }
    
    // Ejecutar query y cachear resultado
    console.log(`🌐 Cache miss for query: ${cacheKey}`);
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const executionTime = performance.now() - startTime;
      
      // Cachear resultado
      this.cache.set(cacheKey, {
        data: result,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl,
        executionTime,
        hitCount: 0
      });
      
      // Limpiar cache si excede el tamaño máximo
      if (this.cache.size > this.CACHE_CONFIG.maxSize) {
        this.evictLeastUsed();
      }
      
      return result;
      
    } catch (error) {
      console.error(`Query execution failed for ${cacheKey}:`, error);
      throw error;
    }
  }
  
  static invalidateCache(pattern?: string): void {
    if (!pattern) {
      // Limpiar todo el cache
      this.cache.clear();
      console.log('🗑️ All query cache cleared');
      return;
    }
    
    // Limpiar entradas que coincidan con el patrón
    const regex = new RegExp(pattern);
    let removedCount = 0;
    
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    console.log(`🗑️ Removed ${removedCount} cached queries matching pattern: ${pattern}`);
  }
  
  static generateCacheKey(
    tableName: string,
    conditions: QueryCondition[],
    options: QueryOptions = {}
  ): string {
    // Crear clave única basada en parámetros de query
    const conditionsStr = conditions
      .map(c => `${c.field}:${c.operator}:${JSON.stringify(c.value)}`)
      .sort()
      .join('|');
    
    const optionsStr = Object.entries(options)
      .map(([key, value]) => `${key}:${value}`)
      .sort()
      .join('|');
    
    return `${tableName}:${conditionsStr}:${optionsStr}`;
  }
  
  private static cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, cached] of this.cache) {
      if (now >= cached.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    }
  }
  
  private static evictLeastUsed(): void {
    // Encontrar la entrada menos utilizada
    let leastUsedKey: string | null = null;
    let leastHitCount = Infinity;
    
    for (const [key, cached] of this.cache) {
      if (cached.hitCount < leastHitCount) {
        leastHitCount = cached.hitCount;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      console.log(`🗑️ Evicted least used cache entry: ${leastUsedKey}`);
    }
  }
  
  static getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    
    return {
      size: this.cache.size,
      maxSize: this.CACHE_CONFIG.maxSize,
      hitRate: this.calculateHitRate(entries),
      averageExecutionTime: this.calculateAverageExecutionTime(entries),
      oldestEntry: Math.min(...entries.map(e => e.createdAt)),
      newestEntry: Math.max(...entries.map(e => e.createdAt))
    };
  }
  
  private static calculateHitRate(entries: CachedQuery[]): number {
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalQueries = entries.length + totalHits;
    return totalQueries > 0 ? totalHits / totalQueries : 0;
  }
  
  private static calculateAverageExecutionTime(entries: CachedQuery[]): number {
    if (entries.length === 0) return 0;
    const totalTime = entries.reduce((sum, entry) => sum + entry.executionTime, 0);
    return totalTime / entries.length;
  }
}

interface CachedQuery {
  data: any;
  createdAt: number;
  expiresAt: number;
  executionTime: number;
  hitCount: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  averageExecutionTime: number;
  oldestEntry: number;
  newestEntry: number;
}
```    con
st now = Date.now();
    let removedCount = 0;
    
    for (const [key, cached] of this.cache) {
      if (now >= cached.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    }
  }
  
  private static evictLeastUsed(): void {
    // Encontrar la entrada menos utilizada
    let leastUsedKey: string | null = null;
    let leastHitCount = Infinity;
    
    for (const [key, cached] of this.cache) {
      if (cached.hitCount < leastHitCount) {
        leastHitCount = cached.hitCount;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      console.log(`🗑️ Evicted least used cache entry: ${leastUsedKey}`);
    }
  }
  
  static getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    
    return {
      size: this.cache.size,
      maxSize: this.CACHE_CONFIG.maxSize,
      hitRate: this.calculateHitRate(entries),
      averageExecutionTime: this.calculateAverageExecutionTime(entries),
      oldestEntry: Math.min(...entries.map(e => e.createdAt)),
      newestEntry: Math.max(...entries.map(e => e.createdAt))
    };
  }
  
  private static calculateHitRate(entries: CachedQuery[]): number {
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalQueries = entries.length + totalHits;
    return totalQueries > 0 ? totalHits / totalQueries : 0;
  }
  
  private static calculateAverageExecutionTime(entries: CachedQuery[]): number {
    if (entries.length === 0) return 0;
    const totalTime = entries.reduce((sum, entry) => sum + entry.executionTime, 0);
    return totalTime / entries.length;
  }
}

interface CachedQuery {
  data: any;
  createdAt: number;
  expiresAt: number;
  executionTime: number;
  hitCount: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  averageExecutionTime: number;
  oldestEntry: number;
  newestEntry: number;
}
```

## Battery Usage Considerations

### Battery Optimization Manager

```typescript
// Gestor de optimización de batería
export class BatteryOptimizationManager {
  private static instance: BatteryOptimizationManager;
  private batteryLevel: number = 1;
  private isLowPowerMode: boolean = false;
  private batteryOptimizations: BatteryOptimization[] = [];
  
  private readonly BATTERY_THRESHOLDS = {
    LOW_BATTERY: 0.2,          // 20% batería baja
    CRITICAL_BATTERY: 0.1,     // 10% batería crítica
    POWER_SAVE_MODE: 0.15      // 15% activar modo ahorro
  };
  
  private constructor() {
    this.initializeBatteryMonitoring();
  }
  
  static getInstance(): BatteryOptimizationManager {
    if (!this.instance) {
      this.instance = new BatteryOptimizationManager();
    }
    return this.instance;
  }
  
  private async initializeBatteryMonitoring(): Promise<void> {
    try {
      // Obtener nivel inicial de batería
      this.batteryLevel = await DeviceInfo.getBatteryLevel();
      this.isLowPowerMode = await DeviceInfo.isPowerSaveMode();
      
      // Configurar monitoreo continuo
      this.startBatteryMonitoring();
      
      // Aplicar optimizaciones iniciales
      await this.applyBatteryOptimizations();
      
    } catch (error) {
      console.error('Failed to initialize battery monitoring:', error);
    }
  }
  
  private startBatteryMonitoring(): void {
    // Monitorear batería cada 30 segundos
    setInterval(async () => {
      await this.updateBatteryStatus();
    }, 30000);
    
    // Listener para cambios de modo de ahorro de energía
    DeviceEventEmitter.addListener('powerSaveModeChanged', (isEnabled: boolean) => {
      this.handlePowerSaveModeChange(isEnabled);
    });
  }
  
  private async updateBatteryStatus(): Promise<void> {
    try {
      const previousLevel = this.batteryLevel;
      this.batteryLevel = await DeviceInfo.getBatteryLevel();
      this.isLowPowerMode = await DeviceInfo.isPowerSaveMode();
      
      // Verificar cambios significativos
      if (Math.abs(this.batteryLevel - previousLevel) > 0.05) {
        await this.handleBatteryLevelChange();
      }
      
    } catch (error) {
      console.error('Failed to update battery status:', error);
    }
  }
  
  private async handleBatteryLevelChange(): Promise<void> {
    console.log(`🔋 Battery level: ${(this.batteryLevel * 100).toFixed(0)}%`);
    
    if (this.batteryLevel <= this.BATTERY_THRESHOLDS.CRITICAL_BATTERY) {
      await this.enableCriticalBatteryMode();
    } else if (this.batteryLevel <= this.BATTERY_THRESHOLDS.LOW_BATTERY) {
      await this.enableLowBatteryMode();
    } else if (this.batteryLevel <= this.BATTERY_THRESHOLDS.POWER_SAVE_MODE) {
      await this.enablePowerSaveMode();
    } else {
      await this.disableBatteryOptimizations();
    }
  }
  
  private async enableCriticalBatteryMode(): Promise<void> {
    console.log('🚨 Critical battery mode enabled');
    
    const optimizations: BatteryOptimization[] = [
      {
        type: 'REDUCE_SYNC_FREQUENCY',
        description: 'Reduce sync frequency to minimum',
        action: () => this.reduceSyncFrequency(0.1) // 10% de frecuencia normal
      },
      {
        type: 'DISABLE_BACKGROUND_TASKS',
        description: 'Disable non-essential background tasks',
        action: () => this.disableBackgroundTasks()
      },
      {
        type: 'REDUCE_SCREEN_BRIGHTNESS',
        description: 'Suggest reducing screen brightness',
        action: () => this.suggestScreenBrightnessReduction()
      },
      {
        type: 'DISABLE_ANIMATIONS',
        description: 'Disable UI animations',
        action: () => this.disableAnimations()
      },
      {
        type: 'MINIMIZE_NETWORK_USAGE',
        description: 'Minimize network requests',
        action: () => this.minimizeNetworkUsage()
      }
    ];
    
    await this.applyOptimizations(optimizations);
  }
  
  private async enableLowBatteryMode(): Promise<void> {
    console.log('⚠️ Low battery mode enabled');
    
    const optimizations: BatteryOptimization[] = [
      {
        type: 'REDUCE_SYNC_FREQUENCY',
        description: 'Reduce sync frequency',
        action: () => this.reduceSyncFrequency(0.5) // 50% de frecuencia normal
      },
      {
        type: 'REDUCE_LOCATION_UPDATES',
        description: 'Reduce location update frequency',
        action: () => this.reduceLocationUpdates()
      },
      {
        type: 'OPTIMIZE_IMAGE_PROCESSING',
        description: 'Reduce image processing quality',
        action: () => this.optimizeImageProcessing()
      }
    ];
    
    await this.applyOptimizations(optimizations);
  }
  
  private async enablePowerSaveMode(): Promise<void> {
    console.log('🔋 Power save mode enabled');
    
    const optimizations: BatteryOptimization[] = [
      {
        type: 'REDUCE_SYNC_FREQUENCY',
        description: 'Slightly reduce sync frequency',
        action: () => this.reduceSyncFrequency(0.8) // 80% de frecuencia normal
      },
      {
        type: 'DEFER_NON_CRITICAL_TASKS',
        description: 'Defer non-critical background tasks',
        action: () => this.deferNonCriticalTasks()
      }
    ];
    
    await this.applyOptimizations(optimizations);
  }
  
  private async disableBatteryOptimizations(): Promise<void> {
    console.log('🔋 Normal battery mode - disabling optimizations');
    
    // Restaurar configuraciones normales
    await this.restoreNormalOperations();
    this.batteryOptimizations = [];
  }
  
  private async applyOptimizations(optimizations: BatteryOptimization[]): Promise<void> {
    for (const optimization of optimizations) {
      try {
        await optimization.action();
        this.batteryOptimizations.push(optimization);
        console.log(`✅ Applied: ${optimization.description}`);
      } catch (error) {
        console.error(`❌ Failed to apply ${optimization.type}:`, error);
      }
    }
  }
  
  private async reduceSyncFrequency(factor: number): Promise<void> {
    // Reducir frecuencia de sincronización
    const syncService = SyncService.getInstance();
    await syncService.adjustSyncFrequency(factor);
  }
  
  private async disableBackgroundTasks(): Promise<void> {
    // Deshabilitar tareas en background no esenciales
    BackgroundTaskManager.disableNonEssentialTasks();
  }
  
  private async suggestScreenBrightnessReduction(): Promise<void> {
    // Mostrar sugerencia al usuario
    Alert.alert(
      'Batería Crítica',
      'Para ahorrar batería, considera reducir el brillo de la pantalla.',
      [
        { text: 'Entendido', style: 'default' },
        { text: 'Configuración', onPress: () => Linking.openSettings() }
      ]
    );
  }
  
  private async disableAnimations(): Promise<void> {
    // Deshabilitar animaciones de UI
    UIManager.setLayoutAnimationEnabledExperimental(false);
  }
  
  private async minimizeNetworkUsage(): Promise<void> {
    // Minimizar uso de red
    NetworkManager.enableDataSavingMode();
  }
  
  private async reduceLocationUpdates(): Promise<void> {
    // Reducir frecuencia de actualizaciones de ubicación
    LocationService.reduceUpdateFrequency();
  }
  
  private async optimizeImageProcessing(): Promise<void> {
    // Reducir calidad de procesamiento de imágenes
    ImageOptimizationService.enableBatterySavingMode();
  }
  
  private async deferNonCriticalTasks(): Promise<void> {
    // Diferir tareas no críticas
    TaskScheduler.deferNonCriticalTasks();
  }
  
  private async restoreNormalOperations(): Promise<void> {
    // Restaurar operaciones normales
    const syncService = SyncService.getInstance();
    await syncService.adjustSyncFrequency(1.0);
    
    BackgroundTaskManager.enableAllTasks();
    UIManager.setLayoutAnimationEnabledExperimental(true);
    NetworkManager.disableDataSavingMode();
    LocationService.restoreNormalUpdateFrequency();
    ImageOptimizationService.disableBatterySavingMode();
    TaskScheduler.restoreNormalScheduling();
  }
  
  private handlePowerSaveModeChange(isEnabled: boolean): void {
    this.isLowPowerMode = isEnabled;
    
    if (isEnabled) {
      console.log('📱 System power save mode enabled');
      this.enablePowerSaveMode();
    } else {
      console.log('📱 System power save mode disabled');
      this.disableBatteryOptimizations();
    }
  }
  
  // API pública
  getBatteryLevel(): number {
    return this.batteryLevel;
  }
  
  isInLowPowerMode(): boolean {
    return this.isLowPowerMode;
  }
  
  getActiveOptimizations(): BatteryOptimization[] {
    return [...this.batteryOptimizations];
  }
  
  async forceOptimizationCheck(): Promise<void> {
    await this.updateBatteryStatus();
  }
}

interface BatteryOptimization {
  type: string;
  description: string;
  action: () => Promise<void>;
}
```

## Offline Performance

### Offline Data Management

```typescript
// Gestión de rendimiento offline
export class OfflinePerformanceManager {
  private static instance: OfflinePerformanceManager;
  private isOffline: boolean = false;
  private offlineQueue: OfflineOperation[] = [];
  private offlineCache: Map<string, CachedData> = new Map();
  
  private readonly OFFLINE_CONFIG = {
    MAX_QUEUE_SIZE: 1000,
    MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
    CACHE_TTL: 24 * 60 * 60 * 1000,   // 24 horas
    BATCH_SIZE: 10,
    RETRY_ATTEMPTS: 3
  };
  
  private constructor() {
    this.initializeOfflineHandling();
  }
  
  static getInstance(): OfflinePerformanceManager {
    if (!this.instance) {
      this.instance = new OfflinePerformanceManager();
    }
    return this.instance;
  }
  
  private initializeOfflineHandling(): void {
    // Monitorear estado de conexión
    NetInfo.addEventListener(state => {
      const wasOffline = this.isOffline;
      this.isOffline = !state.isConnected;
      
      if (wasOffline && !this.isOffline) {
        this.handleReconnection();
      } else if (!wasOffline && this.isOffline) {
        this.handleDisconnection();
      }
    });
    
    // Cargar datos offline persistidos
    this.loadOfflineData();
  }
  
  private async loadOfflineData(): Promise<void> {
    try {
      // Cargar cola de operaciones offline
      const queueData = await AsyncStorage.getItem('@offline_queue');
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
      }
      
      // Cargar caché offline
      const cacheData = await AsyncStorage.getItem('@offline_cache');
      if (cacheData) {
        const parsedCache = JSON.parse(cacheData);
        this.offlineCache = new Map(parsedCache);
      }
      
      console.log(`📱 Loaded ${this.offlineQueue.length} offline operations and ${this.offlineCache.size} cached items`);
      
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }
  
  private async saveOfflineData(): Promise<void> {
    try {
      // Guardar cola de operaciones
      await AsyncStorage.setItem('@offline_queue', JSON.stringify(this.offlineQueue));
      
      // Guardar caché
      const cacheArray = Array.from(this.offlineCache.entries());
      await AsyncStorage.setItem('@offline_cache', JSON.stringify(cacheArray));
      
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }
  
  async queueOfflineOperation(operation: OfflineOperation): Promise<void> {
    // Verificar límite de cola
    if (this.offlineQueue.length >= this.OFFLINE_CONFIG.MAX_QUEUE_SIZE) {
      // Remover operaciones más antiguas
      this.offlineQueue.shift();
    }
    
    operation.timestamp = Date.now();
    operation.retryCount = 0;
    this.offlineQueue.push(operation);
    
    await this.saveOfflineData();
    
    console.log(`📱 Queued offline operation: ${operation.type}`);
  }
  
  async getCachedData(key: string): Promise<any | null> {
    const cached = this.offlineCache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Verificar expiración
    if (Date.now() - cached.timestamp > this.OFFLINE_CONFIG.CACHE_TTL) {
      this.offlineCache.delete(key);
      await this.saveOfflineData();
      return null;
    }
    
    return cached.data;
  }
  
  async setCachedData(key: string, data: any): Promise<void> {
    // Verificar límite de caché
    const dataSize = JSON.stringify(data).length;
    if (this.getCacheSize() + dataSize > this.OFFLINE_CONFIG.MAX_CACHE_SIZE) {
      await this.evictOldestCacheEntries(dataSize);
    }
    
    this.offlineCache.set(key, {
      data,
      timestamp: Date.now(),
      size: dataSize
    });
    
    await this.saveOfflineData();
  }
  
  private getCacheSize(): number {
    let totalSize = 0;
    for (const cached of this.offlineCache.values()) {
      totalSize += cached.size;
    }
    return totalSize;
  }
  
  private async evictOldestCacheEntries(requiredSpace: number): Promise<void> {
    // Ordenar por timestamp (más antiguos primero)
    const sortedEntries = Array.from(this.offlineCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    let freedSpace = 0;
    for (const [key, cached] of sortedEntries) {
      if (freedSpace >= requiredSpace) {
        break;
      }
      
      this.offlineCache.delete(key);
      freedSpace += cached.size;
    }
    
    console.log(`🧹 Evicted cache entries, freed ${freedSpace} bytes`);
  }
  
  private async handleReconnection(): Promise<void> {
    console.log('🌐 Reconnected - processing offline queue');
    
    if (this.offlineQueue.length === 0) {
      return;
    }
    
    // Procesar operaciones en lotes
    const batches = this.chunkArray(this.offlineQueue, this.OFFLINE_CONFIG.BATCH_SIZE);
    
    for (const batch of batches) {
      await this.processBatch(batch);
    }
    
    // Limpiar operaciones completadas
    this.offlineQueue = this.offlineQueue.filter(op => op.status !== 'completed');
    await this.saveOfflineData();
  }
  
  private async processBatch(operations: OfflineOperation[]): Promise<void> {
    const promises = operations.map(operation => this.processOperation(operation));
    await Promise.allSettled(promises);
  }
  
  private async processOperation(operation: OfflineOperation): Promise<void> {
    try {
      operation.status = 'processing';
      
      // Procesar según el tipo de operación
      switch (operation.type) {
        case 'CREATE_APPLICATION':
          await this.processCreateApplication(operation);
          break;
        case 'UPDATE_APPLICATION':
          await this.processUpdateApplication(operation);
          break;
        case 'UPLOAD_DOCUMENT':
          await this.processUploadDocument(operation);
          break;
        case 'SYNC_DATA':
          await this.processSyncData(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
      
      operation.status = 'completed';
      console.log(`✅ Processed offline operation: ${operation.type}`);
      
    } catch (error) {
      operation.retryCount++;
      
      if (operation.retryCount >= this.OFFLINE_CONFIG.RETRY_ATTEMPTS) {
        operation.status = 'failed';
        operation.error = error.message;
        console.error(`❌ Failed offline operation: ${operation.type}`, error);
      } else {
        operation.status = 'pending';
        console.warn(`⚠️ Retrying offline operation: ${operation.type} (${operation.retryCount}/${this.OFFLINE_CONFIG.RETRY_ATTEMPTS})`);
      }
    }
  }
  
  private async processCreateApplication(operation: OfflineOperation): Promise<void> {
    const response = await httpClient.post('/applications', operation.data);
    if (!response.success) {
      throw new Error(response.message || 'Failed to create application');
    }
  }
  
  private async processUpdateApplication(operation: OfflineOperation): Promise<void> {
    const response = await httpClient.put(`/applications/${operation.data.id}`, operation.data);
    if (!response.success) {
      throw new Error(response.message || 'Failed to update application');
    }
  }
  
  private async processUploadDocument(operation: OfflineOperation): Promise<void> {
    const formData = new FormData();
    formData.append('file', operation.data.file);
    formData.append('applicationId', operation.data.applicationId);
    
    const response = await httpClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to upload document');
    }
  }
  
  private async processSyncData(operation: OfflineOperation): Promise<void> {
    const response = await httpClient.post('/sync', operation.data);
    if (!response.success) {
      throw new Error(response.message || 'Failed to sync data');
    }
  }
  
  private handleDisconnection(): void {
    console.log('📱 Disconnected - enabling offline mode');
    // Configurar optimizaciones para modo offline
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  // API pública
  isOfflineMode(): boolean {
    return this.isOffline;
  }
  
  getQueuedOperationsCount(): number {
    return this.offlineQueue.length;
  }
  
  getCacheStats(): OfflineCacheStats {
    return {
      totalItems: this.offlineCache.size,
      totalSize: this.getCacheSize(),
      maxSize: this.OFFLINE_CONFIG.MAX_CACHE_SIZE,
      utilizationPercentage: (this.getCacheSize() / this.OFFLINE_CONFIG.MAX_CACHE_SIZE) * 100
    };
  }
  
  async clearOfflineData(): Promise<void> {
    this.offlineQueue = [];
    this.offlineCache.clear();
    await this.saveOfflineData();
    console.log('🧹 Cleared all offline data');
  }
}

interface OfflineOperation {
  id: string;
  type: 'CREATE_APPLICATION' | 'UPDATE_APPLICATION' | 'UPLOAD_DOCUMENT' | 'SYNC_DATA';
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface CachedData {
  data: any;
  timestamp: number;
  size: number;
}

interface OfflineCacheStats {
  totalItems: number;
  totalSize: number;
  maxSize: number;
  utilizationPercentage: number;
}
```#
# Data Caching Strategies

### Multi-Level Cache System

```typescript
// Sistema de caché multinivel
export class MultiLevelCacheManager {
  private static instance: MultiLevelCacheManager;
  private memoryCache: Map<string, MemoryCacheEntry> = new Map();
  private diskCache: DiskCacheManager;
  private networkCache: NetworkCacheManager;
  
  private readonly CACHE_CONFIG = {
    MEMORY_CACHE: {
      maxSize: 10 * 1024 * 1024,    // 10MB
      maxEntries: 1000,
      ttl: 5 * 60 * 1000           // 5 minutos
    },
    DISK_CACHE: {
      maxSize: 100 * 1024 * 1024,   // 100MB
      ttl: 24 * 60 * 60 * 1000     // 24 horas
    },
    NETWORK_CACHE: {
      maxSize: 50 * 1024 * 1024,    // 50MB
      ttl: 60 * 60 * 1000          // 1 hora
    }
  };
  
  private constructor() {
    this.diskCache = new DiskCacheManager(this.CACHE_CONFIG.DISK_CACHE);
    this.networkCache = new NetworkCacheManager(this.CACHE_CONFIG.NETWORK_CACHE);
    this.startCacheCleanup();
  }
  
  static getInstance(): MultiLevelCacheManager {
    if (!this.instance) {
      this.instance = new MultiLevelCacheManager();
    }
    return this.instance;
  }
  
  async get<T>(key: string, fetcher?: () => Promise<T>): Promise<T | null> {
    // 1. Verificar caché de memoria (más rápido)
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult !== null) {
      console.log(`🧠 Memory cache hit: ${key}`);
      return memoryResult;
    }
    
    // 2. Verificar caché de disco
    const diskResult = await this.diskCache.get<T>(key);
    if (diskResult !== null) {
      console.log(`💾 Disk cache hit: ${key}`);
      // Promover a caché de memoria
      this.setInMemory(key, diskResult);
      return diskResult;
    }
    
    // 3. Verificar caché de red
    const networkResult = await this.networkCache.get<T>(key);
    if (networkResult !== null) {
      console.log(`🌐 Network cache hit: ${key}`);
      // Promover a cachés superiores
      this.setInMemory(key, networkResult);
      await this.diskCache.set(key, networkResult);
      return networkResult;
    }
    
    // 4. Si hay fetcher, obtener datos y cachear
    if (fetcher) {
      console.log(`🔄 Cache miss, fetching: ${key}`);
      try {
        const data = await fetcher();
        await this.setAll(key, data);
        return data;
      } catch (error) {
        console.error(`Failed to fetch data for ${key}:`, error);
        throw error;
      }
    }
    
    return null;
  }
  
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    await this.setAll(key, data, options);
  }
  
  private async setAll<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    // Cachear en todos los niveles
    this.setInMemory(key, data, options);
    await this.diskCache.set(key, data, options);
    await this.networkCache.set(key, data, options);
  }
  
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Verificar expiración
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    
    // Actualizar último acceso
    entry.lastAccessed = Date.now();
    return entry.data;
  }
  
  private setInMemory<T>(key: string, data: T, options?: CacheOptions): void {
    const ttl = options?.ttl || this.CACHE_CONFIG.MEMORY_CACHE.ttl;
    const size = this.estimateSize(data);
    
    // Verificar límites
    if (this.memoryCache.size >= this.CACHE_CONFIG.MEMORY_CACHE.maxEntries) {
      this.evictLRUMemoryEntry();
    }
    
    if (this.getMemoryCacheSize() + size > this.CACHE_CONFIG.MEMORY_CACHE.maxSize) {
      this.evictMemoryEntriesBySize(size);
    }
    
    this.memoryCache.set(key, {
      data,
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }
  
  private getMemoryCacheSize(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }
  
  private evictLRUMemoryEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }
  
  private evictMemoryEntriesBySize(requiredSize: number): void {
    // Ordenar por último acceso
    const sortedEntries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    let freedSize = 0;
    for (const [key, entry] of sortedEntries) {
      if (freedSize >= requiredSize) {
        break;
      }
      
      this.memoryCache.delete(key);
      freedSize += entry.size;
    }
  }
  
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Estimación aproximada
    } catch {
      return 1024; // Tamaño por defecto si no se puede serializar
    }
  }
  
  private startCacheCleanup(): void {
    // Limpiar caché de memoria cada 5 minutos
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 5 * 60 * 1000);
  }
  
  private cleanupMemoryCache(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired memory cache entries`);
    }
  }
  
  async invalidate(pattern?: string): Promise<void> {
    if (!pattern) {
      // Limpiar todos los cachés
      this.memoryCache.clear();
      await this.diskCache.clear();
      await this.networkCache.clear();
      return;
    }
    
    // Limpiar entradas que coincidan con el patrón
    const regex = new RegExp(pattern);
    
    // Limpiar caché de memoria
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Limpiar otros cachés
    await this.diskCache.invalidate(pattern);
    await this.networkCache.invalidate(pattern);
  }
  
  getCacheStats(): CacheStats {
    return {
      memory: {
        entries: this.memoryCache.size,
        size: this.getMemoryCacheSize(),
        maxSize: this.CACHE_CONFIG.MEMORY_CACHE.maxSize,
        hitRate: 0 // Se calcularía con métricas adicionales
      },
      disk: this.diskCache.getStats(),
      network: this.networkCache.getStats()
    };
  }
}

interface MemoryCacheEntry {
  data: any;
  size: number;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number;
  priority?: 'low' | 'normal' | 'high';
}

interface CacheStats {
  memory: {
    entries: number;
    size: number;
    maxSize: number;
    hitRate: number;
  };
  disk: any;
  network: any;
}
```

### Smart Cache Invalidation

```typescript
// Sistema inteligente de invalidación de caché
export class SmartCacheInvalidation {
  private static dependencies: Map<string, Set<string>> = new Map();
  private static invalidationRules: InvalidationRule[] = [];
  
  static addDependency(key: string, dependsOn: string[]): void {
    if (!this.dependencies.has(key)) {
      this.dependencies.set(key, new Set());
    }
    
    const deps = this.dependencies.get(key)!;
    dependsOn.forEach(dep => deps.add(dep));
  }
  
  static addInvalidationRule(rule: InvalidationRule): void {
    this.invalidationRules.push(rule);
  }
  
  static async invalidateWithDependencies(key: string): Promise<void> {
    const toInvalidate = new Set<string>([key]);
    
    // Encontrar todas las dependencias
    this.findDependentKeys(key, toInvalidate);
    
    // Aplicar reglas de invalidación
    for (const rule of this.invalidationRules) {
      if (rule.condition(key)) {
        rule.keysToInvalidate.forEach(k => toInvalidate.add(k));
      }
    }
    
    // Invalidar todas las claves
    const cacheManager = MultiLevelCacheManager.getInstance();
    for (const keyToInvalidate of toInvalidate) {
      await cacheManager.invalidate(keyToInvalidate);
    }
    
    console.log(`🗑️ Invalidated ${toInvalidate.size} cache entries for ${key}`);
  }
  
  private static findDependentKeys(key: string, result: Set<string>): void {
    for (const [dependentKey, dependencies] of this.dependencies.entries()) {
      if (dependencies.has(key) && !result.has(dependentKey)) {
        result.add(dependentKey);
        // Recursivamente encontrar dependencias de dependencias
        this.findDependentKeys(dependentKey, result);
      }
    }
  }
  
  static setupApplicationCacheDependencies(): void {
    // Configurar dependencias específicas de la aplicación
    
    // Las aplicaciones dependen del usuario
    this.addDependency('applications:*', ['user:profile']);
    
    // Los documentos dependen de las aplicaciones
    this.addDependency('documents:*', ['applications:*']);
    
    // Las estadísticas dependen de las aplicaciones
    this.addDependency('stats:*', ['applications:*', 'documents:*']);
    
    // Reglas de invalidación
    this.addInvalidationRule({
      condition: (key) => key.startsWith('user:'),
      keysToInvalidate: ['applications:*', 'stats:*']
    });
    
    this.addInvalidationRule({
      condition: (key) => key.startsWith('applications:'),
      keysToInvalidate: ['stats:*', 'dashboard:*']
    });
  }
}

interface InvalidationRule {
  condition: (key: string) => boolean;
  keysToInvalidate: string[];
}
```

## Sync Optimization

### Intelligent Sync Manager

```typescript
// Gestor inteligente de sincronización
export class IntelligentSyncManager {
  private static instance: IntelligentSyncManager;
  private syncQueue: SyncOperation[] = [];
  private syncInProgress: boolean = false;
  private syncMetrics: SyncMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageLatency: 0,
    lastSyncTime: 0
  };
  
  private readonly SYNC_CONFIG = {
    BATCH_SIZE: 10,
    MAX_CONCURRENT_SYNCS: 3,
    RETRY_DELAYS: [1000, 5000, 15000], // 1s, 5s, 15s
    PRIORITY_WEIGHTS: {
      HIGH: 3,
      NORMAL: 2,
      LOW: 1
    },
    ADAPTIVE_BATCHING: true,
    NETWORK_AWARE: true
  };
  
  private constructor() {
    this.initializeSyncManager();
  }
  
  static getInstance(): IntelligentSyncManager {
    if (!this.instance) {
      this.instance = new IntelligentSyncManager();
    }
    return this.instance;
  }
  
  private initializeSyncManager(): void {
    // Configurar monitoreo de red
    NetInfo.addEventListener(state => {
      if (state.isConnected && this.syncQueue.length > 0) {
        this.startIntelligentSync();
      }
    });
    
    // Configurar sincronización periódica
    this.setupPeriodicSync();
  }
  
  private setupPeriodicSync(): void {
    // Sincronización cada 5 minutos si hay operaciones pendientes
    setInterval(async () => {
      if (this.syncQueue.length > 0) {
        await this.startIntelligentSync();
      }
    }, 5 * 60 * 1000);
  }
  
  async queueOperation(operation: SyncOperationRequest): Promise<void> {
    const syncOp: SyncOperation = {
      id: this.generateOperationId(),
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      estimatedSize: this.estimateOperationSize(operation.data)
    };
    
    // Insertar en la posición correcta según prioridad
    this.insertByPriority(syncOp);
    
    // Persistir cola
    await this.persistSyncQueue();
    
    // Intentar sincronización inmediata si hay conexión
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && !this.syncInProgress) {
      this.startIntelligentSync();
    }
  }
  
  private insertByPriority(operation: SyncOperation): void {
    const weight = this.SYNC_CONFIG.PRIORITY_WEIGHTS[operation.priority];
    let insertIndex = this.syncQueue.length;
    
    // Encontrar posición correcta basada en prioridad y timestamp
    for (let i = 0; i < this.syncQueue.length; i++) {
      const existingWeight = this.SYNC_CONFIG.PRIORITY_WEIGHTS[this.syncQueue[i].priority];
      
      if (weight > existingWeight || 
          (weight === existingWeight && operation.timestamp < this.syncQueue[i].timestamp)) {
        insertIndex = i;
        break;
      }
    }
    
    this.syncQueue.splice(insertIndex, 0, operation);
  }
  
  private async startIntelligentSync(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }
    
    this.syncInProgress = true;
    console.log(`🔄 Starting intelligent sync with ${this.syncQueue.length} operations`);
    
    try {
      // Determinar estrategia de sincronización
      const strategy = await this.determineSyncStrategy();
      
      // Ejecutar sincronización según estrategia
      await this.executeSyncStrategy(strategy);
      
      // Actualizar métricas
      this.updateSyncMetrics();
      
    } catch (error) {
      console.error('Intelligent sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }
  
  private async determineSyncStrategy(): Promise<SyncStrategy> {
    const netInfo = await NetInfo.fetch();
    const batteryLevel = await DeviceInfo.getBatteryLevel();\n    const pendingOperations = this.syncQueue.filter(op => op.status === 'pending');\n    \n    // Estrategia basada en condiciones de red y batería\n    if (netInfo.type === 'wifi' && batteryLevel > 0.5) {\n      return {\n        type: 'AGGRESSIVE',\n        batchSize: this.SYNC_CONFIG.BATCH_SIZE * 2,\n        concurrency: this.SYNC_CONFIG.MAX_CONCURRENT_SYNCS,\n        retryImmediately: true\n      };\n    } else if (netInfo.type === 'cellular' && batteryLevel > 0.2) {\n      return {\n        type: 'CONSERVATIVE',\n        batchSize: Math.ceil(this.SYNC_CONFIG.BATCH_SIZE / 2),\n        concurrency: 1,\n        retryImmediately: false\n      };\n    } else {\n      return {\n        type: 'MINIMAL',\n        batchSize: 1,\n        concurrency: 1,\n        retryImmediately: false,\n        priorityOnly: true\n      };\n    }\n  }\n  \n  private async executeSyncStrategy(strategy: SyncStrategy): Promise<void> {\n    let operationsToSync = this.syncQueue.filter(op => op.status === 'pending');\n    \n    // Filtrar solo operaciones de alta prioridad si es necesario\n    if (strategy.priorityOnly) {\n      operationsToSync = operationsToSync.filter(op => op.priority === 'HIGH');\n    }\n    \n    // Crear lotes\n    const batches = this.createOptimalBatches(operationsToSync, strategy);\n    \n    // Procesar lotes\n    for (const batch of batches) {\n      await this.processBatch(batch, strategy);\n    }\n  }\n  \n  private createOptimalBatches(operations: SyncOperation[], strategy: SyncStrategy): SyncOperation[][] {\n    if (!this.SYNC_CONFIG.ADAPTIVE_BATCHING) {\n      return this.chunkArray(operations, strategy.batchSize);\n    }\n    \n    // Batching adaptativo basado en tamaño estimado\n    const batches: SyncOperation[][] = [];\n    let currentBatch: SyncOperation[] = [];\n    let currentBatchSize = 0;\n    const maxBatchSize = 1024 * 1024; // 1MB por lote\n    \n    for (const operation of operations) {\n      if (currentBatch.length >= strategy.batchSize || \n          currentBatchSize + operation.estimatedSize > maxBatchSize) {\n        if (currentBatch.length > 0) {\n          batches.push(currentBatch);\n          currentBatch = [];\n          currentBatchSize = 0;\n        }\n      }\n      \n      currentBatch.push(operation);\n      currentBatchSize += operation.estimatedSize;\n    }\n    \n    if (currentBatch.length > 0) {\n      batches.push(currentBatch);\n    }\n    \n    return batches;\n  }\n  \n  private async processBatch(batch: SyncOperation[], strategy: SyncStrategy): Promise<void> {\n    const startTime = Date.now();\n    \n    // Procesar operaciones en paralelo según la estrategia\n    if (strategy.concurrency > 1) {\n      const chunks = this.chunkArray(batch, strategy.concurrency);\n      \n      for (const chunk of chunks) {\n        const promises = chunk.map(op => this.processSingleOperation(op, strategy));\n        await Promise.allSettled(promises);\n      }\n    } else {\n      // Procesamiento secuencial\n      for (const operation of batch) {\n        await this.processSingleOperation(operation, strategy);\n      }\n    }\n    \n    const processingTime = Date.now() - startTime;\n    console.log(`✅ Processed batch of ${batch.length} operations in ${processingTime}ms`);\n  }\n  \n  private async processSingleOperation(operation: SyncOperation, strategy: SyncStrategy): Promise<void> {\n    const startTime = Date.now();\n    \n    try {\n      operation.status = 'syncing';\n      \n      // Ejecutar operación según su tipo\n      const result = await this.executeOperation(operation);\n      \n      if (result.success) {\n        operation.status = 'completed';\n        operation.completedAt = Date.now();\n        operation.result = result.data;\n      } else {\n        throw new Error(result.error || 'Operation failed');\n      }\n      \n    } catch (error) {\n      operation.retryCount++;\n      operation.lastError = error.message;\n      \n      if (operation.retryCount >= this.SYNC_CONFIG.RETRY_DELAYS.length) {\n        operation.status = 'failed';\n        console.error(`❌ Operation ${operation.id} failed permanently:`, error);\n      } else {\n        operation.status = 'pending';\n        \n        if (strategy.retryImmediately) {\n          // Programar reintento inmediato\n          setTimeout(() => {\n            this.processSingleOperation(operation, strategy);\n          }, this.SYNC_CONFIG.RETRY_DELAYS[operation.retryCount - 1]);\n        }\n        \n        console.warn(`⚠️ Operation ${operation.id} will retry (${operation.retryCount}/${this.SYNC_CONFIG.RETRY_DELAYS.length})`);\n      }\n    }\n    \n    const processingTime = Date.now() - startTime;\n    operation.processingTime = processingTime;\n  }\n  \n  private async executeOperation(operation: SyncOperation): Promise<OperationResult> {\n    switch (operation.type) {\n      case 'CREATE':\n        return await this.executeCreateOperation(operation);\n      case 'UPDATE':\n        return await this.executeUpdateOperation(operation);\n      case 'DELETE':\n        return await this.executeDeleteOperation(operation);\n      case 'UPLOAD':\n        return await this.executeUploadOperation(operation);\n      default:\n        throw new Error(`Unknown operation type: ${operation.type}`);\n    }\n  }\n  \n  private async executeCreateOperation(operation: SyncOperation): Promise<OperationResult> {\n    const response = await httpClient.post(\n      this.getEndpointForEntity(operation.entity, 'CREATE'),\n      operation.data\n    );\n    \n    return {\n      success: response.success,\n      data: response.data,\n      error: response.message\n    };\n  }\n  \n  private async executeUpdateOperation(operation: SyncOperation): Promise<OperationResult> {\n    const response = await httpClient.put(\n      this.getEndpointForEntity(operation.entity, 'UPDATE', operation.data.id),\n      operation.data\n    );\n    \n    return {\n      success: response.success,\n      data: response.data,\n      error: response.message\n    };\n  }\n  \n  private async executeDeleteOperation(operation: SyncOperation): Promise<OperationResult> {\n    const response = await httpClient.delete(\n      this.getEndpointForEntity(operation.entity, 'DELETE', operation.data.id)\n    );\n    \n    return {\n      success: response.success,\n      data: response.data,\n      error: response.message\n    };\n  }\n  \n  private async executeUploadOperation(operation: SyncOperation): Promise<OperationResult> {\n    const formData = new FormData();\n    \n    // Agregar archivos y datos al FormData\n    Object.entries(operation.data).forEach(([key, value]) => {\n      formData.append(key, value as any);\n    });\n    \n    const response = await httpClient.post(\n      this.getEndpointForEntity(operation.entity, 'UPLOAD'),\n      formData,\n      {\n        headers: { 'Content-Type': 'multipart/form-data' },\n        timeout: 60000 // 60 segundos para uploads\n      }\n    );\n    \n    return {\n      success: response.success,\n      data: response.data,\n      error: response.message\n    };\n  }\n  \n  private getEndpointForEntity(entity: string, operation: string, id?: string): string {\n    const baseUrl = '/api';\n    \n    switch (entity) {\n      case 'APPLICATION':\n        if (operation === 'CREATE') return `${baseUrl}/applications`;\n        if (operation === 'UPDATE') return `${baseUrl}/applications/${id}`;\n        if (operation === 'DELETE') return `${baseUrl}/applications/${id}`;\n        break;\n      case 'DOCUMENT':\n        if (operation === 'UPLOAD') return `${baseUrl}/documents/upload`;\n        if (operation === 'DELETE') return `${baseUrl}/documents/${id}`;\n        break;\n      default:\n        throw new Error(`Unknown entity: ${entity}`);\n    }\n    \n    throw new Error(`Unknown operation: ${operation} for entity: ${entity}`);\n  }\n  \n  private estimateOperationSize(data: any): number {\n    try {\n      return JSON.stringify(data).length;\n    } catch {\n      return 1024; // Tamaño por defecto\n    }\n  }\n  \n  private generateOperationId(): string {\n    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;\n  }\n  \n  private chunkArray<T>(array: T[], size: number): T[][] {\n    const chunks: T[][] = [];\n    for (let i = 0; i < array.length; i += size) {\n      chunks.push(array.slice(i, i + size));\n    }\n    return chunks;\n  }\n  \n  private updateSyncMetrics(): void {\n    const completedOps = this.syncQueue.filter(op => op.status === 'completed');\n    const failedOps = this.syncQueue.filter(op => op.status === 'failed');\n    \n    this.syncMetrics.totalOperations = this.syncQueue.length;\n    this.syncMetrics.successfulOperations = completedOps.length;\n    this.syncMetrics.failedOperations = failedOps.length;\n    this.syncMetrics.lastSyncTime = Date.now();\n    \n    if (completedOps.length > 0) {\n      const totalTime = completedOps.reduce((sum, op) => sum + (op.processingTime || 0), 0);\n      this.syncMetrics.averageLatency = totalTime / completedOps.length;\n    }\n  }\n  \n  private async persistSyncQueue(): Promise<void> {\n    try {\n      await AsyncStorage.setItem('@sync_queue', JSON.stringify(this.syncQueue));\n    } catch (error) {\n      console.error('Failed to persist sync queue:', error);\n    }\n  }\n  \n  // API pública\n  getSyncMetrics(): SyncMetrics {\n    return { ...this.syncMetrics };\n  }\n  \n  getPendingOperationsCount(): number {\n    return this.syncQueue.filter(op => op.status === 'pending').length;\n  }\n  \n  async forceSyncNow(): Promise<void> {\n    if (!this.syncInProgress) {\n      await this.startIntelligentSync();\n    }\n  }\n  \n  async clearFailedOperations(): Promise<void> {\n    this.syncQueue = this.syncQueue.filter(op => op.status !== 'failed');\n    await this.persistSyncQueue();\n  }\n}\n\n// Interfaces para sincronización inteligente\ninterface SyncOperation {\n  id: string;\n  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD';\n  entity: string;\n  data: any;\n  priority: 'HIGH' | 'NORMAL' | 'LOW';\n  timestamp: number;\n  retryCount: number;\n  status: 'pending' | 'syncing' | 'completed' | 'failed';\n  estimatedSize: number;\n  processingTime?: number;\n  completedAt?: number;\n  lastError?: string;\n  result?: any;\n}\n\ninterface SyncOperationRequest {\n  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD';\n  entity: string;\n  data: any;\n  priority: 'HIGH' | 'NORMAL' | 'LOW';\n}\n\ninterface SyncStrategy {\n  type: 'AGGRESSIVE' | 'CONSERVATIVE' | 'MINIMAL';\n  batchSize: number;\n  concurrency: number;\n  retryImmediately: boolean;\n  priorityOnly?: boolean;\n}\n\ninterface OperationResult {\n  success: boolean;\n  data?: any;\n  error?: string;\n}\n\ninterface SyncMetrics {\n  totalOperations: number;\n  successfulOperations: number;\n  failedOperations: number;\n  averageLatency: number;\n  lastSyncTime: number;\n}\n```

---

**Última Actualización**: Enero 2025  
**Versión**: 1.0  
**Mantenido por**: Equipo de Desarrollo CrediBowpi