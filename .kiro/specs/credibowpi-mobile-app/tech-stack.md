
# Tech Stack Rules – CrediBowpi

Este documento integra y sintetiza las reglas, convenciones y estructuras de desarrollo especificadas en los siguientes archivos entregados:

- `01-refactoring-guide.md`
- `02-feature-driven-architecture.md`
- `03-atomic-components-methodology.md`
- `04-general-project-rules.md`

---

## 1. Refactoring & Escalabilidad (Resumen de 01-refactoring-guide.md)

**Objetivo:** Evitar código acoplado y repetido. Asegurar que cada componente tenga un propósito único y coherente.

**Principios Clave:**

- Extraer lógica redundante a funciones puras reutilizables.
- Reemplazar condicionales anidados con estructuras claras y predecibles.
- Usar hooks personalizados para encapsular lógica reactiva repetida.
- Los formularios deben segmentarse por secciones lógicas, y validarse de forma modular.
- El código debe ser comprensible sin comentarios extensos.

**Aporta al producto:** mejora mantenibilidad y reduce errores, lo cual es vital para una app offline que requiere alta confiabilidad y fácil depuración.

---

## 2. Feature-Driven Architecture (Resumen de 02-feature-driven-architecture.md)

**Objetivo:** Organizar la base de código según funcionalidades del negocio, no por tipo de archivo.

**Estructura base:**

```bash
src/
 ├── features/        # Cada dominio o sección principal de la app
 │   ├── kyc/
 │   ├── credit-request/
 │   ├── documents/
 │   ├── dashboard/
 │   └── settings/
 ├── shared/
 │   ├── ui/
 │   ├── hooks/
 │   ├── lib/
 │   ├── api/
 │   └── types/
 ├── app/             # Navegación, rutas, contexto global
 └── assets/
```

**Ventajas:**

- Escalable: permite agregar nuevas features sin afectar otras.
- Separación de dominios y dependencias claras.
- Posibilita desarrollo colaborativo sin conflictos mayores.

**Aporta al producto:** soporta escalabilidad para múltiples cooperativas o productos sin romper la arquitectura existente.

---

## 3. Atomic Component Design (Resumen de 03-atomic-components-methodology.md)

**Objetivo:** Definir y componer la UI desde elementos básicos hasta estructuras completas reutilizables.

**Niveles atómicos:**

- `Atoms`: botones, inputs, labels, íconos
- `Molecules`: cards, inputs con labels, combos
- `Organisms`: formularios completos, pickers con validaciones
- `Templates`: layout de una solicitud, layout de resumen
- `Pages`: vistas con lógica completa (ex: página de edición de solicitud)

**Reglas generales:**

- Todo componente debe ser reutilizable por configuración de props.
- Los estilos deben seguir el sistema de diseño y la paleta definida.
- Cada componente tiene sus pruebas unitarias.

**Aporta al producto:** diseño consistente, reducción de bugs UI, mejora la velocidad de desarrollo usando bolt.new.

---

## 4. Reglas Generales del Proyecto (Resumen de 04-general-project-rules.md)

**Convenciones globales:**

- TypeScript estricto (`strict: true` en tsconfig)
- Uso de `Zustand` para estado local persistente.
- SQLite como almacenamiento offline (con encriptación).
- Modularidad de formularios vía `schema-driven config`.
- Todos los textos deben ser centralizados para soportar escalabilidad futura.
- Uso de librerías auditadas y mantenidas.

**Flujos de trabajo:**

- Bolt.new se usará para generar scaffolding de pantallas.
- Cursor para lógica compleja.
- Commit estándar: `[feat|fix|refactor|style]: descripción`.

**Seguridad:**

- SecureStore para credenciales.
- Validaciones estrictas antes de sincronizar.
- Control de errores con logs locales y reintentos en sincronización.

**Testeo:**

- Unit tests para cada componente atómico y hook.
- E2E tests para flujos clave de usuario.
- Lint + Prettier como reglas de estilo inquebrantables.

---

## 5. Aplicación Práctica al Proyecto

Todo lo anterior se implementa bajo la arquitectura de CrediBowpi, y se verá reflejado directamente en:

- Navegación desacoplada.
- Formularios totalmente configurables.
- Componentes UI generados automáticamente.
- Experiencia visual coherente, responsiva y accesible.
- Interacción fluida, incluso en entornos de baja conectividad.

**Este documento debe ser consultado cada vez que se escale, refactorice o documente el código del proyecto CrediBowpi.**
