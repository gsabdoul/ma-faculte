import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../supabase';
import type { Session, User } from '@supabase/supabase-js';

// Type pour le profil utilisateur
export interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  universite_id: string;
  faculte_id: string;
  niveau_id: string;
  role: 'admin' | 'writer' | 'reader';
  code: string;
  active_code: string;
  is_premium: boolean;
  subscription_start_date?: string;
  subscription_end_date?: string;
  created_at?: string;
  updated_at?: string;
  // Données jointes
  universite_nom?: string;
  faculte_nom?: string;
  niveau_nom?: string;
}

interface UserContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fonction pour récupérer le profil avec les données jointes
  async function fetchProfile(userId: string) {
    try {
      setLoading(true);

      // Récupérer le profil avec les données jointes
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          universites:universite_id (nom),
          facultes:faculte_id (nom),
          niveaux:niveau_id (nom)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Transformer les données pour inclure les noms des entités jointes
        const profileData: UserProfile = {
          ...data,
          universite_nom: data.universites?.nom,
          faculte_nom: data.facultes?.nom,
          niveau_nom: data.niveaux?.nom
        };

        setProfile(profileData);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
    } finally {
      setLoading(false);
    }
  }

  // Fonction pour rafraîchir le profil
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    refreshProfile
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Hook personnalisé pour utiliser le contexte
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser doit être utilisé à l\'intérieur d\'un UserProvider');
  }
  return context;
}