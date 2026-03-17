import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jtjatgaifldspbszrdts.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0amF0Z2FpZmxkc3Bic3pyZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTM1ODcsImV4cCI6MjA4NzcyOTU4N30.VwbAAy1XE4gv08HHUr2JnFmOo304l1wuNOB8Cotn45g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function triggerSystemCheck() {
  console.log('1. Iniciando sesión de administrador...')
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@Richard.app',
    password: 'ricardito123'
  })

  if (authError || !authData.user) {
    console.error('Error al iniciar sesión:', authError)
    return
  }
  
  console.log('2. Disparando la Edge Function (Background Engine)...')
  console.log('📡 Esto validará qué préstamos necesitan notificación y enviará Web Pushes reales a tus dispositivos registrados.')

  try {
    const { data, error } = await supabase.functions.invoke('detect-overdue-loans', {
      method: 'POST'
    })

    if (error) throw error;

    console.log('✅ Ejecución del motor completada con éxito.');
    console.log('📊 Resultados:', data);
    console.log('\n---');
    console.log('IMPORTANTE:');
    console.log('1. Asegúrate de haber desplegado la app con "vercel --prod" para activar el nuevo Service Worker.');
    console.log('2. Entra a la app, ve a Ajustes y activa los recordatorios para generar la suscripción nativa.');
    console.log('3. Si tienes cobros en los próximos 5 días, DEBERÍAS recibir la notificación afuera de la app en unos segundos.');
  } catch (err) {
    console.error('Error invocando el motor:', err.message);
  }
}

triggerSystemCheck()
