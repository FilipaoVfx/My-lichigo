const VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0amF0Z2FpZmxkc3Bic3pyZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTM1ODcsImV4cCI6MjA4NzcyOTU4N30.VwbAAy1XE4gv08HHUr2JnFmOo304l1wuNOB8Cotn45g';
const res = await fetch('https://jtjatgaifldspbszrdts.supabase.co/functions/v1/update-display-name', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ uid: 'e9e7482a-dcb0-4a93-9c77-9febc811468d', new_display_name: 'Juan camilo' })
});
console.log(await res.json());