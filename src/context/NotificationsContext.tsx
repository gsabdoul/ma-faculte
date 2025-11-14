import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { supabase } from '../supabase';

// Définir la structure d'une notification et du contexte
interface Notification {
    id: string;
    titre: string;
    message: string;
    created_at: string;
    lue: boolean;
    user_id: string;
    isNew?: boolean; // Pour l'animation des nouvelles notifications
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    loadMore: () => Promise<void>;
}

// Créer le contexte
const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const NOTIFICATIONS_PER_PAGE = 10;

// Créer le fournisseur de contexte (Provider)
export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    // Calculer le nombre de notifications non lues
    const unreadCount = useMemo(() => notifications.filter(n => !n.lue).length, [notifications]);

    // Charger les notifications de l'utilisateur
    const loadNotifications = async (pageNum: number = 0, replace: boolean = true) => {
        try {
            const { data: session } = await supabase.auth.getSession();
            if (!session?.session?.user?.id) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            const start = pageNum * NOTIFICATIONS_PER_PAGE;
            const end = start + NOTIFICATIONS_PER_PAGE - 1;

            const { data, error: err, count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', session.session.user.id)
                .order('created_at', { ascending: false })
                .range(start, end);

            if (err) throw err;

            const newData = (data || []).map(notif => ({ ...notif, isNew: false }));
            setNotifications(current => replace ? newData : [...current, ...newData]);
            setHasMore(count ? start + NOTIFICATIONS_PER_PAGE < count : false);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            if (replace) setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    // Charger plus de notifications
    const loadMore = async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        const nextPage = page + 1;
        await loadNotifications(nextPage, false);
        setPage(nextPage);
    };

    useEffect(() => {
        loadNotifications(0, true);

        // Souscrire aux changements en temps réel
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${supabase.auth.getSession()?.then(res => res.data.session?.user?.id)}`
                },
                async () => {
                    // Recharger uniquement la première page
                    setPage(0);
                    await loadNotifications(0, true);
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const { error: err } = await supabase
                .from('notifications')
                .update({ lue: true })
                .eq('id', id);

            if (err) throw err;

            // Mise à jour locale
            setNotifications(current =>
                current.map(notif => (notif.id === id ? { ...notif, lue: true } : notif))
            );
        } catch (err: any) {
            setError(err.message);
            throw err; // Pour que l'UI puisse gérer l'erreur
        }
    };

    // Marquer toutes les notifications comme lues
    const markAllAsRead = async () => {
        try {
            const { data: session } = await supabase.auth.getSession();
            if (!session?.session?.user?.id) return;

            const { error: err } = await supabase
                .from('notifications')
                .update({ lue: true })
                .eq('user_id', session.session.user.id)
                .eq('lue', false);

            if (err) throw err;

            // Mise à jour locale
            setNotifications(current =>
                current.map(notif => ({ ...notif, lue: true }))
            );
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const value = {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        loading,
        error,
        hasMore,
        loadMore
    };

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
};

// Créer un hook personnalisé pour utiliser facilement le contexte
export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};