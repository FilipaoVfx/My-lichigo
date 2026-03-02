export interface Loan {
    id: string;
    owner_id: string;
    created_by: string;
    client_id: string;
    principal_amount: number;
    interest_type: 'simple' | 'flat' | 'custom';
    interest_rate: number;
    interest_rate_period: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    payment_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    term_count: number;
    disbursement_date: string;
    first_due_date: string;
    next_due_date: string;
    grace_days: number;
    late_fee_type: 'none' | 'fixed' | 'percent';
    late_fee_value: number;
    status: 'draft' | 'active' | 'overdue' | 'paid' | 'defaulted';
    total_expected: number;
    total_paid: number;
    balance: number;
    notes: string | null;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}
