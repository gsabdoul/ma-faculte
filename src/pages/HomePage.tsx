
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BellIcon } from "@heroicons/react/24/outline";
import { Carousel } from "../components/ui/Carousel";
import { useNotifications } from "../context/NotificationsContext";
import { useUser } from "../context/UserContext";
import { supabase } from "../supabase";
import {

    PlusIcon,
    PlayIcon,
    QueueListIcon,
    PencilSquareIcon
} from '@heroicons/react/24/solid';
import { QuizActionCard } from '../components/quiz/QuizActionCard';



// Squelette du carrousel avec un ratio d'aspect réactif.
// Hauteur fixe et réactive pour une meilleure consistance sur tous les écrans.
const CarouselSkeleton = () => (
    <div className="w-full bg-gray-200 rounded-xl animate-pulse h-40 lg:h-52"></div>
);


export function HomePage() {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();
    const { profile } = useUser();
    const [carouselItems, setCarouselItems] = useState<any[]>([]);
    const [loadingCarousel, setLoadingCarousel] = useState(true);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    // Mock data for Campus Stars

    // Vérification automatique des mises à jour au chargement
    useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    await reg.update();
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setUpdateAvailable(true);
                                }
                            });
                        }
                    });
                }
            } catch (err) {
                console.error('Erreur lors de la vérification des mises à jour:', err);
            }
        };

        checkForUpdates();
    }, []);

    useEffect(() => {
        const fetchCarousel = async () => {
            try {
                const { data, error } = await supabase
                    .from('infos_carrousel')
                    .select('id, titre, image_url, lien')
                    .eq('active', true)
                    .order('ordre', { ascending: true });

                if (error) throw error;

                const items = data.map(item => ({
                    id: item.id,
                    // Ajoute les paramètres de transformation directement à l'URL existante
                    imageUrl: `${item.image_url}?width=1200&quality=80`,
                    alt: item.titre,
                    title: item.titre,
                    learnMoreUrl: item.lien || '#',
                }));

                setCarouselItems(items);
            } catch (err) {
                console.error("Erreur lors du chargement du carrousel:", err);
            } finally {
                setLoadingCarousel(false);
            }
        };

        fetchCarousel();
    }, []);





    return (
        <div className="bg-gray-50 h-full flex flex-col">
            {/* Bannière de mise à jour */}
            {updateAvailable && (
                <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                    <span className="text-sm">Une nouvelle version est disponible !</span>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-white text-blue-600 px-4 py-1 rounded-full text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                        Actualiser
                    </button>
                </div>
            )}

            {/* Header avec angles arrondis */}
            <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-4 sm:px-6 py-4 rounded-b-3xl shadow-lg flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {/* Avatar */}
                        <Link to="/profil" className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30 hover:bg-white/30 transition-colors flex-shrink-0">
                            {/* L'avatar peut être amélioré plus tard avec une URL de photo de profil */}
                            <span className="text-3xl">👤</span>
                        </Link>
                        <div className="ml-4">
                            <p className="text-blue-200 text-sm">Bienvenue,</p>
                            <h1 className="text-xl font-bold tracking-tight">{profile?.prenom || 'Étudiant'}</h1>
                        </div>
                    </div>
                    <Link to="/notifications" className="relative p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
                        <BellIcon className="w-7 h-7" />
                        {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>}
                    </Link>
                </div>
            </header>

            <main className="px-4 py-4 space-y-4 flex-grow flex flex-col justify-around">
                {/* Section Carrousel */}
                <section>
                    <h2 className="text-lg font-semibold mb-3 text-gray-800">Infos</h2>
                    {loadingCarousel ? (
                        <CarouselSkeleton />
                    ) : (
                        <Carousel items={carouselItems} />
                    )}
                </section>


                {/* Quiz Actions Grid */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-3">Action Rapide</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <QuizActionCard
                            title="Mes Quiz"
                            icon={PlusIcon}
                            color="from-blue-500 to-indigo-600"
                            onClick={() => navigate('/quiz')}
                            delay={0}
                        />
                        <QuizActionCard
                            title="Challenge"
                            icon={PlayIcon}
                            color="from-emerald-400 to-teal-600"
                            onClick={() => navigate('/challenges')}
                            delay={100}
                        />
                        <QuizActionCard
                            title="Playlist"
                            icon={QueueListIcon}
                            color="from-violet-500 to-purple-600"
                            onClick={() => navigate('/playlists')}
                            delay={200}
                        />
                        <QuizActionCard
                            title="Mes Notes"
                            icon={PencilSquareIcon}
                            color="from-amber-400 to-orange-600"
                            onClick={() => navigate('/notes')}
                            delay={300}
                        />
                    </div>
                </section>

            </main>
        </div>
    );
}
