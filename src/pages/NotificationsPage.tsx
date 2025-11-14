import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, BellAlertIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { useNotifications } from '../context/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function NotificationsPage() {
    const navigate = useNavigate();
    const { notifications, markAsRead, markAllAsRead, loading, error, hasMore, loadMore, unreadCount } = useNotifications();
    const [loadingMore, setLoadingMore] = useState(false);

    // Intersection Observer pour le scroll infini
    const observerTarget = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            async (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
                    setLoadingMore(true);
                    await loadMore();
                    setLoadingMore(false);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, loadMore]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await markAsRead(id);
        } catch (err) {
            console.error('Erreur lors du marquage comme lu:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
        } catch (err) {
            console.error('Erreur lors du marquage de toutes les notifications:', err);
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Chargement des notifications...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                            <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800">Notifications</h1>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            Tout marquer comme lu
                        </button>
                    )}
                </div>
            </header>

            <main>
                {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 mb-4">
                        <div className="flex items-center">
                            <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-2" />
                            <p className="text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-gray-200">
                    {notifications.length === 0 && !loading ? (
                        <div className="text-center p-8 text-gray-500">
                            Aucune notification pour le moment.
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <button
                                key={notif.id}
                                onClick={() => handleMarkAsRead(notif.id)}
                                disabled={notif.lue}
                                className={`w-full text-left p-4 flex items-start space-x-4 transition-colors ${!notif.lue ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white'}`}
                            >
                                <div className={`flex-shrink-0 mt-1 p-2 rounded-full ${!notif.lue ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    <BellAlertIcon className={`w-6 h-6 ${!notif.lue ? 'text-blue-600' : 'text-gray-500'}`} />
                                </div>
                                <div className="flex-grow">
                                    <h2 className="font-semibold text-gray-800">{notif.titre}</h2>
                                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                                    </p>
                                </div>
                                {!notif.lue && (
                                    <div className="flex-shrink-0 mt-1">
                                        <span className="w-3 h-3 bg-blue-500 rounded-full block"></span>
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}