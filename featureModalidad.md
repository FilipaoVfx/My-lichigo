Como ingeniero de requisitos experto, entiendo que la complejidad de este sistema no reside en el CRUD básico, sino en la **combinatoria de reglas financieras y operativas** (el "motor de cálculo"). Un error aquí colapsa la confianza del prestamista y la integridad del balance.

A continuación, presento la **Especificación de Requisitos Robustos para el Motor de Modalidades de Préstamo**, estructurada para soportar la variabilidad técnica y operativa solicitada.

---

# Especificación de Requisitos: Motor de Modalidades y Lógica de Crédito

## 1. Identificación de Ambigüedades y Dependencias Críticas

* **Ambigüedad de Festivos:** En Colombia, los festivos (Ley Emiliani) mueven los cobros. El sistema debe decidir si "excluir" significa saltar el día o acumular el cobro al día siguiente.
* **Dependencia de Aplicación (Allocation):** Si un cliente debe mora, intereses y capital, el sistema debe ser riguroso en el orden de abono para evitar "descuadres" legales o contables.
* **Conflictos de Edición:** ¿Qué sucede si se edita la tasa de interés de un préstamo que ya tiene 5 pagos registrados? *Propuesta:* Bloqueo de edición y uso obligatorio de **Reestructuración**.

---

## 2. Requisitos Funcionales Detallados (Formato Estructurado)

### RF-01: Motor de Generación de Cronogramas (Scheduling Engine)

El sistema debe generar una proyección de cuotas basada en la modalidad elegida.

* **Requisito:** Soportar exclusión de domingos y festivos (Colombia) para modalidades "Gota a Gota".
* **Parámetros:** `start_date`, `frequency`, `term_count`, `exclude_holidays`.
* **Validación:** El sistema no debe permitir fechas de pago en el pasado al momento de la creación, a menos que sea un "préstamo migrado".

### RF-02: Política Universal de Aplicación de Pagos (Payment Waterfall)

Cualquier ingreso de dinero (`Payment`) debe procesarse mediante un algoritmo de cascada obligatorio:

1. **Nivel 1:** Gastos de Cobranza / Penalidades Fijas.
2. **Nivel 2:** Intereses de Mora acumulados.
3. **Nivel 3:** Intereses Corrientes de la cuota/período.
4. **Nivel 4:** Capital (Principal).

* *Nota:* El usuario Admin puede hacer un "Override" manual solo mediante el módulo de **Ajustes/Condonaciones**.

### RF-03: Gestión de Estados y Transiciones Automáticas

El sistema debe ejecutar un proceso (Job o Trigger) que evalúe el estado del préstamo cada 24 horas.

* **Active:** Saldo > 0 y fecha actual <= `next_due_date`.
* **Overdue:** Saldo > 0 y fecha actual > `next_due_date` + `grace_days`.
* **Paid:** Saldo <= 0.
* **Defaulted (Castigado):** Estado manual tras X días de mora.

---

## 3. Matriz de Casos de Uso Críticos (Escenarios de Borde)

| ID | Caso de Uso | Escenario Complejo | Resultado Esperado |
| --- | --- | --- | --- |
| **UC-L-01** | **Pago Adelantado** | Cliente paga 3 cuotas diarias hoy. | El sistema marca las 3 cuotas como pagadas y mueve la `next_due_date` a 4 días después. |
| **UC-L-02** | **Abono Parcial en Mora** | Cliente debe $50 (mora) + $100 (cuota). Paga $80. | Se cubren los $50 de mora y $30 del interés de la cuota. El préstamo sigue en `overdue`. |
| **UC-L-03** | **Cierre Anticipado** | Cliente quiere liquidar todo el préstamo hoy. | El sistema calcula `Capital Pendiente` + `Interés a la fecha` e ignora intereses futuros (Condonación automática). |

---

## 4. Preguntas para el Cliente / Equipo de Negocio

1. **Interés sobre Saldo vs. Flat:** ¿El prestamista cobra interés sobre lo que falta por pagar (bancario) o siempre sobre el monto inicial (informal)? Esto cambia drásticamente la base de datos.
2. **Redondeo:** En la cobranza de calle es vital redondear a $50 o $100 pesos. ¿Debemos forzar este redondeo en el motor de cálculo?
3. **Re-préstamos:** ¿Se permite "sumar" un préstamo nuevo a uno viejo, o siempre se deben cerrar de forma independiente?

---

# Instrucciones para el Líder Técnico (MVP de Alto Rigor)

Para implementar estas modalidades sin que el código se vuelva inmanejable, siga estas pautas:

### 1. Arquitectura del Motor (Strategy Pattern)

No uses un solo bloque de código para todos los préstamos. Implementa un **Patrón de Estrategia** donde cada modalidad (`DailyFlatStrategy`, `MonthlyAmortizedStrategy`) sea una clase/función independiente que reciba parámetros y devuelva un cronograma.

### 2. Base de Datos: El "Ledger" Inmutable

* **No confíes en el campo `balance`:** El balance debe ser una propiedad calculada o una columna que se actualiza mediante un **Trigger de Postgres** basado en la tabla de transacciones.
* **Tabla de `Charges` (Cargos):** Implementa una tabla donde se registren automáticamente los cargos por mora. No sumes la mora directamente al capital; mantenla separada para reportes de rentabilidad.
* **Idempotencia:** En la PWA, cada pago enviado desde el móvil debe llevar un `client_generated_id` (UUID) para evitar duplicados si el cobrador presiona "Pagar" dos veces en una zona de mala señal.

### 3. Pautas Clave para el MVP

* **Holidays API:** Integra una función simple que contenga los festivos de Colombia para los próximos 2 años. Es un "quick win" que genera mucha confianza en el prestamista.
* **Cierre de Día:** Implementa un proceso que "congele" la foto del día (Cartera activa, cobrado, vencido). Esto es vital para el reporte de flujo de caja.
* **Offline Parcial:** Para el MVP, permite el registro de pagos offline guardando un log local (`IndexedDB`) que se sincronice mediante una **Edge Function** de Supabase al detectar red.

### 4. Stack Técnico Específico

* **Cálculos numéricos:** Usa `decimal.js` o `big.js` en el frontend para evitar errores de precisión de punto flotante de JavaScript (ej. 0.1 + 0.2 != 0.3).
* **Supabase RPC:** Mueve la lógica de "Recalcular Préstamo" a una función `RPC` en Postgres (PL/pgSQL). Es mucho más rápido y seguro que traer todos los datos al móvil para calcularlos.