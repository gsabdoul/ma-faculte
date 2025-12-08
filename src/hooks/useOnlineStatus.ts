import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour suivre l'état de la connexion réseau.
 * @returns `true` si le navigateur est en ligne, sinon `false`.
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}