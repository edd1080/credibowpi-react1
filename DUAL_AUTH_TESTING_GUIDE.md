# 🧪 Guía de Testing del Sistema de Autenticación Dual

## 📖 **Introducción**

Esta guía proporciona información completa sobre el sistema de testing implementado para el sistema de autenticación dual de CrediBowpi Mobile. Los tests cubren desde pruebas unitarias hasta integración completa del sistema.

## 🎯 **Objetivos de Testing**

- **✅ Validar funcionalidad**: Asegurar que todas las características funcionen correctamente
- **🔄 Verificar switching**: Confirmar que el cambio entre proveedores funciona sin problemas
- **🛡️ Garantizar seguridad**: Validar medidas de seguridad y manejo de datos
- **⚡ Medir performance**: Asegurar que el sistema cumple con los objetivos de rendimiento
- **🔧 Facilitar desarrollo**: Proporcionar herramientas para desarrollo y debugging

## 🏗️ **Arquitectura de Testing**

### **Estructura de Tests**

```
src/
├── services/auth/__tests__/
│   ├── AuthConfiguration.test.ts          # Tests de configuración
│   └── AuthProviderFactory.test.ts        # Tests del factory
├── services/auth/providers/__tests__/
│   └── LegacyAuthProvider.test.ts         # Tests del proveedor Legacy
├── services/__tests__/
│   └── AuthStoreManager.dual.test.ts      # Tests del store manager
├── __tests__/
│   ├── integration/
│   │   └── DualAuthSystem.test.ts         # Tests de integración
│   ├── dual-auth/
│   │   └── DualAuthTestSuite.test.ts      # Suite completa
│   ├── setup/
│   │   └── dual-auth-setup.js             # Configuración global
│   └── utils/
│       └── dual-auth-results-processor.js # Procesador de resultados
├── scripts/
│   └── test-dual-auth.sh                  # Script de ejecución
└── jest.dual-auth.config.js               # Configuración Jest
```

### **Tipos de Tests**

1. **🔧 Unit Tests**: Tests individuales de cada componente
2. **🔗 Integration Tests**: Tests de integración entre componentes
3. **🎭 End-to-End Tests**: Tests completos del flujo de usuario
4. **⚡ Performance Tests**: Tests de rendimiento y benchmarks
5. **🔒 Security Tests**: Validación de medidas de seguridad

## 📋 **Tests Implementados**

### **1. AuthConfiguration Tests**
**Archivo**: `src/services/auth/__tests__/AuthConfiguration.test.ts`

**Cobertura**:
- ✅ Inicialización con configuración por defecto
- ✅ Carga desde variables de entorno
- ✅ Persistencia en AsyncStorage
- ✅ Prioridad de configuraciones
- ✅ Validación de configuraciones
- ✅ Manejo de errores
- ✅ Listeners de cambios
- ✅ Reset y debug

**Escenarios Clave**:
```typescript
// Inicialización con defaults
it('should initialize with default configuration', async () => {
  await configService.initialize();
  const config = configService.getConfiguration();
  expect(config.currentType).toBe(DEFAULT_AUTH_CONFIG.currentType);
});

// Prioridad de environment variables
it('should prioritize environment variables over stored config', async () => {
  mockEnv.AUTH_TYPE = 'bowpi';
  await configService.initialize();
  expect(config.currentType).toBe(AuthType.BOWPI);
});
```

### **2. LegacyAuthProvider Tests**
**Archivo**: `src/services/auth/providers/__tests__/LegacyAuthProvider.test.ts`

**Cobertura**:
- ✅ Propiedades del proveedor
- ✅ Inicialización y configuración
- ✅ Flujo de autenticación completo
- ✅ Gestión de sesiones
- ✅ Health checks
- ✅ Métricas y analytics
- ✅ Manejo de errores
- ✅ Cleanup de recursos

**Escenarios Clave**:
```typescript
// Login exitoso
it('should login with valid credentials', async () => {
  const result = await provider.login('test@example.com', 'password123');
  expect(result.success).toBe(true);
  expect(result.userData?.email).toBe('test@example.com');
});

// Simulación de errores de red
it('should simulate network errors when configured', async () => {
  const configWithErrors = { ...mockConfig, simulateNetworkErrors: true };
  const providerWithErrors = new LegacyAuthProvider(configWithErrors);
  // Test error simulation
});
```

### **3. AuthProviderFactory Tests**
**Archivo**: `src/services/auth/__tests__/AuthProviderFactory.test.ts`

**Cobertura**:
- ✅ Patrón Singleton
- ✅ Creación de proveedores
- ✅ Caché de proveedores
- ✅ Switching entre proveedores
- ✅ Health checks
- ✅ Gestión de recursos
- ✅ Debug information
- ✅ Manejo de errores

**Escenarios Clave**:
```typescript
// Creación de proveedor Legacy
it('should create legacy provider', async () => {
  const provider = await factory.createProvider(AuthType.LEGACY);
  expect(provider.type).toBe(AuthType.LEGACY);
  expect(mockLegacyProvider.initialize).toHaveBeenCalled();
});

// Switching exitoso
it('should switch providers successfully', async () => {
  const legacyProvider = await factory.createProvider(AuthType.LEGACY);
  const bowpiProvider = await factory.switchProvider(AuthType.BOWPI);
  expect(bowpiProvider.type).toBe(AuthType.BOWPI);
});
```

### **4. AuthStoreManager Dual Tests**
**Archivo**: `src/services/__tests__/AuthStoreManager.dual.test.ts`

**Cobertura**:
- ✅ Switching de proveedores
- ✅ Validación de switching
- ✅ Auto-switch en fallos
- ✅ Información del proveedor actual
- ✅ Métricas de proveedores
- ✅ Debug information
- ✅ Login mejorado con contexto
- ✅ Manejo de cambios de configuración

**Escenarios Clave**:
```typescript
// Switch exitoso
it('should switch authentication provider successfully', async () => {
  const result = await authStoreManager.switchAuthProvider(AuthType.BOWPI);
  expect(result.success).toBe(true);
  expect(result.newType).toBe(AuthType.BOWPI);
});

// Auto-switch en fallo
it('should auto-switch on authentication failure', async () => {
  // Mock Bowpi failure, expect switch to Legacy
  const result = await authStoreManager.login('test@example.com', 'password123');
  expect(result.provider).toBe(AuthType.LEGACY);
});
```

### **5. Integration Tests**
**Archivo**: `src/__tests__/integration/DualAuthSystem.test.ts`

**Cobertura**:
- ✅ Flujo completo de autenticación
- ✅ Switching de proveedores integrado
- ✅ Auto-switch en fallos
- ✅ Persistencia de configuración
- ✅ Health checks y monitoreo
- ✅ Manejo de errores y recuperación
- ✅ Debug y soporte de desarrollo
- ✅ Cleanup y gestión de recursos

**Escenarios Clave**:
```typescript
// Flujo completo con Legacy
it('should perform complete login flow with Legacy provider', async () => {
  await authConfigService.setAuthType(AuthType.LEGACY);
  const loginResult = await authStoreManager.login('test@example.com', 'password123');
  expect(loginResult.success).toBe(true);
  
  const isAuthenticated = await authStoreManager.isAuthenticated();
  expect(isAuthenticated).toBe(true);
});

// Switch integrado
it('should switch from Legacy to Bowpi provider', async () => {
  // Complete integration test for provider switching
});
```

### **6. Test Suite**
**Archivo**: `src/__tests__/dual-auth/DualAuthTestSuite.test.ts`

**Cobertura**:
- ✅ Validación de cobertura de tests
- ✅ Escenarios críticos cubiertos
- ✅ Utilidades de desarrollo
- ✅ Benchmarks de performance
- ✅ Validación de seguridad
- ✅ Readiness para deployment

## 🚀 **Comandos de Testing**

### **Scripts Individuales**

```bash
# Test de configuración
npm run test:auth-config

# Test de proveedor Legacy
npm run test:legacy-provider

# Test de factory
npm run test:provider-factory

# Test de store manager dual
npm run test:auth-manager-dual

# Test de integración
npm run test:dual-integration

# Suite completa
npm run test:dual-suite
```

### **Scripts Combinados**

```bash
# Todos los tests del sistema dual con coverage
npm run test:dual-auth

# Script completo con reporte
./scripts/test-dual-auth.sh
```

### **Configuración Específica**

```bash
# Usar configuración Jest específica
jest --config=jest.dual-auth.config.js

# Tests con coverage detallado
jest --config=jest.dual-auth.config.js --coverage --verbose
```

## 📊 **Coverage y Métricas**

### **Objetivos de Coverage**

- **Global**: 85% líneas, 80% branches
- **Servicios Auth**: 90% líneas, 85% branches
- **Componentes críticos**: 95% líneas, 90% branches

### **Métricas de Performance**

- **Provider Switch**: < 500ms
- **Authentication**: < 2000ms
- **Configuration Load**: < 100ms
- **Health Check**: < 200ms
- **Cleanup**: < 300ms

### **Reportes Generados**

```
test-reports/dual-auth/
├── summary-TIMESTAMP.json          # Resumen ejecutivo
├── detailed-TIMESTAMP.json         # Reporte detallado
├── coverage-TIMESTAMP.log          # Log de coverage
├── latest-summary.json             # Último resumen (CI/CD)
└── latest-detailed.json            # Último detallado (CI/CD)
```

## 🛠️ **Utilidades de Testing**

### **DualAuthTestUtils**

```typescript
import { DualAuthTestUtils } from '../__tests__/dual-auth/DualAuthTestSuite.test';

// Crear configuración mock
const mockConfig = DualAuthTestUtils.createMockConfig({
  currentType: AuthType.LEGACY
});

// Crear usuario mock
const mockUser = DualAuthTestUtils.createMockUser({
  email: 'custom@example.com'
});

// Esperar operaciones async
await DualAuthTestUtils.waitFor(1000);

// Reset del entorno
DualAuthTestUtils.resetTestEnvironment();
```

### **Setup Global**

```javascript
// Disponible en todos los tests
global.DualAuthTestHelpers.createMockConfig();
global.DualAuthTestHelpers.createMockUser();
global.DualAuthTestHelpers.resetSingletons();
```

## 🔧 **Debugging Tests**

### **Logs de Debug**

```bash
# Habilitar logs detallados
DEBUG=true npm run test:dual-auth

# Logs específicos de componente
DEBUG_AUTH_CONFIG=true npm run test:auth-config
```

### **Debugging Individual**

```typescript
// En tests individuales
describe('Debug Test', () => {
  it('should debug provider creation', async () => {
    const debugInfo = factory.getDebugInfo();
    console.log('Factory Debug:', debugInfo);
    
    const provider = await factory.createProvider(AuthType.LEGACY);
    const health = await provider.healthCheck();
    console.log('Provider Health:', health);
  });
});
```

## 🔒 **Validación de Seguridad**

### **Checks Implementados**

- ✅ **Secure Storage**: Validación de almacenamiento seguro
- ✅ **Session Encryption**: Verificación de encriptación de sesiones
- ✅ **Input Validation**: Tests de validación de entrada
- ✅ **Injection Prevention**: Prevención de inyecciones
- ✅ **Session Timeout**: Manejo de timeouts de sesión
- ✅ **Secure Switching**: Switching seguro entre proveedores
- ✅ **Audit Logging**: Logging de auditoría
- ✅ **Secure Cleanup**: Limpieza segura de recursos

### **Tests de Seguridad**

```typescript
// Validación de input
it('should validate input data', async () => {
  const result = await provider.login('invalid-email', 'short');
  expect(result.success).toBe(false);
});

// Manejo seguro de errores
it('should handle errors securely', async () => {
  // No debe exponer información sensible en errores
});
```

## 📈 **CI/CD Integration**

### **GitHub Actions**

```yaml
# .github/workflows/dual-auth-tests.yml
name: Dual Auth Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run dual auth tests
        run: ./scripts/test-dual-auth.sh
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

### **Pre-commit Hooks**

```bash
# .husky/pre-commit
#!/bin/sh
npm run test:dual-auth
npm run lint
npm run type-check
```

## 🎯 **Best Practices**

### **Escribiendo Tests**

1. **📝 Descriptive Names**: Nombres descriptivos para tests
2. **🏗️ AAA Pattern**: Arrange, Act, Assert
3. **🔄 Independent Tests**: Tests independientes entre sí
4. **🧹 Cleanup**: Limpieza después de cada test
5. **📊 Coverage**: Apuntar a alta cobertura
6. **⚡ Performance**: Tests rápidos y eficientes

### **Mantenimiento**

1. **🔄 Regular Updates**: Actualizar tests con cambios de código
2. **📈 Monitor Coverage**: Monitorear cobertura continuamente
3. **🐛 Fix Flaky Tests**: Arreglar tests inestables inmediatamente
4. **📝 Document Changes**: Documentar cambios en tests
5. **🧪 Review Tests**: Revisar tests en code reviews

## 🚀 **Deployment Readiness**

### **Checklist Pre-Deployment**

- ✅ **All Tests Passing**: Todos los tests pasan
- ✅ **Coverage Targets**: Objetivos de coverage cumplidos
- ✅ **Performance Benchmarks**: Benchmarks de performance cumplidos
- ✅ **Security Validation**: Validación de seguridad completa
- ✅ **Integration Tests**: Tests de integración exitosos
- ✅ **Error Handling**: Manejo de errores validado
- ✅ **Documentation**: Documentación actualizada

### **Comando de Validación**

```bash
# Validación completa pre-deployment
./scripts/test-dual-auth.sh

# Si todos los tests pasan:
# 🎉 DUAL AUTHENTICATION SYSTEM: ALL TESTS PASSED
# ✅ READY FOR DEPLOYMENT
```

## 📞 **Soporte y Troubleshooting**

### **Problemas Comunes**

1. **Tests Failing**: Revisar logs en `test-reports/dual-auth/`
2. **Coverage Low**: Agregar tests para código no cubierto
3. **Performance Issues**: Optimizar tests lentos
4. **Flaky Tests**: Identificar y arreglar tests inestables

### **Contacto**

- **📧 Email**: Equipo de desarrollo
- **📝 Issues**: GitHub Issues
- **📖 Docs**: Esta documentación
- **🔍 Debug**: Usar herramientas de debug incluidas

---

**¡El sistema de testing está completo y listo para garantizar la calidad del sistema de autenticación dual!** 🎉