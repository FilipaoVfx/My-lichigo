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

    return { addPayment };
}
