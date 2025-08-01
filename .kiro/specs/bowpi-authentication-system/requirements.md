# Bowpi Authentication System - Requirements

## Introduction

Este documento define los requisitos para implementar el sistema de autenticación Bowpi en la aplicación móvil CrediBowpi, reemplazando el sistema de autenticación simulado actual con un sistema real que consume microservicios Bowpi siguiendo estándares OWASP y manteniendo la funcionalidad offline-first.

## Requirements

### Requirement 1: Secure HTTP Client

**User Story:** Como desarrollador, quiero un cliente HTTP seguro que consuma microservicios desde dominios permitidos, para garantizar comunicaciones seguras siguiendo estándares OWASP.

#### Acceptance Criteria

1. WHEN la aplicación está en desarrollo THEN el cliente HTTP SHALL permitir requests HTTP
2. WHEN la aplicación está en producción THEN el cliente HTTP SHALL rechazar requests HTTP y solo permitir HTTPS
3. WHEN se realiza una petición a microservicios THEN el sistema SHALL validar que el dominio esté en la lista de dominios permitidos
4. WHEN se consume cualquier microservicio que no sea de autenticación THEN el sistema SHALL NOT almacenar caché de la respuesta
5. WHEN se realiza una petición THEN el sistema SHALL seguir las reglas OWASP mobile excepto las reglas de caché

### Requirement 2: Authentication Service Integration

**User Story:** Como usuario, quiero autenticarme usando mis credenciales corporativas, para acceder a la aplicación con mi cuenta oficial.

#### Acceptance Criteria

1. WHEN el usuario ingresa credenciales THEN el sistema SHALL enviar POST request a `http://10.14.11.200:7161/bowpi/micro-auth-service/auth/login`
2. WHEN se envía el request de login THEN el payload SHALL contener `{"username": USER_EMAIL, "password": USER_PWD, "application": "MOBILE", "isCheckVersion": false}`
3. WHEN se recibe respuesta del servidor THEN el sistema SHALL parsear la respuesta usando la interfaz `ResponseWs<T>`
4. WHEN la respuesta es exitosa THEN el sistema SHALL extraer el JWT token del campo `data`
5. WHEN se obtiene el JWT THEN el sistema SHALL desencriptar los claims usando el servicio de criptografía

### Requirement 3: JWT Token Processing

**User Story:** Como sistema, quiero procesar correctamente los tokens JWT encriptados, para extraer la información del usuario y mantener la sesión.

#### Acceptance Criteria

1. WHEN se recibe un JWT encriptado THEN el sistema SHALL extraer el campo `data` del token
2. WHEN se extrae la data THEN el sistema SHALL desencriptar usando los servicios crypto proporcionados
3. WHEN se desencripta la data THEN el sistema SHALL parsear el JSON resultante usando la interfaz `AuthTokenData`
4. WHEN se obtiene el `requestId` THEN el sistema SHALL almacenarlo como identificador principal de sesión
5. WHEN se procesa el token THEN el sistema SHALL guardar toda la información del perfil de usuario globalmente

### Requirement 4: Request Headers Management

**User Story:** Como sistema, quiero generar automáticamente los headers obligatorios para todas las peticiones, para cumplir con los requisitos de seguridad del servidor Bowpi.

#### Acceptance Criteria

1. WHEN se realiza cualquier petición THEN el sistema SHALL incluir headers base: `Authorization: 'Basic Ym93cGk6Qm93cGkyMDE3'`, `Cache-Control: 'no-cache'`, `Pragma: 'no-cache'`
2. WHEN se realiza cualquier petición THEN el sistema SHALL generar dinámicamente el header `OTPToken`
3. WHEN el método es PUT/POST/PATCH THEN el sistema SHALL generar y agregar headers `X-Date` y `X-Digest`
4. WHEN existe una sesión activa AND el endpoint no es `/login` THEN el sistema SHALL agregar header `bowpi-auth-token`
5. WHEN se generan headers THEN el sistema SHALL usar los servicios `BowpiOTPService` y `BowpiHMACService` sin modificaciones

### Requirement 5: Offline-First Authentication Logic

**User Story:** Como usuario, quiero que la aplicación maneje correctamente los escenarios offline, para poder usar la aplicación sin conexión cuando sea posible.

#### Acceptance Criteria

1. WHEN el usuario intenta hacer login sin internet THEN el sistema SHALL mostrar mensaje indicando que se requiere conexión a internet
2. WHEN el usuario intenta hacer login con internet THEN el sistema SHALL proceder con el flujo normal de autenticación
3. WHEN el login es exitoso THEN el sistema SHALL guardar el token localmente y permitir navegación a la aplicación
4. WHEN la aplicación inicia AND existe token válido THEN el sistema SHALL saltar la pantalla de login y navegar a tabs
5. WHEN el usuario intenta logout sin internet THEN el sistema SHALL advertir que no podrá volver a hacer login sin conexión

### Requirement 6: Session Management

**User Story:** Como sistema, quiero manejar correctamente las sesiones de usuario, para mantener la seguridad y permitir operación offline.

#### Acceptance Criteria

1. WHEN se autentica exitosamente THEN el token SHALL NOT expirar a menos que el usuario haga logout explícito
2. WHEN se almacena la sesión THEN el sistema SHALL usar `requestId` como identificador principal de usuario
3. WHEN se cierra sesión THEN el sistema SHALL llamar endpoint de invalidación `/management/session/invalidate/request/{requestId}`
4. WHEN se invalida sesión THEN el sistema SHALL NOT esperar respuesta del servidor (fire-and-forget)
5. WHEN hay error de autenticación (401/403) THEN el sistema SHALL hacer logout automático solo si hay conexión

### Requirement 7: Logout Functionality

**User Story:** Como usuario, quiero poder cerrar sesión de forma segura, para proteger mi cuenta cuando termine de usar la aplicación.

#### Acceptance Criteria

1. WHEN el usuario hace logout con internet THEN el sistema SHALL invalidar la sesión en el servidor
2. WHEN el usuario hace logout sin internet THEN el sistema SHALL mostrar advertencia antes de proceder
3. WHEN el usuario confirma logout offline THEN el sistema SHALL limpiar datos locales y redirigir a login
4. WHEN se realiza logout THEN el sistema SHALL limpiar todos los datos de sesión del almacenamiento local
5. WHEN se invalida sesión THEN el endpoint SHALL requerir autenticación con header `bowpi-auth-token`

### Requirement 8: Error Handling and Logging

**User Story:** Como desarrollador, quiero logs detallados y manejo de errores robusto, para facilitar el debugging y mantenimiento.

#### Acceptance Criteria

1. WHEN ocurre cualquier operación de autenticación THEN el sistema SHALL generar logs detallados en desarrollo
2. WHEN hay error en login THEN el sistema SHALL mostrar mensaje de error apropiado al usuario
3. WHEN hay error de red THEN el sistema SHALL manejar el error gracefully sin crashear la aplicación
4. WHEN se detecta token corrupto THEN el sistema SHALL limpiar datos locales y redirigir a login
5. WHEN hay error en servicios crypto THEN el sistema SHALL log el error y fallar de forma segura

### Requirement 9: Dependencies Integration

**User Story:** Como sistema, quiero usar las dependencias correctas para criptografía, para garantizar compatibilidad y seguridad.

#### Acceptance Criteria

1. WHEN se realizan operaciones criptográficas THEN el sistema SHALL usar `crypto-js: ^4.2.0`
2. WHEN se requieren funciones crypto nativas THEN el sistema SHALL usar `expo-crypto: ~14.1.5`
3. WHEN se procesan respuestas del servidor THEN el sistema SHALL usar interfaz `ResponseWs<T>` con `code: string`, `message: string`, `data: T`, `success: boolean`
4. WHEN se integran servicios THEN el sistema SHALL usar los archivos proporcionados sin modificaciones: `BowpiOTPService.ts`, `BowpiHMACService.ts`, `BowpiCryptoService.ts`, `BowpiAuthenticationInterceptor.ts`
5. WHEN se almacenan datos THEN el sistema SHALL usar `AsyncStorage` para persistencia local

### Requirement 10: Security and Data Protection

**User Story:** Como usuario, quiero que mis datos de autenticación estén protegidos, para mantener la seguridad de mi cuenta.

#### Acceptance Criteria

1. WHEN se almacena información sensible THEN el sistema SHALL usar almacenamiento seguro apropiado
2. WHEN se transmiten credenciales THEN el sistema SHALL usar encriptación en tránsito
3. WHEN se generan tokens OTP THEN el sistema SHALL usar algoritmos seguros y no predecibles
4. WHEN se manejan errores THEN el sistema SHALL NOT exponer información sensible en logs de producción
5. WHEN se detecta actividad sospechosa THEN el sistema SHALL invalidar la sesión automáticamente