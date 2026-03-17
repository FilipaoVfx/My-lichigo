
/**
 * Formatea un número como pesos colombianos (COP)
 * Sin decimales, usando punto como separador de miles.
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Formatea un número con separador de miles es-CO
 */
export const formatNumber = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};
/**
 * Formatea una fecha ISO (YYYY-MM-DD) a formato latino (DD/MM/YYYY)
 */
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    
    // Si ya viene formateada o tiene un formato extraño, intentamos parsear
    // Pero usualmente de Supabase viene YYYY-MM-DD
    const parts = dateString.split(/[-/]/);
    if (parts.length === 3) {
        // Asumiendo YYYY-MM-DD
        if (parts[0].length === 4) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        // Si ya es DD/MM/YYYY o similar, lo dejamos igual
        return dateString;
    }
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
};
