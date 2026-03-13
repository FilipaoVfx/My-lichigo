import { supabase } from '../lib/supabase.ts';

export function usePayments() {
    const addPayment = async (paymentData: {
        loan_id: string;
        amount: number;
        method: 'cash' | 'transfer' | 'other';
        note?: string;
    }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // 1. Insert the payment record first
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
            const paymentId = data.id;

            // 2. Fetch pending/overdue cuotas to apply cascade amortisation
            const { data: pendingCuotas, error: fetchError } = await supabase
                .from('cuotas_plan')
                .select('*')
                .eq('prestamo_id', paymentData.loan_id)
                .in('estado', ['pendiente', 'vencido'])
                .order('numero_cuota', { ascending: true });

            if (fetchError) throw fetchError;

            // 3. Distribute payment across pending cuotas
            let remainingAmount = paymentData.amount;
            const updates = [];

            if (pendingCuotas && pendingCuotas.length > 0) {
                for (let cuota of pendingCuotas) {
                    if (remainingAmount <= 0) break;

                    const amountNeeded = cuota.monto_cuota - (cuota.monto_pagado || 0);
                    let payAmount = 0;
                    let nuevoEstado = cuota.estado;

                    if (remainingAmount >= amountNeeded) {
                        payAmount = amountNeeded;
                        remainingAmount -= amountNeeded;
                        nuevoEstado = 'pagado';
                    } else {
                        payAmount = remainingAmount;
                        remainingAmount = 0;
                        // State remains same, just partial payment
                    }

                    const newMontoPagado = (cuota.monto_pagado || 0) + payAmount;
                    updates.push({
                        ...cuota,
                        monto_pagado: newMontoPagado,
                        estado: nuevoEstado,
                        fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString().split('T')[0] : cuota.fecha_pago,
                        pago_id: nuevoEstado === 'pagado' ? paymentId : cuota.pago_id,
                        updated_at: new Date().toISOString(),
                    });
                }

                // Perform batch update using upsert
                if (updates.length > 0) {
                    const { error: upsertError } = await supabase.from('cuotas_plan').upsert(updates);
                    if (upsertError) {
                        console.error("Warning: Payment registered but cascade update failed:", upsertError);
                    }
                }
            }

            return { data, error: null };
        } catch (err: any) {
            console.error('Error adding payment:', err);
            return { data: null, error: err.message };
        }
    };

    return { addPayment };
}

