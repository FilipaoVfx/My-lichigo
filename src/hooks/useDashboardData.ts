import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';

export function useDashboardData() {
    const [stats, setStats] = useState({
        activePortfolio: 0,
        overdueAmount: 0,
        overdueCount: 0,
    });
    const [upcomingCollections, setUpcomingCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // First, update all loans that have fallen into overdue status
            await supabase.rpc('check_and_update_overdue_loans');

            const today = new Date().toLocaleDateString('en-CA');

            // 1. Fetch Upcoming Collections (Next 5 days)
            const fiveDaysFromNow = new Date();
            fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
            const endDate = fiveDaysFromNow.toLocaleDateString('en-CA');

            const { data: collections, error: collError } = await supabase
                .from('loans')
                .select(`
                    id, 
                    balance, 
                    total_expected, 
                    principal_amount, 
                    term_count,
                    next_due_date,
                    payment_frequency,
                    clients (id, first_name, last_name)
                `)
                .gte('next_due_date', today)
                .lte('next_due_date', endDate)
                .eq('is_deleted', false)
                .neq('status', 'paid')
                .order('next_due_date', { ascending: true });

            if (collError) throw collError;
            setUpcomingCollections(collections || []);

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

    return { stats, upcomingCollections, loading, error, refresh: fetchData };
}
