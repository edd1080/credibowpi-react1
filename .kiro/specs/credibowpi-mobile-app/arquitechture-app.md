
# Arquitectura General + Diagrama de Navegación

## CrediBowpi – App Móvil para Originación de Créditos

### a) Entregables Integrados
**Equipo:** Product Manager, Backend, Frontend, Product Designer, AI Engineer, QA
a
---

## 1. Arquitectura General del Sistema

### Arquitectura Funcional (Alto Nivel)

```
┌───────────────────────────┐
│        Backend (Bowpi)    │
│                           │
│  • Autenticación (JWT)    │
│  • KYC (RENAP / Burós)    │
│  • Evaluación de crédito  │
│  • APIs REST (JSON)       │
│  • Almacenamiento central │
└────────────┬──────────────┘
             │
     TLS 1.3 / JSON API
             │
┌────────────▼──────────────┐
│   App Móvil (CrediBowpi)  │
│   React Native + Expo     │
│                            │
│  ┌──────────────────────┐ │
│  │ Estado Global (Zustand)│
│  └──────────────────────┘ │
│                            │
│  ┌──────────────────────┐ │
│  │ DB Local (SQLite Crypto│
│  └──────────────────────┘ │
│                            │
│  ┌──────────────────────┐ │
│  │ UI (bolt.new)         │
│  └──────────────────────┘ │
│                            │
│  ┌──────────────────────┐ │
│  │ Lógica avanzada (Cursor│
│  └──────────────────────┘ │
│                            │
│  ┌──────────────────────┐ │
│  │ Agente AI (Kiro)     │
│  └──────────────────────┘ │
└────────────────────────────┘
```

---

## 2. Diagrama de Navegación – App Móvil

Representación lógica de navegación basada en un stack híbrido:

```
┌────────────┐
│ Splash     │
└────┬───────┘
     │
┌────▼─────┐
│ Login    │
└────┬─────┘
     │
┌────▼─────┐
│ HomeTab  │←────────────────────────┐
│          │                         │
│ KPIs     │                         │
│ Nueva Solicitud                   │
└────┬─────┘                         │
     │                              │
┌────▼──────────────────────────────┴────────────────────────────────────────────────────┐
│ SolicitudesTab                                                                            │
│                                                                                          │
│ • Listado de solicitudes                                                                 │
│   └▶ Card individual → abre pantalla de detalle de solicitud                             │
│                                                                                          │
│ Detalle de Solicitud (4 tabs):                                                           │
│  ┌───────────────┬────────────────────┬──────────────┬──────────────┐                    │
│  │ Resumen       │ Detalles            │ Fiadores     │ Documentos   │                    │
│  └───────────────┴────────────────────┴──────────────┴──────────────┘                    │
│                                                                                          │
│ Acciones rápidas: ir a sección, continuar llenado, firmar, enviar                        │
└──────────────────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌───────────────┐
│ Nueva Solicitud│
└────┬──────────┘
     ▼
┌───────────────┐
│ Precalificación│
│ (KYC + Selfie) │
└────┬──────────┘
     ▼
┌───────────────┐
│ Formulario modular (6 secciones)                                                        │
│ • Identificación y Contacto                                                             │
│ • Finanzas y Patrimonio                                                                 │
│ • Negocio/Trabajo y Perfil Económico                                                    │
│ • Garantías y Fiadores                                                                  │
│ • Documentos Adjuntos                                                                   │
│ • Revisión Final                                                                         │
└────────────────┬────────────────────────────────────────────────────────────────────────┘
                 │
           Firma Digital
                 │
           Enviar Solicitud
                 │
           Estado + Feedback
                 │
           Vuelve a Solicitudes

┌───────────────────────────────────────────┐
│ AjustesTab                               │
│ • Perfil                                 │
│ • Notificaciones                         │
│ • Tema claro/oscuro                      │
│ • Ayuda y soporte                        │
│ • Logout                                 │
└───────────────────────────────────────────┘
```

---

## 3. Consideraciones de Navegación

- Stack Navigation para flujos anidados como formularios o ver detalles
- Bottom Tab Navigation con acceso persistente a: Home / Solicitudes / Ajustes
- Fallback offline: todas las pantallas críticas operan sin conexión
- Persistencia: cada pantalla se guarda localmente con estado, incluso si el agente cierra la app
