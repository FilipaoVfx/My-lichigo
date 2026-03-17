````md
# PRD — Sistema de Notificaciones para Préstamos en Mora  
**Producto:** PWA Gestión de Préstamos  
**Arquitectura:** Supabase + Edge Functions + PWA  
**Objetivo:** Detectar automáticamente préstamos en mora y notificar a los prestamistas mediante notificaciones internas (in-app) y opcionalmente push web.

---

# 1. Problema
El prestamista necesita ser alertado cuando un préstamo entra en **estado de mora** para actuar rápidamente (cobranza, contacto con cliente, negociación).

Actualmente, depender solo del navegador para push notifications es poco confiable porque:

- el usuario puede bloquear notificaciones
- el navegador puede eliminar suscripciones
- la PWA puede no estar instalada
- el service worker puede fallar

Por eso el sistema debe tener una **fuente de verdad interna** de notificaciones.

---

# 2. Principios del diseño
El sistema se basa en 3 principios:

### 1. Backend detecta eventos
La lógica de mora vive en backend.

### 2. Las notificaciones se almacenan
Las alertas se guardan en una tabla `notifications`.

### 3. La PWA consume esas notificaciones
La app muestra alertas internas y opcionalmente envía push.

---

# 3. Arquitectura del sistema

```text
pg_cron
   │
   ▼
Edge Function: detect-overdue-loans
   │
   ▼
tabla notifications
   │
   ├─ PWA consulta o escucha realtime
   │
   └─ opcional: push notification
````

---

# 4. Modelo de datos

## Tabla notifications

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id),

  type text not null,

  title text not null,
  body text not null,

  entity_type text,
  entity_id uuid,

  channel text default 'in_app',

  status text default 'pending'
  check (status in ('pending','sent','read')),

  created_at timestamp with time zone default now(),
  read_at timestamp with time zone
);
```

---

## Índices

```sql
create index notifications_user_idx
on notifications(user_id);

create index notifications_status_idx
on notifications(status);

create index notifications_created_idx
on notifications(created_at);
```

---

# 5. Lógica de mora

Un préstamo entra en mora si:

```sql
balance > 0
AND
current_date > next_due_date + grace_days
```

---

# 6. Evitar duplicados

Solo debe existir **una notificación por préstamo por día**.

```sql
create unique index loan_overdue_unique
on notifications(entity_id, type, date(created_at))
where type = 'loan_overdue';
```

---

# 7. Edge Function: detect-overdue-loans

Responsabilidad:

1. Buscar préstamos en mora
2. Crear notificaciones
3. Evitar duplicados

---

## Ejemplo lógico

```ts
const overdueLoans = await db.query(`
SELECT
  loans.id,
  loans.owner_id,
  clients.first_name,
  clients.last_name
FROM loans
JOIN clients ON clients.id = loans.client_id
WHERE loans.balance > 0
AND CURRENT_DATE > loans.next_due_date + loans.grace_days
`);
```

---

## Insertar notificación

```ts
await db.insert("notifications", {
  user_id: loan.owner_id,
  type: "loan_overdue",
  title: "Cliente en mora",
  body: `${loan.first_name} ${loan.last_name} tiene un préstamo vencido`,
  entity_type: "loan",
  entity_id: loan.id
});
```

---

# 8. Programar ejecución automática

Usar `pg_cron` en Supabase.

## Job cada hora

```sql
select
cron.schedule(
  'detect-overdue-loans',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_ID.supabase.co/functions/v1/detect-overdue-loans',
    headers := jsonb_build_object(
      'Content-Type','application/json'
    )
  );
  $$
);
```

---

# 9. Consumo desde la PWA

La PWA debe consultar notificaciones.

### Endpoint

```ts
const { data } = await supabase
.from("notifications")
.select("*")
.eq("user_id", user.id)
.eq("status", "pending")
.order("created_at", { ascending: false });
```

---

# 10. UI dentro de la app

## Componentes

### Campana de notificaciones

```text
🔔 3
```

### Lista de notificaciones

```text
Cliente en mora
Juan Pérez tiene un préstamo vencido
[Ver préstamo]
```

---

# 11. Marcar notificación como leída

```ts
await supabase
.from("notifications")
.update({
  status: "read",
  read_at: new Date()
})
.eq("id", notificationId);
```

---

# 12. Realtime (opcional)

Supabase permite escuchar inserts.

```ts
supabase
.channel("notifications")
.on(
  "postgres_changes",
  {
    event: "INSERT",
    schema: "public",
    table: "notifications"
  },
  payload => {
    showToast(payload.new.title);
  }
)
.subscribe();
```

---

# 13. Push notifications (opcional)

Si el usuario acepta push:

1. Guardar `PushSubscription`
2. Edge Function envía push
3. Service worker muestra notificación

Esto es un canal adicional, no el principal.

---

# 14. Reglas de negocio

### Frecuencia máxima

* máximo 1 notificación por préstamo por día

---

### Prioridad

Orden de notificaciones:

1. préstamos en mora
2. cobros del día
3. pagos recibidos

---

# 15. Estados de notificación

```text
pending
sent
read
```

---

# 16. Casos de uso

## Caso 1 — préstamo entra en mora

1. job ejecuta función
2. detecta mora
3. crea notificación
4. usuario ve alerta

---

## Caso 2 — usuario abre la app

1. consulta notificaciones
2. muestra campana
3. usuario revisa

---

## Caso 3 — usuario toca alerta

1. se abre detalle del préstamo
2. notificación se marca como leída

---

# 17. Escalabilidad

El sistema soporta fácilmente:

* 100 usuarios concurrentes
* miles de préstamos
* detección horaria o diaria

porque:

* el cálculo ocurre en backend
* las notificaciones se almacenan
* la PWA solo consume datos

---

# 18. Ventajas de este enfoque

✔ no depende del navegador
✔ auditable
✔ escalable
✔ extensible a email o WhatsApp
✔ desacoplado del frontend

---

# 19. Extensiones futuras

* notificaciones por WhatsApp
* recordatorios de pago
* resumen diario
* push mobile
* analytics de cobranza

---

# 20. Checklist de implementación

### Backend

* [ ] crear tabla notifications
* [ ] crear índices
* [ ] crear Edge Function
* [ ] configurar pg_cron
* [ ] validar duplicados

### Frontend

* [ ] campana de notificaciones
* [ ] lista de notificaciones
* [ ] marcar como leída
* [ ] deep link al préstamo
* [ ] soporte realtime

### Opcional

* [ ] push notifications
* [ ] email alerts
* [ ] WhatsApp alerts

```

