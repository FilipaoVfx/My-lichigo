# PRD — App PWA de Gestión de Préstamos (Prestamista / Cobranza)
**Versión:** 1.0  
**Fecha:** 2026-02-26  
**Stack base:** PWA (Web) + Supabase (Postgres + Auth + Storage + Edge Functions)  
**Objetivo:** Un CRUD robusto (MVP) que permita gestionar **clientes, préstamos, pagos, fechas, plazos, mora, observaciones, montos e intereses personalizados**, usable desde **teléfono** (instalable como PWA).

---

## 1) Contexto y Problema
El prestamista necesita un sistema simple y confiable para:
- Registrar clientes y sus datos.
- Crear préstamos con condiciones personalizadas (monto, interés, plazo, periodicidad).
- Registrar pagos y controlar saldos.
- Identificar clientes en mora y llevar seguimiento con observaciones.
- Consultar rápidamente “qué se debe cobrar hoy/esta semana”, y el estado de cartera.

Hoy esto suele hacerse en Excel/WhatsApp/cuadernos: errores de cálculo, pérdida de historial, baja trazabilidad y dificultad para filtrar por fechas/mora.

---

## 2) Objetivos del Producto
### Objetivos (must)
1. CRUD completo de **Clientes**.
2. CRUD completo de **Préstamos** (asociados a un cliente).
3. Registro de **Pagos** (parciales/totales) y actualización de saldo.
4. Cálculo y visualización de:
   - Saldo actual
   - Interés acumulado (según regla del préstamo)
   - Próxima fecha de pago
   - Días en mora y estado (al día / por vencer / en mora / cancelado)
5. Listados y filtros: por estado, fechas, cliente, mora.
6. Observaciones por cliente y/o préstamo (bitácora).
7. PWA instalable + UX mobile-first.

### Objetivos (should)
8. Recordatorios internos y tareas de cobranza (agenda de cobros).
9. Reportes básicos: cartera total, recuperado, vencido, por período.
10. Exportación CSV (clientes, préstamos, pagos).

### No objetivos (por ahora)
- Cobro en línea / pasarela de pagos
- KYC / verificación de identidad
- Integración contable compleja
- Multi-moneda avanzada

---

## 3) Usuarios y Permisos
### Roles
- **Admin (Prestamista):** dueño de la cartera. Accede a todo.


> MVP puede iniciar con **solo Admin**.

---

## 4) Alcance MVP (CRUD “fuerte”)
### Entidades
- Cliente
- Préstamo
- Pago
- Observación (bitácora)
- (Opcional) Configuración / Catálogos (tipos de interés, periodicidades)

### Módulos MVP
1. **Auth & Sesión**
2. **Clientes**
3. **Préstamos**
4. **Pagos**
5. **Mora & Cobranza**
6. **Reportes básicos**
7. **PWA (instalación + offline parcial)**

---

## 5) Flujos Clave (End-to-End)
### 5.1 Crear cliente → crear préstamo → plan de pagos → registrar pago
1. Admin crea Cliente (datos mínimos).
2. Admin crea Préstamo:
   - Monto principal
   - Interés (tasa y tipo)
   - Plazo (número de cuotas / meses / semanas)
   - Periodicidad (diaria/semanal/quincenal/mensual)
   - Fecha de desembolso
   - Día de pago (si aplica)
   - Regla de mora (gracia, recargo)
3. Sistema genera **cronograma** (cuotas) o al menos **próximas fechas** (según enfoque MVP).
4. Admin registra un Pago (monto + fecha).
5. Sistema recalcula saldo, estado, próxima fecha.

### 5.2 Detección de mora y gestión
1. Vista “Cobros de hoy / próximos 7 días”.
2. Vista “En mora”:
   - días en mora
   - saldo vencido
   - últimas observaciones
3. Registrar observación + promesa de pago (nota).
4. Registrar pago parcial; sistema baja mora si aplica.

---

## 6) Reglas de Negocio (Cálculos)
> Importante: define reglas simples para el MVP, pero parametrizables.

### 6.1 Tipos de interés (MVP)
- **Interés simple por período** (recomendado para MVP):
  - `interes_periodo = principal * tasa_periodo`
  - total esperado = `principal + (interes_periodo * num_periodos)`
- **Interés mensual fijo** (si periodicidad ≠ mensual, convertir tasa efectiva a período)
- **Interés personalizado**:
  - tasa ingresada manualmente
  - base de cálculo: principal (no saldo) o saldo (configurable fase 2)

**Campos necesarios:**
- `interest_rate` (decimal)
- `interest_rate_period` (daily|weekly|biweekly|monthly)
- `interest_type` (simple|flat|custom)

### 6.2 Cuotas / plazos
- `term_count` (número de períodos/cuotas)
- `payment_frequency` (daily|weekly|biweekly|monthly)
- `first_due_date`
- `due_day_of_month` (opcional)

### 6.3 Estado del préstamo
- **draft**: creado pero no desembolsado
- **active**: desembolsado y con saldo
- **overdue**: con cuota vencida (o fecha de pago vencida)
- **paid**: saldo 0
- **defaulted**: castigado (manual)

### 6.4 Mora (MVP)
- `grace_days` (0 por defecto)
- `late_fee_type` (none|fixed|percent)
- `late_fee_value`
- cálculo: si `today > due_date + grace_days` → overdue
- días mora: `max(0, today - (due_date + grace_days))`

> MVP puede manejar mora “por préstamo” basada en **próxima fecha de pago** y saldo, sin cronograma por cuota. Fase 2: cronograma por cuota.

---

## 7) Requisitos Funcionales (Detallados)
### 7.1 Autenticación
- Login con email/password (Supabase Auth).
- Persistencia de sesión.
- Recuperación de contraseña (Supabase).
- En móvil: sesión estable + “recordarme”.

### 7.2 Clientes (CRUD)
**Campos mínimos:**
- Nombres, apellidos

- Teléfono (clave para cobranza)

- Estado (activo/inactivo)
- Notas generales

**Acciones:**
- Crear/editar/eliminar (soft delete recomendado)
- Búsqueda por nombre/teléfono/documento
- Vista detalle: préstamos activos, historial pagos, observaciones

### 7.3 Préstamos (CRUD)
**Campos mínimos:**
- Cliente asociado
- Principal (monto)
- Interés: tasa, tipo, período
- Plazo: frecuencia + cantidad
- Fecha desembolso
- Próxima fecha pago (autocalculada)
- Reglas mora
- Estado

**Acciones:**
- Crear/editar/cerrar (marcar pagado)
- Recalcular cronograma/fechas si se edita plazo (regla: solo si no hay pagos o con confirmación interna)
- Ver resumen: total esperado, total pagado, saldo

### 7.4 Pagos
**Campos:**
- Préstamo asociado
- Fecha pago
- Monto
- Método (efectivo, transferencia, etc.)
- Nota (opcional)

**Acciones:**
- Registrar pago
- Editar pago (con auditoría)
- Anular pago (soft delete) y recalcular saldo
- Regla de aplicación:
  - MVP: pago reduce saldo total esperado (o saldo principal+interés acumulado según tu regla)
  - Fase 2: pago aplica a cuotas vencidas primero

### 7.5 Observaciones / Bitácora
- Observaciones por cliente o por préstamo
- Tipo: llamada, visita, promesa, incidente, acuerdo
- Fecha/hora + autor
- Adjuntos (fase 2 con Storage)

### 7.6 Vistas de Cobranza
- “Cobros de hoy”
- “Próximos 7/15/30 días”
- “En mora”
- Filtros: zona, cobrador (fase 2), monto, días mora, estado

### 7.7 Reportes (MVP)
- Cartera total (saldo activo)
- Total prestado en rango de fechas
- Total cobrado en rango de fechas
- Vencido (overdue) + % de mora
- Export CSV

---

## 8) Requisitos No Funcionales
### 8.1 PWA y Mobile
- **Responsive mobile-first**
- Instalable (manifest + service worker)
- Modo offline parcial:
  - ver lista de clientes/préstamos “cacheados”
  - registrar pagos offline (cola) y sincronizar al reconectar (fase 2 si se complica)
- Buen rendimiento en Android gama media:
  - TTI < 3s en 4G (objetivo)
  - navegación fluida

### 8.2 Seguridad
- RLS estricto en Supabase (por usuario/tenant).
- Soft delete para evitar pérdida accidental.
- Auditoría mínima (created_at, updated_at, created_by).
- Backups (Supabase + export).

### 8.3 Observabilidad
- Logs en Edge Functions (si se usan)
- Tabla de audit_logs (opcional)
- Errores front: console + tracking (fase 2)

---

## 9) Arquitectura (Supabase-centric)
### 9.1 Componentes
- **Frontend PWA**
  - React/Next.js o React + Vite (recomendado por PWA sencilla)
  - Tailwind (opcional)
  - Supabase JS Client
- **Backend**
  - Supabase Postgres (DB)
  - Supabase Auth (usuarios)
  - RLS Policies
  - Edge Functions (opcional: cálculos complejos, export, recordatorios)
- **Storage** (fase 2)
  - Adjuntos de observaciones (fotos, PDFs)

---

## 10) Modelo de Datos (Postgres / Supabase)
> Diseño pensado para multi-tenant simple: cada registro pertenece a un `owner_id` (usuario).

### 10.1 Tablas
#### `profiles`
Extiende auth.users.
- `id` (uuid, PK, = auth.users.id)
- `full_name` (text)
- `role` (text: admin|collector)
- `created_at`

#### `clients`
- `id` (uuid, PK)
- `owner_id` (uuid, FK -> profiles.id)
- `first_name` (text)
- `last_name` (text)
- `document_id` (text, nullable, index)
- `phone` (text, index)
- `address` (text, nullable)
- `status` (text: active|inactive)
- `notes` (text, nullable)
- `is_deleted` (bool default false)
- `created_at`, `updated_at`

Índices:
- `(owner_id, phone)`
- `(owner_id, document_id)`
- búsqueda por nombre: usar `pg_trgm` (fase 2) o búsqueda simple con ilike.

#### `loans`
- `id` (uuid, PK)
- `owner_id` (uuid)
- `client_id` (uuid, FK clients.id)
- `principal_amount` (numeric(12,2))
- `interest_type` (text: simple|flat|custom)
- `interest_rate` (numeric(8,5))  // ej 0.05
- `interest_rate_period` (text: daily|weekly|biweekly|monthly)
- `payment_frequency` (text: daily|weekly|biweekly|monthly)
- `term_count` (int)
- `disbursement_date` (date)
- `first_due_date` (date)
- `next_due_date` (date) // autocalculada
- `grace_days` (int default 0)
- `late_fee_type` (text: none|fixed|percent)
- `late_fee_value` (numeric(12,2) default 0)
- `status` (text: draft|active|overdue|paid|defaulted)
- `total_expected` (numeric(12,2)) // denormalizado para performance
- `total_paid` (numeric(12,2))     // denormalizado
- `balance` (numeric(12,2))        // denormalizado
- `notes` (text, nullable)
- `is_deleted` (bool default false)
- `created_at`, `updated_at`

Índices:
- `(owner_id, client_id)`
- `(owner_id, status)`
- `(owner_id, next_due_date)`

#### `payments`
- `id` (uuid, PK)
- `owner_id` (uuid)
- `loan_id` (uuid, FK loans.id)
- `payment_date` (date)
- `amount` (numeric(12,2))
- `method` (text: cash|transfer|other)
- `note` (text, nullable)
- `is_void` (bool default false)
- `created_at`, `updated_at`

Índices:
- `(owner_id, loan_id, payment_date)`

#### `notes` (observaciones / bitácora)
- `id` (uuid, PK)
- `owner_id` (uuid)
- `client_id` (uuid, nullable)
- `loan_id` (uuid, nullable)
- `type` (text: call|visit|promise|incident|other)
- `content` (text)
- `created_by` (uuid)
- `created_at`

Regla: `client_id` o `loan_id` debe existir (check constraint).

---

## 11) Lógica de Cálculo y Consistencia (Triggers / RPC)
Para evitar inconsistencias, define una sola fuente de verdad para cálculos.

### Enfoque recomendado MVP
- Guardar denormalizados en `loans`: `total_expected`, `total_paid`, `balance`, `next_due_date`, `status`.
- Al insertar/editar/anular pagos → recalcular en DB.

### Opciones técnicas
**Opción A (recomendada):** Postgres functions + triggers
- Trigger on `payments` (insert/update/is_void)
- Recalcula `total_paid` y `balance`
- Actualiza `status` (paid si balance <= 0, overdue si fecha vencida y balance > 0)
- Actualiza `next_due_date` (según `payment_frequency` y última fecha pagada o calendario simple)

**Opción B:** Edge Function “recompute_loan(loan_id)”
- Se llama desde el frontend después de cambios
- Más fácil de iterar, pero dependes de red (menos ideal offline)

> MVP: A si quieres robustez. B si quieres rapidez inicial.

---

## 12) RLS (Row Level Security) — Obligatorio
Política base: cada tabla con `owner_id = auth.uid()`.

Ejemplos (conceptual):
- **SELECT**: permitir si `owner_id = auth.uid()`
- **INSERT**: forzar `owner_id = auth.uid()`
- **UPDATE/DELETE**: permitir si `owner_id = auth.uid()`

Además:
- Validar que `clients.owner_id` y `loans.owner_id` coincidan.
- Para rol cobrador (fase 2): tabla `loan_assignments` o campo `collector_id`.

---

## 13) UX / UI (Mobile-first)
### Navegación (bottom nav recomendado)
- Inicio (Resumen)
- Clientes
- Cobranza
- Reportes
- Ajustes

### Pantallas MVP
1. **Login**
2. **Dashboard**
   - Cartera total
   - Cobros hoy
   - En mora
3. **Clientes (lista + búsqueda)**
4. **Cliente (detalle)**
   - Préstamos
   - Pagos recientes
   - Observaciones
5. **Préstamo (detalle)**
   - Condiciones
   - Estado + saldo
   - Historial de pagos
   - Botón “Registrar pago”
6. **Registrar pago (form)**
7. **Cobranza**
   - Tabs: hoy / próximos / mora
8. **Reportes (básico + export)**

### Accesibilidad / uso en campo
- Botones grandes
- Inputs numéricos con keypad
- Confirmaciones claras (anular pago, cerrar préstamo)
- Estados con etiquetas (chips)

---

## 14) PWA — Requisitos Técnicos
- `manifest.json` con:
  - name/short_name
  - icons (192/512)
  - start_url
  - display: standalone
  - theme_color/background_color
- Service Worker:
  - Cache de assets estáticos
  - Estrategia:
    - App shell: cache-first
    - API Supabase: network-first (fallback a cache si aplica)
- Offline (MVP mínimo):
  - Permitir abrir app y ver última data consultada (cache)
  - Mostrar banner “Sin conexión”
- (Fase 2) Cola offline:
  - guardar pagos localmente (IndexedDB)
  - sync cuando vuelva internet

---

## 15) APIs / Integraciones
### Supabase (cliente JS)
- `from('clients').select()...`
- `from('loans').insert()...`
- `from('payments').insert()...`
- RPC:
  - `recompute_loan(loan_id uuid)` (si usas triggers/RPC)
  - `get_collections(date_from, date_to)` para vista cobranza (optimización)

---

## 16) Validaciones y Edge Cases
- Pago > saldo: permitir y dejar balance en 0 (registrar excedente como “saldo a favor” fase 2) o bloquear (define una regla).
- Edición de préstamo con pagos existentes:
  - bloquear campos críticos o recalcular con advertencia interna
- Borrado:
  - siempre soft delete
- Cliente con múltiples préstamos simultáneos
- Préstamos reestructurados (fase 2)
- Interés variable (fase 2)

---

## 17) Criterios de Aceptación (MVP)
- Puedo crear/editar cliente desde el móvil.
- Puedo crear un préstamo con interés y plazo personalizados.
- Al registrar un pago, el saldo baja correctamente y el estado cambia si corresponde.
- Puedo ver una lista de “en mora” y ordenar por días de mora.
- Puedo agregar observaciones a un cliente/préstamo.
- PWA instalable en Android/Chrome y usable en modo standalone.
- Datos protegidos por RLS (un usuario no ve datos de otro).

---

## 18) Definition of Done (DoD)
- CRUD completo con validaciones.
- RLS habilitado y probado (tests manuales mínimo).
- Manejo de errores y estados de carga.
- Responsivo (360px ancho mínimo).
- Lighthouse PWA: instalable, manifest válido, service worker activo.
- Backups/Export básico (CSV) o plan de respaldo documentado.

---

## 19) Plan de Entregas (Sprints sugeridos)
### Sprint 1 — Base
- Setup PWA + Auth Supabase
- Tablas + RLS
- Clientes (CRUD)

### Sprint 2 — Préstamos
- Loans (CRUD)
- Cálculos base (total_expected, balance)
- Detalle préstamo

### Sprint 3 — Pagos
- Payments (CRUD + anular)
- Recompute (trigger/RPC)
- Vistas: cobros hoy/próximos

### Sprint 4 — Mora + Reportes
- Vista mora
- Reportes básicos
- Export CSV
- Pulido mobile + offline parcial

---

## 20) Riesgos y Mitigaciones
- **Cálculos ambiguos de interés** → fijar reglas MVP claras y parametrizables.
- **Offline real** complejo → iniciar con offline parcial (cache lectura), cola en fase 2.
- **Edición retroactiva** (pagos o préstamos) → auditoría y soft delete + recalcular.
- **RLS mal configurado** → checklist de pruebas y políticas mínimas por tabla.

---

## 21) Extensiones (Fase 2 / Roadmap)
- Roles cobrador y asignación de cartera
- Cronograma por cuotas (`installments`)
- Notificaciones push (PWA) para cobros del día
- Adjuntos en observaciones (fotos/recibos)

- Dashboard avanzado + gráficos

---