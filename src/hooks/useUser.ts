import { useEffect, useState } from 'react';
import { supabase } from '../supabase'; // Chemin corrigé
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

/**
 * Custom hook that returns the currently authenticated Supabase user.
 * It subscribes to auth state changes and updates the user object accordingly.
 */
export function useUser() {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Initial load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription?.unsubscribe();
    }, []);

    return { user, session, loading };
}
