
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
