# CrediBowpi Documentation

Esta carpeta contiene documentación técnica detallada que ha sido movida desde los steering documents para optimizar el rendimiento de inicialización del proyecto.

## Estructura de Documentación

### 📁 `/technical-guides/`
Guías técnicas detalladas y patrones de implementación:
- `database-patterns.md` - Patrones de base de datos y esquemas
- `performance-guidelines.md` - Guías de optimización de rendimiento
- `performance-guidelines-part2.md` - Guías de rendimiento (parte 2)
- `performance-guidelines-part3.md` - Guías de rendimiento (parte 3)
- `deployment-guide.md` - Guía de deployment y configuración de ambientes
- `testing-strategy.md` - Estrategia integral de testing
- `api-integration.md` - Patrones de integración con APIs
- `error-handling.md` - Manejo de errores y logging
- `ux-patterns.md` - Patrones de experiencia de usuario
- `development-guidelines.md` - Guías de desarrollo detalladas

### 📁 `/authentication/`
Documentación específica del sistema de autenticación Bowpi:
- `bowpi authentication system.md` - Especificación completa del sistema
- `bowpi authentication offline first behavior.md` - Comportamiento offline-first
- `bowpi authentication security guidelines.md` - Guías de seguridad
- `sistema de autenticacion dual guia devs.md` - Guía para desarrolladores

### 📁 `/business/`
Documentación de reglas de negocio y procesos:
- `business-rules.md` - Reglas de negocio y validaciones
- `formulariosyllenadodesolicitud.md` - Proceso de llenado de solicitudes

## Documentos que permanecen como Steering

Los siguientes documentos permanecen en `.kiro/steering/` por ser esenciales y de tamaño reducido:
- `development-rules.md` (16 líneas) - Reglas básicas de desarrollo
- `structure.md` (103 líneas) - Estructura del proyecto
- `tech.md` (60 líneas) - Stack tecnológico
- `product.md` (22 líneas) - Información del producto
- `prd-bowpi.md` (166 líneas) - PRD esencial
- `credibowpi design system.md` (160 líneas) - Sistema de diseño básico

**Total de líneas en steering: 527 líneas** (reducción de ~97% desde las 17,599 líneas originales)

## Cómo Acceder a la Documentación

Para referenciar estos documentos en el código o en conversaciones con Kiro, usa:
- `#[[file:.kiro/documentation/technical-guides/database-patterns.md]]`
- `#[[file:.kiro/documentation/authentication/bowpi authentication system.md]]`
- `#[[file:.kiro/documentation/business/business-rules.md]]`

## Beneficios de esta Reorganización

1. **Rendimiento mejorado**: Inicialización de chat ~97% más rápida
2. **Organización lógica**: Documentos agrupados por categoría
3. **Acceso bajo demanda**: Documentación técnica disponible cuando se necesite
4. **Steering optimizado**: Solo información esencial carga automáticamente