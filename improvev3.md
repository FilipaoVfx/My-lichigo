Como Ingeniero de Requerimientos experto, he analizado la "Guía de Implementación: Consistencia de Datos en Pagos" proporcionada. A continuación, presento el levantamiento formal de requerimientos, el análisis de dependencias y las pautas estratégicas para el Liderazgo Técnico.

---

### 1. Especificación de Requerimientos (Estructurada)

#### A. Requerimientos Funcionales (RF)

| ID | Requerimiento | Descripción | Prioridad |
| --- | --- | --- | --- |
| **RF-01** | **Categorización de Pagos** | El sistema debe permitir clasificar cada pago como: `principal` (capital), `interest_only` (solo interés) o `mixed` (mixto). | Alta |
| **RF-02** | **Desglose de Montos** | En pagos de tipo `mixed`, el sistema debe capturar por separado el monto destinado a capital y el destinado a intereses. | Alta |
| **RF-03** | **Recálculo Automático de Saldo** | Al insertar un pago, el `balance` del préstamo debe actualizarse automáticamente restando solo la porción de capital (según el tipo de pago). | Crítica |
| **RF-04** | **Actualización de Estatus** | El sistema debe cambiar el estado del préstamo a `paid` (pagado) automáticamente cuando el balance llegue a cero. | Media |
| **RF-05** | **Gestión de Fecha de Vencimiento** | El sistema debe proyectar la `next_due_date` basándose en la frecuencia del préstamo (`daily`, `weekly`, etc.) tras un pago que afecte al capital. | Alta |
| **RF-06** | **Bitácora de Intereses** | Los abonos de tipo `interest_only` deben generar automáticamente una entrada en la tabla `notes` para fines de auditoría. | Baja |
| **RF-07** | **Reversión por Anulación (Void)** | Al marcar un pago como `is_void`, el balance y el total pagado deben recalcularse para reflejar el estado anterior al pago. | Crítica |

#### B. Requerimientos No Funcionales (RNF)

| ID | Atributo | Especificación |
| --- | --- | --- |
| **RNF-01** | **Consistencia (ACID)** | Las actualizaciones de saldo y estados deben ocurrir dentro de una transacción atómica en la base de datos (vía Triggers) para evitar desfaces. |
| **RNF-02** | **Integridad de Datos** | La base de datos debe impedir tipos de pago no definidos mediante constraints de tipo CHECK a nivel de esquema. |
| **RNF-03** | **Trazabilidad** | El sistema debe conservar quién realizó el pago (`created_by`) y a quién pertenece el préstamo (`owner_id`) en cada registro. |
| **RNF-04** | **Robustez (Frontend)** | El cliente debe validar los montos antes del envío para asegurar que el pago mixto coincida con la suma de capital e interés. |

---

### 2. Identificación de Ambigüedades y Dependencias

Tras el análisis técnico, se identifican los siguientes puntos que requieren aclaración:

1. **Regla de Negocio para `next_due_date`:** ¿Qué sucede si un cliente realiza un pago parcial de capital? ¿La fecha de vencimiento se mueve a la siguiente instancia o permanece igual hasta completar la cuota? La función `calculate_next_due_date` actual actualiza la fecha con cualquier pago de capital.
2. **Pagos en Exceso:** ¿El sistema debe permitir pagos que superen el `balance` actual? Si es así, ¿el excedente se registra como "pago a favor" o se bloquea en el frontend?
3. **Dependencia del Trigger:** El frontend asume que el Trigger hará todo. **Riesgo:** Si hay un retraso en la propagación de datos (aunque sea Supabase), el usuario podría ver el saldo viejo por unos milisegundos. Se debe decidir si se implementa "Optimistic UI".
4. **Tipos de Interés:** En pagos `mixed`, ¿la base de datos debe validar que `amount = principal_amount + interest_amount`? (Falta un CONSTRAINT de validación aritmética).

---

### 3. Preguntas Clave para el Equipo/Cliente

1. **¿Existen intereses moratorios?** La lógica actual solo contempla abonos a interés ordinario. ¿Debería el tipo `interest_only` discriminar si es interés corriente o mora?
2. **¿Historial de cambios?** El trigger de UPDATE solo actúa cuando cambia `is_void`. Si se edita el *monto* de un pago ya existente, ¿se debe permitir o es preferible anular y crear uno nuevo?
3. **¿Frecuencias especiales?** La función `calculate_next_due_date` no maneja frecuencias como "quincenal" (biweekly) de forma estándar en todos los motores; hay que asegurar que el INTERVAL '2 weeks' sea el comportamiento esperado por el negocio.

---

### 4. Instrucciones para el Líder Técnico (Enfoque MVP y Tecnología)

Para garantizar una salida a producción (MVP) robusta utilizando el stack de **Supabase (PostgreSQL) + React/TypeScript**, siga estas directrices:

#### A. Arquitectura de Datos (Single Source of Truth)

* **Centralización en DB:** Mantenga la lógica de cálculo en los Triggers de PostgreSQL. Esto garantiza que si se agregan pagos vía API externa o panel de administración en el futuro, los balances siempre sean consistentes.
* **Prevención de Errores de Redondeo:** Asegúrese de que todos los campos de montos usen `numeric(12,2)` o superior. Nunca use `float` para transacciones financieras.

#### B. Pautas para el MVP

1. **Validación de Saldo en Backend:** Aunque el Trigger ajusta el saldo, añada una política RLS o un check adicional para evitar que un `principal_amount` sea mayor al balance del préstamo, evitando saldos negativos accidentales.
2. **Optimistic UI vs. Refetch:** En el MVP, para evitar complejidad, realice un `invalidateQueries` (si usa React Query) o un refetch manual del préstamo inmediatamente después de que `addPayment` retorne éxito.
3. **Manejo de Errores:** Capture específicamente el error del Trigger en el frontend. Si el trigger falla (por un CHECK constraint), el mensaje debe ser legible para el usuario (ej: "El monto del pago excede el saldo pendiente").

#### C. Tecnologías y Seguridad

* **PostgreSQL Functions:** Mueva la lógica de `calculate_next_due_date` a un esquema de "Shared Functions" para que pueda ser reutilizada por procesos de auditoría nocturnos.
* **Indexación:** Asegúrese de tener un índice en `payments(loan_id)` y `payments(payment_date)` para que el recálculo del `SUM(amount)` sea eficiente a medida que crezca la tabla.
* **RLS (Row Level Security):** Verifique que las políticas de Supabase permitan al Trigger hacer el `UPDATE` en la tabla `loans` incluso si el usuario autenticado solo tiene permisos de `INSERT` en `payments`. (Uso de `SECURITY DEFINER` en la función del trigger).

Este enfoque minimiza la deuda técnica al delegar la consistencia matemática al motor de base de datos, permitiendo que el frontend se mantenga ligero y enfocado en la experiencia de usuario.