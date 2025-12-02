
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
    ClockIcon
} from '@heroicons/react/24/solid';
import { QuizActionCard } from '../components/quiz/QuizActionCard';
import { CampusStarCard } from '../components/campus/CampusStarCard';



const CarouselSkeleton = () => (
    <div className="aspect-video w-full bg-gray-200 rounded-xl animate-pulse"></div>
);


export function HomePage() {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();
    const { profile } = useUser();
    const [carouselItems, setCarouselItems] = useState<any[]>([]);
    const [loadingCarousel, setLoadingCarousel] = useState(true);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    // Mock data for Campus Stars
    const campusStars = [
        { id: '1', name: 'Sarah M.', rank: 1, score: 2450, avatar_url: null },
        { id: '2', name: 'Jean K.', rank: 2, score: 2380, avatar_url: null },
        { id: '3', name: 'Paul A.', rank: 3, score: 2100, avatar_url: null },
        { id: '4', name: 'Marie L.', rank: 4, score: 1950, avatar_url: null },
        { id: '5', name: 'Marc D.', rank: 5, score: 1800, avatar_url: null },
    ];

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
                    id: item.id, // Gardé comme string (UUID)
                    imageUrl: item.image_url,
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
        <div className="pb-20 bg-gray-50 min-h-screen">
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
            <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-4 sm:px-6 py-4 rounded-b-3xl shadow-lg">
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

            <div className="px-4 py-6 space-y-8">
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
                    <h2 className="text-lg font-bold text-gray-800 mb-3">Quiz Rapide</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <QuizActionCard
                            title="Créer un quiz"
                            icon={PlusIcon}
                            color="bg-blue-500"
                            onClick={() => console.log('Create Quiz')}
                        />
                        <QuizActionCard
                            title="Challenge"
                            icon={PlayIcon}
                            color="bg-green-500"
                            onClick={() => navigate('/challenges')}
                        />
                        <QuizActionCard
                            title="Playlist"
                            icon={QueueListIcon}
                            color="bg-purple-500"
                            onClick={() => navigate('/playlists')}
                        />
                        <QuizActionCard
                            title="Historique"
                            icon={ClockIcon}
                            color="bg-orange-500"
                            onClick={() => console.log('History')}
                        />
                    </div>
                </section>

                {/* Campus Stars */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-gray-800">Campus Stars 🌟</h2>
                        <button className="text-sm text-blue-600 font-medium">Voir tout</button>
                    </div>
                    <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                        {campusStars.map((student) => (
                            <CampusStarCard
                                key={student.id}
                                rank={student.rank}
                                name={student.name}
                                score={student.score}
                                avatar={student.avatar_url || undefined}
                            />
                        ))}
                    </div>
                </section>


            </div>
        </div>
    );
}
