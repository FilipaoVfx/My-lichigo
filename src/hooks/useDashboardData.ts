import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';

export function useDashboardData() {
    const [stats, setStats] = useState({
        activePortfolio: 0,
        overdueAmount: 0,
        overdueCount: 0,
    });
    const [collectionsToday, setCollectionsToday] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // First, update all loans that have fallen into overdue status
            await supabase.rpc('check_and_update_overdue_loans');

            // Get local date in YYYY-MM-DD format instead of UTC to avoid tonight's mismatch
            const today = new Date().toLocaleDateString('en-CA');

            // 1. Fetch Today's Collections
            const { data: collections, error: collError } = await supabase
                .from('loans')
                .select(`
                    id, 
                    balance, 
                    total_expected, 
                    principal_amount, 
                    term_count,
                    payment_frequency,
                    clients (first_name, last_name)
                `)
                .eq('next_due_date', today)
                .eq('is_deleted', false)
                .neq('status', 'paid');

            if (collError) throw collError;
            setCollectionsToday(collections || []);

            // 2. Fetch Stats
            const { data: loans, error: statsError } = await supabase
                .from('loans')
                .select('balance, status')
                .eq('is_deleted', false)
                .neq('status', 'paid');

            if (statsError) throw statsError;

            const newStats = (loans || []).reduce((acc, loan) => {
                acc.activePortfolio += Number(loan.balance);
                if (loan.status === 'overdue') {
                    acc.overdueAmount += Number(loan.balance);
                    acc.overdueCount += 1;
                }
                return acc;
            }, { activePortfolio: 0, overdueAmount: 0, overdueCount: 0 });

            setStats(newStats);

        } catch (err: any) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return { stats, collectionsToday, loading, error, refresh: fetchData };
}
