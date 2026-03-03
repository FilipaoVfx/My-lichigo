import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.ts';

export interface TimelineEntry {
    id: string;
    loan_id: string;
    created_at: string;
    entry_type: 'payment' | 'note';
    amount: number;
    payment_method: string | null;
    content: string | null;
    is_void: boolean;
    balance_after: number | null;
    created_by: string;
    created_by_name: string | null;
    created_by_role: string | null;
}

export function useTimeline(loanId: string) {
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTimeline = useCallback(async () => {
        if (!loanId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_timeline')
                .select('*')
                .eq('loan_id', loanId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTimeline(data as TimelineEntry[]);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching timeline:', err);
        } finally {
            setLoading(false);
        }
    }, [loanId]);

    const voidPayment = async (paymentId: string) => {
        try {
            const { error } = await supabase
                .from('payments')
                .update({ is_void: true })
                .eq('id', paymentId);

            if (error) throw error;
            await fetchTimeline();
            return { error: null };
        } catch (err: any) {
            console.error('Error voiding payment:', err);
            return { error: err.message };
        }
    };

    return { timeline, loading, error, fetchTimeline, voidPayment };
}
