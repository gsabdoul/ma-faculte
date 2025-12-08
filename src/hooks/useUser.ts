import { useEffect, useState } from 'react';
import { supabase } from '../supabase'; // Chemin corrigé
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    nom: string;
    prenom: string;
    universite_id: string;
    faculte_id: string;
    niveau_id: string;
    role: 'admin' | 'writer' | 'reader';
    is_premium: boolean;
    profil_url: string;
}

/**
 * Custom hook that returns the currently authenticated Supabase user.
 * It subscribes to auth state changes and updates the user object accordingly.
 */
export function useUser() {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessionAndProfile = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            const currentUser = session?.user;
            setUser(currentUser ?? null);

            if (currentUser) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single();
                setUserProfile(profile as UserProfile | null);
            }
            setLoading(false);
        };

        fetchSessionAndProfile();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setSession(session);
            setUser(session?.user ?? null);
            // When auth state changes, re-fetch profile
            fetchSessionAndProfile();
        });

        return () => subscription?.unsubscribe();
    }, []);

    return { user, session, userProfile, loading };
}
