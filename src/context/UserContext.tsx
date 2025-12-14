import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../supabase';
import type { Session, User } from '@supabase/supabase-js';

// Type pour le profil utilisateur étendu
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

// L'objet utilisateur complet que nous exposerons
export type AppUser = User & UserProfile;

interface UserContextType {
  session: Session | null;
  user: AppUser | null; // Remplacer user et profile par un seul objet
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);

        if (session?.user) {
          fetchProfile(session.user);
        } else {
          setUser(null); // Si pas de session, l'utilisateur est null
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fonction pour récupérer le profil avec les données jointes
  async function fetchProfile(sessionUser: User) {
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
        .eq('id', sessionUser.id)
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

        // On fusionne l'utilisateur de la session avec son profil
        setUser({ ...sessionUser, ...profileData });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      setUser(sessionUser as AppUser); // Fallback
    } finally {
      setLoading(false);
    }
  }

  // Fonction pour rafraîchir le profil
  const refreshProfile = async () => {
    const sessionUser = session?.user;
    if (sessionUser) {
      await fetchProfile(sessionUser);
    }
  };

  const value = {
    session,
    user, // On expose uniquement l'utilisateur fusionné
    loading,
    refreshProfile
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Hook personnalisé pour utiliser le contexte
// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser doit être utilisé à l\'intérieur d\'un UserProvider');
  }
  return context;
}