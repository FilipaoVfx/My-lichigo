import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import type { Loan } from '../types/loan.ts';

export function useLoans(clientId: string) {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('client_id', clientId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLoans(data as Loan[]);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching loans:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) {
            fetchLoans();
        }
    }, [clientId]);

    const addLoan = async (
        loanData: Omit<Loan, 'id' | 'owner_id' | 'created_by' | 'created_at' | 'updated_at' | 'is_deleted' | 'total_expected' | 'balance' | 'total_paid' | 'next_due_date' | 'status'>
    ) => {
        try {
            // Get the current user ID to satisfy the RLS policy: owner_id = auth.uid()
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error("No authenticated user found");

            // Verify client exists and is not deleted
            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('id, is_deleted')
                .eq('id', loanData.client_id)
                .single();

            if (clientError || !client) throw new Error("Cliente no encontrado");
            if (client.is_deleted) throw new Error("No se puede asignar un préstamo a un cliente eliminado");

            // Basic calculation for MVP (Simple Interest)
            const interestAmount = loanData.principal_amount * loanData.interest_rate;
            const totalExpected = Math.round(loanData.principal_amount + (interestAmount * loanData.term_count));

            const newLoanData = {
                ...loanData,
                owner_id: user.id,
                created_by: user.id,
                status: 'active',
                total_expected: totalExpected,
                total_paid: 0,
                balance: totalExpected,
                next_due_date: loanData.first_due_date, // Starts with the first due date
            };

            const { data, error } = await supabase
                .from('loans')
                .insert([newLoanData])
                .select()
                .single();

            if (error) throw error;

            setLoans(prev => [data as Loan, ...prev]);
            return { data, error: null };
        } catch (err: any) {
            console.error('Error adding loan:', err);
            return { data: null, error: err.message };
        }
    };

    const updateLoanNotes = async (loanId: string, notes: string) => {
        try {
            const { error } = await supabase
                .from('loans')
                .update({ notes })
                .eq('id', loanId);

            if (error) throw error;
            setLoans(prev => prev.map(l => l.id === loanId ? { ...l, notes } : l));
            return { error: null };
        } catch (err: any) {
            console.error('Error updating loan notes:', err);
            return { error: err.message };
        }
    };

    const deleteLoan = async (loanId: string) => {
        try {
            const { error } = await supabase
                .from('loans')
                .update({ is_deleted: true })
                .eq('id', loanId);

            if (error) throw error;
            setLoans(prev => prev.filter(l => l.id !== loanId));
            return { error: null };
        } catch (err: any) {
            console.error('Error deleting loan:', err);
            return { error: err.message };
        }
    };

    return { loans, loading, error, fetchLoans, addLoan, updateLoanNotes, deleteLoan };
}
