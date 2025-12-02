import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { AcademicCapIcon } from "@heroicons/react/24/solid";
import { useUser } from "../context/UserContext";
import { supabase } from "../supabase";

interface Module {
    id: string;
    nom: string;
    icone_url: string | null;
    is_free: boolean;
    isLocked?: boolean;
}

const ModuleSkeleton = () => (
    <div className="bg-gray-200 p-4 rounded-xl animate-pulse">
        <div className="w-10 h-10 bg-gray-300 rounded-md mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
    </div>
);

export function SubjectsPage() {
    const navigate = useNavigate();
    const { profile, loading: userLoading } = useUser();
    const [modules, setModules] = useState<Module[]>([]);
    const [loadingModules, setLoadingModules] = useState(true);

    useEffect(() => {
        const fetchModules = async () => {
            if (userLoading) return;

            setLoadingModules(true);
            try {
                if (profile?.faculte_id && profile?.niveau_id) {
                    const { data, error } = await supabase
                        .from('module_faculte_niveau')
                        .select('modules(id, nom, icone_url, is_free)')
                        .eq('faculte_id', profile.faculte_id)
                        .eq('niveau_id', profile.niveau_id);

                    if (error) {
                        console.error("Erreur lors du chargement des modules:", error);
                        setModules([]);
                    } else {
                        const mods = (data ?? [])
                            .map((row: any) => row.modules)
                            .filter(Boolean);

                        const uniqueById = Object.values(
                            mods.reduce((acc: Record<string, any>, m) => {
                                acc[m.id] = {
                                    ...m,
                                    isLocked: profile?.role !== 'admin' && !profile?.is_premium && !m.is_free
                                };
                                return acc;
                            }, {})
                        ).sort((a: any, b: any) => a.nom.localeCompare(b.nom));

                        setModules(uniqueById);
                    }
                } else {
                    const { data, error } = await supabase
                        .from('modules')
                        .select('id, nom, icone_url, is_free')
                        .order('nom', { ascending: true });

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
                console.error("Erreur inattendue:", err);
            } finally {
                setLoadingModules(false);
            }
        };
        fetchModules();
    }, [profile, userLoading]);

    const handleModuleClick = (moduleId: string, isLocked: boolean) => {
        if (isLocked) {
            navigate('/profil/abonnement');
        } else {
            navigate(`/modules/${moduleId}/universites`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 bg-white p-4 shadow-sm z-30">
                <h1 className="text-2xl font-bold text-gray-800">Sujets</h1>
                <p className="text-sm text-gray-500">Sélectionnez un module pour voir les sujets</p>
            </header>

            <main className="p-4 pb-24">
                {loadingModules ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <ModuleSkeleton key={i} />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {modules.map((module) => (
                            <button
                                key={module.id}
                                onClick={() => handleModuleClick(module.id, !!module.isLocked)}
                                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        {module.icone_url ? (
                                            <img src={module.icone_url} alt="" className="w-6 h-6" />
                                        ) : (
                                            <AcademicCapIcon className="w-6 h-6 text-blue-600" />
                                        )}
                                    </div>
                                    {module.isLocked && (
                                        <LockClosedIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                                <h3 className="font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                    {module.nom}
                                </h3>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
