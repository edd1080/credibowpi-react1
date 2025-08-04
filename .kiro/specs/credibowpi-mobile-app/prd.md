
# PRD – CrediBowpi

**Producto digital para originación, gestión y evaluación de créditos en campo.**

---

## 1. App Overview

CrediBowpi es una aplicación móvil para Android e iOS que digitaliza el ciclo completo de originación y gestión de créditos rurales. Diseñada para agentes de crédito en campo, la app reemplaza formularios en papel por un flujo digital offline-first con sincronización segura. El objetivo es reducir en al menos un 40 % el tiempo total de captura, validación y decisión de crédito, mejorando la trazabilidad y la calidad de los datos.

**Objetivo principal:**  
Digitalizar el proceso completo de originación de créditos para agentes de campo, reemplazando métodos manuales por una app móvil robusta, intuitiva y completamente funcional en modo offline.

**Usuarios meta:**  
Agentes financieros/promotores de cooperativas rurales, encargados de registrar solicitudes de crédito directamente con los clientes.

**Plataforma:**  
Aplicación móvil híbrida para Android/iOS desarrollada con React Native + Expo. Backend externo provisto por el equipo de backend de Bowpi.

**Valor diferencial:**  
Captura offline, motor de reglas automatizado para scoring, formularios modulares escalables, experiencia fluida, visual moderna y sin fricción.

---

## 2. User Flow

1. Login (correo + contraseña, restablecer contraseña)
2. Home – saludo, métricas del agente, botón “Nueva Solicitud”
3. Pre-Calificación KYC – captura de DPI (frente, reverso) + selfie; validación contra RENAP y burós
4. Solicitud – formulario modular por secciones (Identificación, Finanzas, Negocio, Garantías, Documentos, Revisión)
5. Firma Digital – firma en pantalla; adjuntos fotográficos
6. Sincronización – subida de datos cifrados, evaluación en el backend, retorno de estado
7. Panel de Solicitud – tabs: Resumen, Detalles, Fiadores, Documentos; acciones rápidas (editar sección, enviar, cancelar)
8. Notificación de Estado – cambio a Aprobado / Rechazado / Verificación; métricas actualizadas en Home
9. Settings – perfil, preferencias de notificación, tema claro/oscuro, ayuda y soporte, logout

---

## 3. Tech Stack & APIs

- **Frontend:** React Native + Expo, TypeScript estricto, Zustand, SQLite cifrado (expo-sqlite-crypto)
- **Backend (Bowpi):** API RESTful JSON (login, KYC, formularios, sincronización, motor de reglas)
- **AI Tooling:** bolt.new (UI scaffolding), Cursor (lógica avanzada), Kiro (prompts)
- **CI/CD & QA:** Expo EAS Build, Jest, Testing Library, Detox (E2E), GitHub Actions
- **Seguridad:** JWT tokens, SecureStore, cifrado AES local, TLS 1.3

---

## 4. Core Features

- Autenticación básica
- Modo offline con sincronización segura
- Dashboard de agente con KPIs
- Motor de formularios dinámicos reutilizables con validaciones
- Subformularios para fiadores
- Captura de imágenes y archivos
- Captura de documentos DPI y escaneo facial
- Firma digital en pantalla
- Estado de solicitud con badges codificados por color
- Navegación fluida por secciones
- Guardado automático
- Notificaciones internas

---

## 5. In-Scope / Out-of-Scope

**In-Scope:**

- App móvil exclusiva para agentes
- Flujo completo de creación y seguimiento de solicitud
- Sincronización y evaluación automatizada
- Firma digital integrada
- UI moderna y accesible

**Out-of-Scope:**

- App para cliente final
- Backoffice o portal de administración
- Desembolso del crédito
- Autenticación multifactor
- Generación de contratos legales o PDFs
- Creación de productos crediticios
- Generación de endpoints o backends

---

## 6. Non-Functional Requirements

- **Performance:** Inicio < 3 s, transición < 250 ms, sincronización cada 5 min o manual
- **Usabilidad:** Onboarding < 10 min, curva de aprendizaje baja, accesibilidad WCAG AA
- **Confiabilidad:** Operación 100 % offline, sin pérdida de datos (WAL)
- **Seguridad:** Cifrado en reposo y tránsito, cumplimiento OWASP M-Mobile
- **Mantenibilidad:** FDD + Atomic Design, cobertura > 80 % tests
- **Escalabilidad:** Formularios agregables sin actualizar app (config desde backend)
- **Accesibilidad:** Contraste suficiente, navegación clara, soporte de temas
- **UX:** Evaluación heurística y tests de usabilidad rápida
- **Desempeño:** Estable con 200+ solicitudes en caché

---

## 7. Constraints & Assumptions

- Backend, endpoints y motor de scoring provistos por Bowpi
- Agentes operan en zonas de baja conectividad
- Dispositivos Android 8+ o iOS 14+ con 2 GB RAM mínimo
- Solo un tipo de usuario: agente
- Firma digital sin validación legal avanzada
- No multilenguaje ni push externas en versión 1

---

## 8. Known Issues & Potential Pitfalls

- Fotos DPI de mala calidad → OCR fallido
- Conflictos si se edita misma solicitud en varios dispositivos
- Dependencia de servicios externos (RENAP, buró)
- Latencia 2G → retraso en actualizaciones de estado
- Sin backend listo → se simula flujo completo en UI
- Posibles errores en sincronización → logs y reintentos obligatorios
- Personalización excesiva de formularios podría dificultar mantenimiento
- Agentes con dispositivos de gama baja podrían enfrentar problemas de rendimiento

---

## 9. Paleta de Colores


Brand Core
	•	Primary Deep Blue — #2A3575 (acciones primarias, títulos, énfasis de marca)
	•	Secondary Blue — #2973E7 (CTAs secundarios, estados activos alternos)
	•	Tertiary Cyan — #5DBDF9 (indicadores, highlights, chips activos)
	•	Base White — #FFFEFE (fondos y cards)

Functional / Feedback
	•	Success Green — #33A853 (validaciones, sync OK)
	•	Warning Amber — #FFC447 (pendiente, revisión manual)
	•	Error Red — #E55252 (errores de validación/sync)
	•	Info Blue — #3BA3E8 (mensajes informativos)

Neutrals
	•	Neutral 900 — #1C2A34 (texto principal)
	•	Neutral 700 — #4F5F6A (texto secundario)
	•	Neutral 500 — #8D9AA3 (placeholders, disabled)
	•	Neutral 300 — #C9D1D6 (bordes/divisores)
	•	Neutral 100 — #EFF2F4 (fondos suaves)

Overlays
	•	Overlay Dark — rgba(0,0,0,0.4) (modals)
	•	Overlay Light — rgba(255,255,255,0.92) + blur 12px (sheets elevadas)

WCAG: ≥4.5:1 texto normal; ≥3:1 headings ≥24 pt.

---

## Tipografía

- **Fuente primaria:** MD Sans (Regular, Medium, Bold)
- **Escala tipográfica:**
  - H1: 24–28 px
  - H2: 20–24 px
  - H3: 18 px
  - Body: 16 px
  - Caption: 14 px
  - Small: 12 px
