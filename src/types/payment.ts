export interface Payment {
    id: string;
    owner_id: string;
    loan_id: string;
    payment_date: string;
    amount: number;
    payment_type: 'principal' | 'interest_only' | 'mixed';
    principal_amount?: number;
    interest_amount?: number;
    method: 'cash' | 'transfer' | 'other';
    note?: string;
    is_void: boolean;
    created_at: string;
    updated_at: string;
    created_by: string;
    balance_after?: number;
}
