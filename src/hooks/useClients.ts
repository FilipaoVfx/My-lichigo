import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import type { Client } from '../types/client.ts';

export function useClients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            setClients(data as Client[]);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const addClient = async (
        clientData: Omit<Client, 'id' | 'owner_id' | 'created_by' | 'created_at' | 'updated_at' | 'is_deleted'>
    ) => {
        try {
            // Get the current user ID to satisfy the RLS policy: owner_id = auth.uid()
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error("No authenticated user found");

            const insertData = {
                ...clientData,
                owner_id: user.id,
                created_by: user.id
            };

            const { data, error } = await supabase
                .from('clients')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            setClients(prev => [data as Client, ...prev]);
            return { data, error: null };
        } catch (err: any) {
            console.error('Error adding client:', err);
            return { data: null, error: err.message };
        }
    };

    const deleteClient = async (id: string) => {
        try {
            const { error } = await supabase
                .from('clients')
                .update({ is_deleted: true })
                .eq('id', id);

            if (error) throw error;
            setClients(prev => prev.filter(c => c.id !== id));
            return { error: null };
        } catch (err: any) {
            console.error('Error deleting client:', err);
            return { error: err.message };
        }
    };

    return { clients, loading, error, fetchClients, addClient, deleteClient };
}
