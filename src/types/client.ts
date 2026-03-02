export interface Client {
    id: string;
    owner_id: string;
    created_by: string;
    first_name: string;
    last_name: string;
    document_id: string | null;
    phone: string | null;
    address: string | null;
    status: 'active' | 'inactive';
    notes: string | null;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}
