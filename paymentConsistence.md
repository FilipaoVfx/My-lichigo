# Guía de Implementación: Consistencia de Datos en Pagos

## Resumen Ejecutivo

Este documento detalla la implementación de consistencia de datos robusta para el registro de pagos, incluyendo actualizaciones dinámicas en tiempo real y manejo de pagos de solo interés.

## Problemas Actuales Identificados

### 1. Falta de Actualización Automática
La función `addPayment` en `usePayments.ts` solo inserta registros de pagos sin actualizar campos relacionados del préstamo [1](#2-0) .

### 2. No Distinción de Tipos de Pago
El sistema no diferencia entre pagos de capital e interés, tratando todos los montos como reducción del balance principal.

## Solución Propuesta

### Fase 1: Modificaciones al Schema

#### 1.1 Actualizar Tabla `payments`
```sql
-- Agregar campo para tipo de pago
ALTER TABLE payments 
ADD COLUMN payment_type text DEFAULT 'principal' 
CHECK (payment_type IN ('principal', 'interest_only', 'mixed'));

-- Agregar campos para pagos mixtos
ALTER TABLE payments 
ADD COLUMN principal_amount numeric(12,2),
ADD COLUMN interest_amount numeric(12,2);
```

#### 1.2 Actualizar Tipos en Frontend
```typescript
// En src/types/loan.ts o nuevo archivo types/payment.ts
export interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_type: 'principal' | 'interest_only' | 'mixed';
  principal_amount?: number;
  interest_amount?: number;
  method: 'cash' | 'transfer' | 'other';
  note?: string;
  // ... otros campos existentes
}
```

### Fase 2: Implementación de Trigger en PostgreSQL

#### 2.1 Función de Recálculo
```sql
CREATE OR REPLACE FUNCTION recompute_loan_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  loan_record RECORD;
  new_balance numeric;
  new_total_paid numeric;
  new_next_due_date date;
BEGIN
  -- Obtener datos del préstamo
  SELECT * INTO loan_record 
  FROM loans 
  WHERE id = NEW.loan_id;
  
  -- Calcular nuevo total pagado (excluyendo pagos void)
  SELECT COALESCE(SUM(amount), 0) INTO new_total_paid
  FROM payments 
  WHERE loan_id = NEW.loan_id 
  AND is_void = false;
  
  -- Determinar impacto en balance según tipo de pago
  IF NEW.payment_type = 'interest_only' THEN
    -- No afecta balance principal
    new_balance := loan_record.balance;
  ELSIF NEW.payment_type = 'mixed' THEN
    -- Reducir solo la parte principal
    new_balance := loan_record.balance - NEW.principal_amount;
  ELSE
    -- Pago principal completo
    new_balance := loan_record.balance - NEW.amount;
  END IF;
  
  -- Actualizar préstamo
  UPDATE loans SET
    total_paid = new_total_paid,
    balance = GREATEST(0, new_balance),
    updated_at = NOW()
  WHERE id = NEW.loan_id;
  
  -- Actualizar estado si corresponde
  IF new_balance <= 0 THEN
    UPDATE loans SET status = 'paid' WHERE id = NEW.loan_id;
  END IF;
  
  -- Calcular próxima fecha de pago solo para pagos principales
  IF NEW.payment_type != 'interest_only' AND new_balance > 0 THEN
    new_next_due_date := calculate_next_due_date(
      loan_record.payment_frequency,
      NEW.payment_date
    );
    UPDATE loans SET next_due_date = new_next_due_date WHERE id = NEW.loan_id;
  END IF;
  
  -- Registrar en bitácora si es pago de interés
  IF NEW.payment_type = 'interest_only' THEN
    INSERT INTO notes (
      loan_id,
      type,
      content,
      created_by,
      owner_id
    ) VALUES (
      NEW.loan_id,
      'interest_payment',
      'Abono de interés: $' || NEW.amount,
      NEW.created_by,
      NEW.owner_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 2.2 Crear Trigger
```sql
CREATE TRIGGER trigger_payment_insert
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION recompute_loan_after_payment();

CREATE TRIGGER trigger_payment_update
AFTER UPDATE ON payments
FOR EACH ROW
WHEN (OLD.is_void != NEW.is_void)
EXECUTE FUNCTION recompute_loan_after_payment();
```

#### 2.3 Función Auxiliar para Fechas
```sql
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  frequency text,
  current_date date
) RETURNS date AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN RETURN current_date + INTERVAL '1 day';
    WHEN 'weekly' THEN RETURN current_date + INTERVAL '1 week';
    WHEN 'biweekly' THEN RETURN current_date + INTERVAL '2 weeks';
    WHEN 'monthly' THEN RETURN current_date + INTERVAL '1 month';
    ELSE RETURN current_date;
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

### Fase 3: Actualizaciones en Frontend

#### 3.1 Modificar `usePayments.ts`
```typescript
export function usePayments() {
  const addPayment = async (paymentData: {
    loan_id: string;
    amount: number;
    payment_type: 'principal' | 'interest_only' | 'mixed';
    principal_amount?: number;
    interest_amount?: number;
    method: 'cash' | 'transfer' | 'other';
    note?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          owner_id: user.id,
          created_by: user.id,
          payment_date: new Date().toLocaleDateString('en-CA')
        }])
        .select()
        .single();

      if (error) throw error;
      
      // El trigger actualiza automáticamente el préstamo
      // No es necesario llamar a fetchLoans()
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding payment:', err);
      return { data: null, error: err.message };
    }
  };
  
  return { addPayment };
}
```

#### 3.2 Actualizar Modal de Pago
El modal en `ClientDetail.tsx` debe incluir:
- Selector de tipo de pago
- Campos separados para capital/interés si es mixto
- Validación según tipo seleccionado

## Pasos de Implementación

### 1. Preparación de Base de Datos
1. Crear backup de la base de datos
2. Ejecutar migraciones del schema en ambiente de desarrollo
3. Probar con datos de muestra

### 2. Implementación del Backend
1. Crear funciones PostgreSQL en orden:
   - `calculate_next_due_date`
   - `recompute_loan_after_payment`
2. Crear triggers
3. Actualizar políticas RLS si es necesario

### 3. Actualización del Frontend
1. Modificar tipos TypeScript
2. Actualizar `usePayments.ts`
3. Modificar componente de modal de pago
4. Actualizar vistas que muestran pagos

### 4. Pruebas y Validación
1. Pruebas unitarias de la función de recálculo
2. Pruebas de integración E2E
3. Validación de auditoría
4. Pruebas de rendimiento

## Consideraciones de Auditoría

### 1. Trazabilidad
- Todos los cambios se registran en `notes` para pagos de interés
- El trigger mantiene un log implícito through timestamps
- Los pagos void se manejan con `is_void` en lugar de DELETE

### 2. Consistencia
- El trigger garantiza atomicidad en las operaciones
- Los campos denormalizados (`balance`, `total_paid`) siempre están sincronizados
- El estado del préstamo se actualiza automáticamente

### 3. Validaciones
- El trigger incluye validaciones de negocio
- Los checks en la base de datos previenen datos inválidos
- El frontend valida antes de enviar

## Notas

Esta implementación sigue las recomendaciones del PRD para usar triggers como fuente única de verdad [2](#2-1)  y aprovecha la estructura existente de la tabla `notes` para la bitácora<cite repo="Filipao

Wiki pages you might want to explore:
- [Database Schema (FilipaoVfx/My-lichigo)](/wiki/FilipaoVfx/My-lichigo#3.2)

### Citations

**File:** src/hooks/usePayments.ts (L4-31)
```typescript
    const addPayment = async (paymentData: {
        loan_id: string;
        amount: number;
        method: 'cash' | 'transfer' | 'other';
        note?: string;
    }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { data, error } = await supabase
                .from('payments')
                .insert([{
                    ...paymentData,
                    owner_id: user.id,
                    created_by: user.id,
                    payment_date: new Date().toLocaleDateString('en-CA')
                }])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            console.error('Error adding payment:', err);
            return { data: null, error: err.message };
        }
    };
```

**File:** prd.md (L343-361)
```markdown
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
```
