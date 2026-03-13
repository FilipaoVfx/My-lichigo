import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

if (!supabaseUrl || !supabaseKey) {
    console.error("No Supabase vars found in environment");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const clientId = '5bc0dc40-8321-4fa0-ac8e-2f36739c1f39';

async function run() {
    const { data: loans, error: loansErr } = await supabase
        .from('loans')
        .select('*')
        .eq('client_id', clientId);

    if (loansErr) {
        console.error("Error fetching loans:", loansErr);
        return;
    }

    const { data: payments, error: paymentsErr } = await supabase
        .from('payments')
        .select('*')
        .in('loan_id', loans.map(l => l.id));

    const { data: schedule, error: schErr } = await supabase
        .from('cuotas_plan')
        .select('*')
        .in('prestamo_id', loans.map(l => l.id))
        .order('numero_cuota', { ascending: true });

    const result = {
        loans,
        payments: payments || [],
        schedule: schedule || [],
    };

    fs.writeFileSync('C:/Users/Filipo/Documents/code/prestamosApp/tmp_client_data.json', JSON.stringify(result, null, 2));
    console.log('Data exported to tmp_client_data.json successfully.');
}

run();
