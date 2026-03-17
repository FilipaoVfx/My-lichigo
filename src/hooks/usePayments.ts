import { supabase } from '../lib/supabase.ts';

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

            const { data, error } = await supabase.rpc('register_loan_payment', {
                p_loan_id: paymentData.loan_id,
                p_amount: paymentData.amount,
                p_payment_type: paymentData.payment_type,
                p_principal_amount: paymentData.principal_amount || 0,
                p_interest_amount: paymentData.interest_amount || 0,
                p_method: paymentData.method,
                p_note: paymentData.note || null,
                p_owner_id: user.id,
                p_created_by: user.id,
                p_target_cuota_id: null
            });

            if (error) throw error;
            return { data: { id: data }, error: null };
        } catch (err: any) {
            console.error('Error adding payment:', err);
            return { data: null, error: err.message };
        }
    };

    return { addPayment };
}

