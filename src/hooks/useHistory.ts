import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.ts';

export interface ActivityEntry {
    id: string;
    type: 'payment' | 'note' | 'loan_created' | 'interest_payment' | 'partial_payment';
    date: string;
    amount?: number;
    content?: string;
    client_name: string;
    loan_id?: string;
    client_id: string;
    metadata?: any;
}

export function useHistory() {
    const [activities, setActivities] = useState<ActivityEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchHistory = useCallback(async (filters?: { client_id?: string }) => {
        setLoading(true);
        try {
            // Fetch Payments
            const paymentsSelect = `
                id,
                payment_date,
                amount,
                payment_type,
                note,
                loan_id,
                loans${filters?.client_id ? '!inner' : ''} (
                    client_id,
                    clients (first_name, last_name)
                )
            `;

            let paymentsQuery = supabase
                .from('payments')
                .select(paymentsSelect)
                .eq('is_void', false);

            if (filters?.client_id) {
                paymentsQuery = paymentsQuery.eq('loans.client_id', filters.client_id);
            }

            paymentsQuery = paymentsQuery.order('payment_date', { ascending: false });

            const { data: paymentsData, error: paymentsError } = await paymentsQuery;
            if (paymentsError) throw paymentsError;

            // Fetch Notes
            let notesQuery = supabase
                .from('notes')
                .select(`
                    id,
                    created_at,
                    type,
                    content,
                    loan_id,
                    client_id,
                    clients (first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            if (filters?.client_id) {
                notesQuery = notesQuery.eq('client_id', filters.client_id);
            }

            const { data: notesData, error: notesError } = await notesQuery;
            if (notesError) throw notesError;

            // Combine and format
            const combined: ActivityEntry[] = [
                ...(paymentsData || []).map((p: any) => ({
                    id: p.id,
                    type: (p.payment_type === 'interest_only' ? 'interest_payment' : p.payment_type === 'mixed' ? 'partial_payment' : 'payment') as ActivityEntry['type'],
                    date: p.payment_date,
                    amount: p.amount,
                    content: p.note,
                    client_name: p.loans ? `${p.loans.clients.first_name} ${p.loans.clients.last_name}` : 'Unknown',
                    loan_id: p.loan_id,
                    client_id: p.loans?.client_id
                })),
                ...(notesData || []).map((n: any) => ({
                    id: n.id,
                    type: 'note' as ActivityEntry['type'],
                    date: n.created_at.split('T')[0],
                    content: n.content,
                    client_name: n.clients ? `${n.clients.first_name} ${n.clients.last_name}` : 'Unknown',
                    loan_id: n.loan_id,
                    client_id: n.client_id,
                    metadata: { note_type: n.type }
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setActivities(combined);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { activities, loading, fetchHistory };
}
