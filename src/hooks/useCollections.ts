import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';

export type CollectionItem = {
    id: string;
    client_id: string;
    balance: number;
    total_expected: number;
    principal_amount: number;
    term_count: number;
    interest_type: 'simple' | 'flat' | 'custom';
    interest_rate: number;
    payment_frequency: string;
    next_due_date: string;
    status: string;
    clients: {
        first_name: string;
        last_name: string;
    };
};

export function useCollections() {
    const [todayCollections, setTodayCollections] = useState<CollectionItem[]>([]);
    const [overdueCollections, setOverdueCollections] = useState<CollectionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCollections = async () => {
        setLoading(true);
        try {
            await supabase.rpc('check_and_update_overdue_loans');
            const today = new Date().toLocaleDateString('en-CA');

            // Fetch Today's
            const { data: todayData, error: todayErr } = await supabase
                .from('loans')
                .select(`
                    id, client_id, balance, total_expected, principal_amount, term_count, 
                    interest_type, interest_rate, payment_frequency, next_due_date, status,
                    clients (id, first_name, last_name)
                `)
                .eq('next_due_date', today)
                .eq('is_deleted', false)
                .neq('status', 'paid');

            if (todayErr) throw todayErr;
            setTodayCollections(todayData as any || []);

            // Fetch Overdue
            const { data: overdueData, error: overdueErr } = await supabase
                .from('loans')
                .select(`
                    id, client_id, balance, total_expected, principal_amount, term_count, 
                    interest_type, interest_rate, payment_frequency, next_due_date, status,
                    clients (id, first_name, last_name)
                `)
                .eq('status', 'overdue')
                .eq('is_deleted', false);

            if (overdueErr) throw overdueErr;
            setOverdueCollections(overdueData as any || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    return { todayCollections, overdueCollections, loading, error, refresh: fetchCollections };
}
