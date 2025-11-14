import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BellIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { Carousel } from "../components/Carousel";
import { useNotifications } from "../context/NotificationsContext";
import { useUser } from "../context/UserContext";
import { supabase } from "../supabase";

interface Module {
    id: string;
    nom: string;
    icone_url: string | null;
    isLocked: boolean;
}

const ModuleSkeleton = () => (
    <div className="bg-gray-200 p-4 rounded-xl animate-pulse">
        <div className="w-10 h-10 bg-gray-300 rounded-md mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
    </div>
);

const CarouselSkeleton = () => (
    <div className="aspect-video w-full bg-gray-200 rounded-xl animate-pulse"></div>
);


export function HomePage() {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();
    const { profile } = useUser();
    const [modules, setModules] = useState<Module[]>([]);
    const [carouselItems, setCarouselItems] = useState<any[]>([]);
    const [loadingModules, setLoadingModules] = useState(true);

    useEffect(() => {
        const fetchModules = async () => {
            setLoadingModules(true);
            try {
                if (profile?.faculte_id && profile?.niveau_id) {
                    const { data, error } = await supabase
                        .from('module_faculte_niveau')
                        .select('modules(id, nom, icone_url, is_free)')
                        .eq('faculte_id', profile.faculte_id)
                        .eq('niveau_id', profile.niveau_id);

                    if (error) {
                        console.error("Erreur lors du chargement des modules (filtrés):", error);
                        setModules([]);
                    } else {
                        const mods = (data ?? []) // data is { modules: { id, nom, ... } }[]
                            .map((row: any) => row.modules)
                            .filter(Boolean); // filter out null modules

                        // Deduplicate modules
                        const uniqueById = Object.values(
                            mods.reduce((acc: Record<string, any>, m) => {
                                acc[m.id] = {
                                    ...m,
                                    isLocked: profile?.role !== 'admin' && !profile?.is_premium && !m.is_free
                                };
                                return acc;
                            }, {})
                        );
                        setModules(uniqueById);
                    }
                } else {
                    // Fallback if user has no faculty/level - show all modules
                    const { data, error } = await supabase
                        .from('modules')
                        .select('id, nom, icone_url, is_free');

                    if (error) {
                        console.error("Erreur lors du chargement des modules:", error);
                        setModules([]);
                    } else {
                        const allModules = (data || []).map(m => ({
                            ...m,
                            isLocked: profile?.role !== 'admin' && !profile?.is_premium && !m.is_free
                        }));
                        setModules(allModules);
                    }
                }
            } catch (err) {
                console.error("Erreur inattendue lors du chargement des modules:", err);
            } finally {
                setLoadingModules(false);
            }
        };
        fetchModules();
    }, [profile]);

    useEffect(() => {
        const fetchCarouselItems = async () => {
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
            }
        };
        fetchCarouselItems();
    }, []);

    const handleModuleClick = (module: Module) => {
        if (module.isLocked) {
            navigate('/profil/abonnement');
            return;
        }
        // Si le module n'est pas verrouillé, naviguer vers la page des universités pour ce module
        const encodedName = encodeURIComponent(module.nom);
        navigate(`/modules/${encodedName}/universites`);
    };

    return (
        <div>
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
                    {loadingModules ? ( // Assuming carousel loads with modules
                        <CarouselSkeleton />
                    ) : (
                        <Carousel items={carouselItems} />
                    )}
                </section>

                {/* Section GridView - Anciens sujets par module */}
                <section>
                    <h2 className="text-lg font-semibold mb-3 text-gray-800">Anciens sujets par module</h2>

                    {loadingModules ? (
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <ModuleSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {modules.map((module) => (
                                <button
                                    key={module.id}
                                    onClick={() => handleModuleClick(module)}
                                    className={`relative p-4 rounded-xl shadow-md transition-all text-left bg-white hover:shadow-lg hover:-translate-y-1 active:scale-95 ${module.isLocked ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                >
                                    {/* Icône du module */}
                                    {module.isLocked && (
                                        <div className="absolute top-2 right-2 bg-gray-200 p-1 rounded-full">
                                            <LockClosedIcon className="w-4 h-4 text-gray-500" />
                                        </div>
                                    )}
                                    {module.icone_url ? (
                                        <img src={module.icone_url} alt={module.nom} className="w-10 h-10 mb-2" />
                                    ) : (
                                        <div className="text-4xl mb-2">📚</div>
                                    )}

                                    {/* Nom du module */}
                                    <p className="text-sm font-medium text-gray-800">
                                        {module.nom}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
