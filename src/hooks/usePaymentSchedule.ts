import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.ts';

export type EstadoCuota = 'pendiente' | 'pagado' | 'vencido' | 'condonado' | 'parcial';

export interface CuotaPlan {
    id: string;
    owner_id: string;
    prestamo_id: string;
    numero_cuota: number;
    fecha_vencimiento: string;
    monto_cuota: number;
    monto_pagado: number;
    estado: EstadoCuota;
    fecha_pago: string | null;
    pago_id: string | null;
    dias_mora: number;
    cargo_mora: number;
    observaciones: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Helpers de generación de fechas ─────────────────────────────────────────
function sumarDias(fecha: Date, dias: number): Date {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
}
function sumarSemanas(fecha: Date, semanas: number): Date {
    return sumarDias(fecha, semanas * 7);
}
function sumarMeses(fecha: Date, meses: number): Date {
    const d = new Date(fecha);
    d.setMonth(d.getMonth() + meses);
    return d;
}

export function calcularFechaVencimiento(
    fechaInicio: Date,
    frecuencia: 'daily' | 'weekly' | 'biweekly' | 'monthly',
    indice: number
): Date {
    if (frecuencia === 'daily') return sumarDias(fechaInicio, indice);
    if (frecuencia === 'weekly') return sumarSemanas(fechaInicio, indice);
    if (frecuencia === 'biweekly') return sumarSemanas(fechaInicio, indice * 2);
    return sumarMeses(fechaInicio, indice);
}

// ─── Hook Principal ───────────────────────────────────────────────────────────
export function usePaymentSchedule(prestamoId: string) {
    const [cuotas, setCuotas] = useState<CuotaPlan[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cargarCuotas = useCallback(async () => {
        if (!prestamoId) return;
        setCargando(true);
        try {
            const { data, error } = await supabase
                .from('cuotas_plan')
                .select('*')
                .eq('prestamo_id', prestamoId)
                .order('numero_cuota', { ascending: true });

            if (error) throw error;
            setCuotas((data as CuotaPlan[]) || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }, [prestamoId]);

    useEffect(() => {
        cargarCuotas();
    }, [cargarCuotas]);

    // Genera e inserta el cronograma completo para un préstamo nuevo
    const generarCronograma = useCallback(async (params: {
        prestamo_id: string;
        fecha_primer_vencimiento: string;
        frecuencia: 'daily' | 'weekly' | 'biweekly' | 'monthly';
        numero_cuotas: number;
        monto_total: number;
    }) => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error('Usuario no autenticado');
            if (params.numero_cuotas <= 0) throw new Error('El número de cuotas debe ser mayor a 0');

            const fechaInicio = new Date(params.fecha_primer_vencimiento);
            const baseCuota = Math.round(params.monto_total / params.numero_cuotas);
            const sumatoriaBase = baseCuota * (params.numero_cuotas - 1);
            const lastCuota = params.monto_total - sumatoriaBase;

            const cuotas = Array.from({ length: params.numero_cuotas }, (_, i) => {
                const fechaVenc = calcularFechaVencimiento(fechaInicio, params.frecuencia, i);
                const hoy = new Date();
                const estado: EstadoCuota = fechaVenc < hoy ? 'vencido' : 'pendiente';
                const monto_cuota = (i === params.numero_cuotas - 1) ? lastCuota : baseCuota;

                return {
                    owner_id: user.id,
                    prestamo_id: params.prestamo_id,
                    numero_cuota: i + 1,
                    fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
                    monto_cuota: monto_cuota,
                    monto_pagado: 0,
                    estado,
                    created_by: user.id,
                };
            });

            const { error } = await supabase
                .from('cuotas_plan')
                .upsert(cuotas, { onConflict: 'prestamo_id,numero_cuota' });

            if (error) throw error;
            await cargarCuotas();
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    }, [cargarCuotas]);

    // Marcar/desmarcar una cuota como pagada
    const toggleEstadoCuota = useCallback(async (cuotaId: string, estadoActual: EstadoCuota) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuario no autenticado');

            const cuotaToUpdate = cuotas.find(c => c.id === cuotaId);
            if (!cuotaToUpdate) throw new Error('Cuota no encontrada');

            const nuevoEstado: EstadoCuota = estadoActual === 'pagado' ? 'pendiente' : 'pagado';

            if (nuevoEstado === 'pagado') {
                const amountNeeded = cuotaToUpdate.monto_cuota - (cuotaToUpdate.monto_pagado || 0);
                if (amountNeeded > 0) {
                    const { error: rpcError } = await supabase.rpc('register_loan_payment', {
                        p_loan_id: cuotaToUpdate.prestamo_id,
                        p_amount: amountNeeded,
                        p_payment_type: 'principal',
                        p_principal_amount: amountNeeded,
                        p_interest_amount: 0,
                        p_method: 'cash',
                        p_note: `Pago de Cuota #${cuotaToUpdate.numero_cuota} (Auto)`,
                        p_owner_id: user.id,
                        p_created_by: user.id,
                        p_target_cuota_id: cuotaToUpdate.id
                    });
                    if (rpcError) throw rpcError;
                }
            } else if (nuevoEstado === 'pendiente' && cuotaToUpdate.pago_id) {
                // If marked as pending, we delete the payment. 
                // The new DB trigger trigger_payment_deleted automatically resets the cuota.
                const { error: deleteError } = await supabase.from('payments').delete().eq('id', cuotaToUpdate.pago_id);
                if (deleteError) throw deleteError;
            }

            // The DB triggers handle updating tables, we just refetch
            await cargarCuotas();
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    }, [cuotas, cargarCuotas]);

    // Actualizar observaciones de una cuota
    const actualizarObservaciones = useCallback(async (cuotaId: string, observaciones: string) => {
        try {
            const { error } = await supabase
                .from('cuotas_plan')
                .update({ observaciones, updated_at: new Date().toISOString() })
                .eq('id', cuotaId);

            if (error) throw error;
            setCuotas(prev => prev.map(c => c.id === cuotaId ? { ...c, observaciones } : c));
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    }, []);

    // Marcar cuota como condonada
    const condonarCuota = useCallback(async (cuotaId: string) => {
        try {
            const { error } = await supabase
                .from('cuotas_plan')
                .update({ estado: 'condonado', updated_at: new Date().toISOString() })
                .eq('id', cuotaId);

            if (error) throw error;
            setCuotas(prev => prev.map(c => c.id === cuotaId ? { ...c, estado: 'condonado' } : c));
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    }, []);

    // Stats del plan
    const estadisticas = {
        total: cuotas.length,
        pagadas: cuotas.filter(c => c.estado === 'pagado').length,
        pendientes: cuotas.filter(c => c.estado === 'pendiente').length,
        vencidas: cuotas.filter(c => c.estado === 'vencido').length,
        condonadas: cuotas.filter(c => c.estado === 'condonado').length,
        montoPagado: cuotas.reduce((s, c) => s + (c.monto_pagado || 0), 0),
        montoPendiente: cuotas.reduce((s, c) => s + (c.estado !== 'condonado' ? Math.max(0, c.monto_cuota - (c.monto_pagado || 0)) : 0), 0),
        progreso: cuotas.length > 0 ? Math.round((cuotas.filter(c => c.estado === 'pagado').length / cuotas.length) * 100) : 0,
    };

    const borrarCronograma = useCallback(async () => {
        try {
            if (!prestamoId) return;
            const { error } = await supabase
                .from('cuotas_plan')
                .delete()
                .eq('prestamo_id', prestamoId);

            if (error) throw error;
            setCuotas([]);
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    }, [prestamoId]);

    return {
        cuotas,
        cargando,
        error,
        estadisticas,
        cargarCuotas,
        generarCronograma,
        borrarCronograma,
        toggleEstadoCuota,
        actualizarObservaciones,
        condonarCuota,
    };
}
