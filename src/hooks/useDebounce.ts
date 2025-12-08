import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour "débouncer" une valeur.
 * Il ne met à jour la valeur retournée qu'après un certain délai sans changement.
 * @param value La valeur à débouncer.
 * @param delay Le délai en millisecondes.
 * @returns La valeur débouncée.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}