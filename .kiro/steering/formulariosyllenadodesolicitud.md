# PROCESO COMPLETO PARA CREAR UNA SOLICITUD DE CRÉDITO

El sistema maneja un proceso de 6 etapas principales con navegación libre, auto-guardado en tiempo real como borradores, y validaciones en vivo. Aquí están todos los detalles:

---

## ETAPA 1: IDENTIFICACIÓN Y CONTACTO

### Sub-etapa 1.1: Datos Básicos Personales

**Campos obligatorios:**

- Nombres (solo texto, sin números)
- Apellidos (solo texto, sin números)
- Género (Masculino/Femenino)
- Estado Civil (Soltero/a, Casado/a, Divorciado/a, Viudo/a, Unión libre)
- DPI (13 dígitos con formato: 0000 00000 0000, validación en tiempo real)
- NIT (opcional, mínimo 8 dígitos, solo números)
- DPI Extendido en (Departamento de Guatemala donde se emitió)

**Campo condicional:**

Información del Cónyuge (aparece solo si estado civil = "Casado/a"):

- Nombre Cónyuge
- Actividad Laboral Cónyuge (Empleado, Independiente, Hogar, Estudiante, Desempleado)

---

### Sub-etapa 1.2: Contacto y Vivienda

**Campos obligatorios:**

- Teléfono Móvil (formato: 0000 0000, 8 dígitos, validación en tiempo real)
- Teléfono de Casa (opcional, mismo formato)
- E-mail (validación de formato de correo)
- Dirección (textarea, mínimo 10 caracteres)
- Referencia para la Dirección (opcional, punto de referencia)
- Geolocalización (captura automática con GPS del dispositivo)
- Departamento de Residencia (22 departamentos de Guatemala)
- Municipio de Residencia (dinámico según departamento seleccionado)
- Tipo de Vivienda (Propia, Alquilada, Familiar, Hipotecada, Otra)
- Estabilidad Domiciliar (1 año, 2 años, 3 años, 5 años, Más de 5 años - con badges de evaluación)

---

## ETAPA 2: FINANZAS Y PATRIMONIO

### Sub-etapa 2.1: Análisis Financiero

**Campos de Ingresos:**

- Fuente de Ingresos Principal (Asalariado, Negocio Propio, Remesas, Pensión, Jubilación, Otros)
- Ingreso Principal (campo monetario con formato Q)
- Ingreso Secundario (opcional, campo monetario)
- Comentario de referencia (descripción de la fuente principal de ingresos)

**Campos de Gastos (10 categorías):**

- Alimentación
- Vestuario
- Servicios Básicos
- Educación
- Vivienda
- Transporte
- Compromisos
- Gastos Financieros
- Descuentos de Planilla
- Otros

**Cuota Solicitada** (campo editable)

**Cálculos automáticos:**

- Total de Ingresos
- Total de Gastos
- Disponibilidad (Ingresos - Gastos)
- Porcentaje de cobertura de cuota
- Sistema de semáforo (Verde: Aplica, Amarillo: Revisar, Rojo: No Aplica)

---

### Sub-etapa 2.2: Estado Patrimonial

**Activos (7 categorías):**

- Efectivo y saldo en bancos
- Cuentas por cobrar
- Mercaderías
- Bienes Muebles (menaje)
- Vehículos
- Bienes Inmuebles
- Otros Activos

**Pasivos (3 categorías):**

- Cuentas por pagar
- Deudas a corto plazo
- Préstamos a largo plazo

**Cálculos automáticos:**

- Total de Activos
- Total de Pasivos
- Capital y Patrimonio (Activos - Pasivos)
- Monto Solicitado (editable)
- Índice de Endeudamiento Actual (Pasivos/Activos × 100)
- Índice de Endeudamiento Proyectado ((Pasivos + Monto Solicitado)/Activos × 100)
- Evaluación de Riesgo con colores (Verde: <50%, Amarillo: 50-70%, Rojo: >70%)

---

## ETAPA 3: NEGOCIO Y PERFIL ECONÓMICO

**Campos Iniciales:**

- Tipo de Solicitante (Radio buttons: Asalariado / Negocio Propio)

**Si es "Negocio Propio" (campos adicionales):**

### Información Básica del Negocio:

- Nombre del Negocio
- Tipo de Actividad (16 categorías CNAE: Agricultura, Minería, Manufactura, Construcción, etc.)
- Años de Experiencia (numérico)
- Dirección del Negocio (textarea)

### Ventas Mensuales:

- Ventas Mensuales de Contado Q
- Ventas Mensuales a Crédito Q

**Productos/Servicios (dinámico, máximo 10):** Para cada producto:

- Nombre
- Unidad de medida
- Cantidad
- Precio Unitario Q
- Total Q (calculado automáticamente)
- Utilidad Q

### Estacionalidad del Negocio:

- Meses de Temporada Alta (texto libre)
- Ventas Temporada Alta Q
- Meses de Temporada Baja (texto libre)
- Ventas Temporada Baja Q

### Gastos Administrativos Mensuales (6 categorías):

- Bonificaciones Q
- Sueldos Q
- Alquiler Q
- Servicios Q
- Transporte Q
- Otros Gastos Q

### Análisis del Negocio (para uso exclusivo del agente):

- Riesgo de Ingresos (textarea, 20-500 caracteres)
- Observaciones Adicionales (textarea, 20-500 caracteres)

---

## ETAPA 4: GARANTÍAS, FIADORES Y REFERENCIAS

### Gestión de Fiadores:

- Mínimo 2 fiadores requeridos, máximo 10
- Sistema de lista con tarjetas individuales
- Estados: Pendiente/Completo con badges visuales

### Para cada Fiador - Información Básica:

- Nombre Completo
- DPI/CUI (13 caracteres máximo)
- Correo Electrónico (validación de formato)
- Teléfono (formato validado)
- Dirección (textarea)

### Funcionalidades:

- Edición individual de cada fiador
- Eliminación (si hay más de 2)
- Navegación entre formulario de fiador y lista
- Estado de progreso visual por fiador
- Resumen de estado (completados vs total)

---

## ETAPA 5: DOCUMENTOS Y CIERRE

### Documentos Requeridos (5 tipos principales):

- **Identificación Oficial (Requerido):** INE, pasaporte o cédula profesional vigente
- **Comprobante de Domicilio (Requerido):** No mayor a 3 meses de antigüedad
- **Comprobante de Ingresos (Requerido):** Recibos de nómina o estados de cuenta de los últimos 3 meses
- **Estados de Cuenta Bancarios (Requerido):** De los últimos 3 meses
- **Declaración de Impuestos (Opcional):** Del último año fiscal

### Opciones de Carga:

- Cámara del dispositivo (con vista previa en tiempo real)
- Selección de archivos (PDF, JPG, PNG máximo 5MB)
- Vista previa de documentos cargados
- Eliminación de documentos
- Estados visuales (Pendiente/Subido/Error)

### Características Técnicas:

- Integración con cámara nativa
- Compresión automática de imágenes
- Thumbnails para vista rápida
- Validación de formatos y tamaños
- Almacenamiento seguro

---

## ETAPA 6: REVISIÓN FINAL

### Sistema de Completitud:

- Cálculo automático del porcentaje de completitud
- Lista detallada de campos faltantes
- Validaciones específicas (DPI 13 dígitos, NIT 8+ dígitos, montos > 0)

### Resumen Organizado por Secciones:

1. **Identificación y Contacto:**  
   Agencia, Fecha, DPI, Nombre, Estado Civil, Teléfono, Email, Tipo Vivienda, Dirección

2. **Información del Crédito:**  
   Monto Solicitado, Plazo, Destino, Forma Pago Capital (formato de moneda guatemalteca)

3. **Información Financiera:**  
   Ventas Contado, Ventas Crédito, Total Ventas (si aplica)

4. **Negocio y Perfil Económico:**  
   Nombre Negocio, Tipo Actividad, Años Experiencia, Dirección Negocio, Lista de Productos con montos

5. **Fiadores y Referencias:**  
   Lista numerada con porcentaje de cobertura por fiador

6. **Documentos:**  
   Estado visual (check verde/alerta roja) por cada documento

### Controles Finales:

- Botón de Envío (solo aparece con 100% completitud)
- Aceptación automática de términos al enviar
- Validación final antes del envío
- Estados visuales claros para elementos faltantes

---

## CARACTERÍSTICAS GENERALES DEL SISTEMA:

### Navegación:

- Navegación libre entre etapas
- Indicadores visuales de progreso
- Breadcrumbs de ubicación
- Sub-pasos dentro de etapas complejas

### Persistencia de Datos:

- Auto-guardado en tiempo real como borrador
- Recuperación de sesión
- Versionado de cambios
- Sincronización con base de datos

### Validaciones:

- Tiempo real para formatos (DPI, teléfono, email)
- Cálculos automáticos financieros
- Validación de integridad antes del envío
- Mensajes de error contextual

### UX/UI:

- Diseño responsivo para móviles
- Componentes accesibles
- Feedback visual inmediato
- Carga progresiva de contenido
- Integración con hardware del dispositivo (cámara, GPS)

---

## Estructura General Visual y Experiencia de la Pantalla de llenado o creación de solicitud

Cuando se ingresa a editar o crear una solicitud desde cero la pantalla de llenado está compuesta por varios elementos organizados de manera jerárquica:

### 1. Header Principal (Barra Superior)

- Nombre de la solicitud: Muestra el primer nombre del solicitante (ej. "Juan Carlos") o "Solicitud Nueva" si es una nueva solicitud
- Subtítulo: ID de la solicitud formateada (ej. "Solicitud SCO-503838")
- Botón de regreso (←): Para volver a la lista de aplicaciones
- Botón X (cerrar): Botón rojo que activa el diálogo de salida del formulario

### 2. Breadcrumb Navigation

Navegación contextual que muestra:  
**Inicio > Solicitudes > [Nombre del solicitante/Nueva Solicitud]**

### 3. Dynamic Form Header (Selector de Sección)

Esta es una sección muy importante que incluye:

**Información del paso actual:**

- Título de la sección actual (ej. "Identificación y Contacto")
- Indicador de progreso: "Paso X de 6 – [Contexto de la sección]"
- Icono desplegable (chevron) para mostrar todas las secciones

**Selector desplegable de secciones:**

- Identificación: Datos básicos
- Finanzas: Información financiera
- Negocio: Perfil económico
- Fiadores: Fiadores y referencias
- Documentos: Documentos y cierre
- Revisión: Revisión final

**Cada sección muestra:**

- Número del paso (1-6) con estado visual
- Estado completado (checkmark verde)
- Estado activo (resaltado)
- Descripción del contexto

**Barra de progreso (solo móvil):**

- Indicador visual lineal del progreso general
- Se actualiza dinámicamente según la navegación


### 4. Área de Contenido Principal (StepContent)

Esta sección presenta el formulario específico según la sección y sub-paso:

- **Sección 1 - Identificación y Contacto:**
  - Sub-paso 1: Información personal básica
  - Sub-paso 2: Contacto y vivienda, información del cónyuge

- **Sección 2 - Finanzas y Patrimonio:**
  - Análisis financiero completo
  - Estado patrimonial

- **Sección 3 - Negocio y Perfil Económico:**
  - Información del negocio/trabajo

- **Sección 4 - Fiadores:**
  - Gestión de múltiples fiadores (2-10)
  - Información básica y financiera por fiador

- **Sección 5 - Documentos:**
  - Upload de documentos requeridos
  - Captura con cámara o selección de archivos

- **Sección 6 - Revisión:**
  - Resumen completo por secciones
  - Validaciones finales

---

### 5. Form Action Bar (Barra Inferior Sticky)

Barra fija en la parte inferior con tres elementos:

- **Botón Anterior (Izquierda):**
  - Icono: Flecha izquierda
  - Texto: "Anterior"
  - Deshabilitado en el primer paso
  - Navega hacia atrás respetando sub-pasos

- **Botón Guardar (Centro):**
  - Solo icono de guardar
  - Siempre disponible
  - Guarda como borrador sin validaciones estrictas

- **Botón Siguiente/Enviar (Derecha):**
  - Siguiente: Icono flecha derecha, navega al próximo sub-paso/sección
  - Enviar solicitud: En la última sección, botón verde con checkmark
  - El botón de enviar se habilita solo cuando se aceptan todos los consentimientos

---

### 6. Bottom Navigation

Navegación inferior general de la app (independiente del formulario)

---

### 7. Exit Dialog (Diálogo de Salida)

Cuando se presiona la X del header, aparece un diálogo modal con:

- **Título:** "¿Desea salir de la solicitud?"

**Descripción:**

- Si hay cambios sin guardar: "Tienes cambios sin guardar. Puedes guardar tu progreso..."
- Si no hay cambios: "Puede guardar su progreso actual..."

**Opciones:**

- **"Salir sin guardar"** (botón outline con icono X): Sale inmediatamente sin guardar
- **"Guardar y salir"** (botón principal con icono Save):
  - Valida datos mínimos requeridos
  - Si la validación falla, muestra alerta de datos mínimos
  - Si pasa, guarda como borrador y regresa a /applications

---

### 8. Minimum Data Alert

Si se intenta guardar sin datos mínimos, aparece una alerta que explica qué información falta.

---

## Funcionalidades Clave

### Navegación Libre:

- Se puede navegar a cualquier sección desde el selector
- Respeta sub-pasos dentro de cada sección
- Mantiene el progreso en cada sección

### Auto-guardado:

- Todos los cambios marcan `hasUnsavedChanges = true`
- Función de guardado manual disponible siempre
- Guardado automático al salir (opcional)

### Validaciones:

- Validaciones en tiempo real por campo
- Validación de datos mínimos al guardar
- Validaciones de consentimiento al enviar

### Estados Visuales:

- Indicadores de sección completada (checkmark verde)
- Sección activa (resaltado)
- Progreso visual en barra inferior (móvil)
- Estados de botones (habilitado/deshabilitado)

### Responsive Design:

- Layout adaptativo para móvil/desktop
- Barra de progreso solo en móvil
- Botones adaptables según tamaño de pantalla

---

La interfaz está diseñada para ser intuitiva, permitir navegación libre, mantener el contexto del usuario y proporcionar múltiples opciones de guardado y salida según las necesidades del usuario.
