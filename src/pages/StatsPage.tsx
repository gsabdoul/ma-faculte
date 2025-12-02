
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';
import {
    ChartBarIcon,
    AcademicCapIcon,
    ClockIcon,
    TrophyIcon,
    BuildingLibraryIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-xl font-bold text-gray-800">{value}</h3>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
    </div>
);

const RankingCard = ({ title, rank, total, icon: Icon, color, description }: any) => {
    const percentage = Math.round(((total - rank) / total) * 100);

    return (
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${color}`} />
                        {title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${percentage > 80 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    Top {100 - percentage}%
                </div>
            </div>

            <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-900">{rank}</span>
                <span className="text-sm text-gray-500 mb-1">/ {total} étudiants</span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                <div
                    className={`h-2 rounded-full ${color.replace('text-', 'bg-')}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

const ModuleRankCard = ({ module }: { module: any }) => {
    // Mock rank for now
    const rank = Math.floor(Math.random() * 50) + 1;
    const total = 120;

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    {module.icone_url ? (
                        <img src={module.icone_url} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                        <span className="text-xl">📚</span>
                    )}
                </div>
                <h3 className="font-bold text-gray-800 line-clamp-1 text-sm">{module.nom}</h3>
            </div>
            <div className="flex justify-between items-end border-t border-gray-50 pt-2">
                <div>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Rang</p>
                    <p className="text-lg font-bold text-blue-600">#{rank}</p>
                </div>
                <div className="text-xs text-gray-400 mb-1">
                    / {total}
                </div>
            </div>
        </div>
    );
};

export function StatsPage() {
    const { profile, loading: userLoading } = useUser();
    const [modules, setModules] = useState<any[]>([]);
    const [loadingModules, setLoadingModules] = useState(true);

    useEffect(() => {
        const fetchModules = async () => {
            if (userLoading) return;
            setLoadingModules(true);
            try {
                if (profile?.faculte_id && profile?.niveau_id) {
                    const { data, error } = await supabase
                        .from('module_faculte_niveau')
                        .select('modules(id, nom, icone_url)')
                        .eq('faculte_id', profile.faculte_id)
                        .eq('niveau_id', profile.niveau_id);

                    if (!error && data) {
                        const mods = data.map((row: any) => row.modules).filter(Boolean);
                        // Deduplicate by ID
                        const uniqueMods = Object.values(
                            mods.reduce((acc: any, m: any) => {
                                acc[m.id] = m;
                                return acc;
                            }, {})
                        );
                        setModules(uniqueMods);
                    }
                } else {
                    const { data, error } = await supabase
                        .from('modules')
                        .select('id, nom, icone_url')
                        .limit(10); // Limit for stats page

                    if (!error && data) {
                        setModules(data);
                    }
                }
            } catch (err) {
                console.error("Error fetching modules:", err);
            } finally {
                setLoadingModules(false);
            }
        };

        fetchModules();
    }, [profile, userLoading]);

    // Mock data for now
    const stats = {
        quizzesCompleted: 42,
        averageScore: 85,
        studyTime: '12h 30m',
        nationalRank: 156,
        nationalTotal: 2500,
        universityRank: 12,
        universityTotal: 450
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-gray-800">Mes Statistiques</h1>
                <p className="text-sm text-gray-500">Suivez votre progression et votre classement</p>
            </header>

            <main className="p-4 space-y-6">
                {/* Personal Stats Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatCard
                        title="Quiz Complétés"
                        value={stats.quizzesCompleted}
                        icon={AcademicCapIcon}
                        color="bg-blue-500"
                    />
                    <StatCard
                        title="Score Moyen"
                        value={`${stats.averageScore}%`}
                        icon={ChartBarIcon}
                        color="bg-green-500"
                    />
                    <StatCard
                        title="Temps d'étude"
                        value={stats.studyTime}
                        icon={ClockIcon}
                        color="bg-purple-500"
                    />
                    <StatCard
                        title="Points Totaux"
                        value="1,250"
                        icon={TrophyIcon}
                        color="bg-yellow-500"
                    />
                </section>

                {/* Rankings Section */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <TrophyIcon className="w-5 h-5 text-yellow-500" />
                        Classements
                    </h2>

                    <RankingCard
                        title="Classement National"
                        rank={stats.nationalRank}
                        total={stats.nationalTotal}
                        icon={GlobeAltIcon}
                        color="text-indigo-600"
                        description="Parmi tous les étudiants de même niveau et faculté"
                    />

                    <RankingCard
                        title="Classement Université"
                        rank={stats.universityRank}
                        total={stats.universityTotal}
                        icon={BuildingLibraryIcon}
                        color="text-emerald-600"
                        description={`Au sein de ${profile?.universite_nom || 'votre université'}`}
                    />
                </section>

                {/* Classification par Module */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5 text-blue-500" />
                        Classification par Module
                    </h2>

                    {loadingModules ? (
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-gray-100 h-32 rounded-xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {modules.map((module) => (
                                <ModuleRankCard key={module.id} module={module} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Progress Chart Placeholder */}
                <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Progression Hebdomadaire</h3>
                    <div className="h-40 flex items-end justify-between gap-2 px-2">
                        {[40, 65, 45, 80, 55, 90, 85].map((h, i) => (
                            <div key={i} className="w-full bg-blue-100 rounded-t-md relative group">
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-md transition-all duration-500 hover:bg-blue-600"
                                    style={{ height: `${h}%` }}
                                ></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>Lun</span>
                        <span>Dim</span>
                    </div>
                </section>
            </main>
        </div>
    );
}
