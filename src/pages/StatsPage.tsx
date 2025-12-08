import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';
import {
    ChartBarIcon,
    AcademicCapIcon,
    TrophyIcon,
    CalendarIcon,
    FireIcon
} from '@heroicons/react/24/outline';

const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }: any) => {
    // Map colors to their light variants for backgrounds
    const bgColorMap: any = {
        'bg-blue-500': 'bg-blue-50',
        'bg-green-500': 'bg-green-50',
        'bg-orange-500': 'bg-orange-50',
        'bg-yellow-500': 'bg-yellow-50',
        'bg-purple-500': 'bg-purple-50',
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-xl ${bgColorMap[color] || 'bg-gray-50'}`}>
                    <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                </div>
                {trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
    );
};

const ProgressChart = ({ data, title }: { data: any[], title: string }) => {
    if (!data || data.length === 0) return null;

    const maxScore = Math.max(...data.map(d => d.score), 100);

    // Handle single data point case
    const points = data.map((d, i) => {
        const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
        const y = 100 - (d.score / maxScore) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                {title}
            </h3>
            <div className="relative h-48 pl-10">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="100"
                            y2={y}
                            stroke="#f3f4f6"
                            strokeWidth="0.5"
                        />
                    ))}

                    {/* Area under curve */}
                    <polygon
                        points={`0,100 ${points} 100,100`}
                        fill="url(#gradient)"
                        opacity="0.3"
                    />

                    {/* Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Points */}
                    {data.map((d, i) => {
                        const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
                        const y = 100 - (d.score / maxScore) * 100;
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="2"
                                fill="#3b82f6"
                                className="hover:r-3 transition-all cursor-pointer"
                            />
                        );
                    })}

                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#60a5fa" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 w-8">
                    <span className="text-right">100%</span>
                    <span className="text-right">75%</span>
                    <span className="text-right">50%</span>
                    <span className="text-right">25%</span>
                    <span className="text-right">0%</span>
                </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-400">
                {data.map((d, i) => (
                    i % Math.ceil(data.length / 5) === 0 && (
                        <span key={i}>{d.date}</span>
                    )
                ))}
            </div>
        </div>
    );
};

const ModulePerformanceBar = ({ module, score, quizCount }: any) => {
    const percentage = Math.min(score, 100);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    {module.icone_url ? (
                        <img src={module.icone_url} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                        <span className="text-xl">📚</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{module.nom}</h3>
                    <p className="text-xs text-gray-500">{quizCount} quiz complétés</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{score}%</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out group-hover:from-blue-600 group-hover:to-purple-600"
                    style={{ width: `${percentage}%` }}
                >
                    <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

export function StatsPage() {
    const { user } = useUser();
    const [stats, setStats] = useState<any>(null);
    const [progressData, setProgressData] = useState<any[]>([]);
    const [moduleStats, setModuleStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;

            setLoading(true);
            try {
                // Fetch user stats
                const { data: userStats } = await supabase
                    .from('user_stats')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                setStats(userStats);

                // Fetch quiz history for progress chart
                const { data: quizzes } = await supabase
                    .from('user_quizzes')
                    .select('created_at, score, total_questions, status')
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: true })
                    .limit(20);

                if (quizzes) {
                    const chartData = quizzes.map((q: any) => ({
                        date: new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                        score: Math.round((q.score / q.total_questions) * 100)
                    }));
                    setProgressData(chartData);
                }

                // Fetch module performance
                if (user?.faculte_id && user?.niveau_id) {
                    const { data: modules } = await supabase
                        .from('module_faculte_niveau')
                        .select('modules(id, nom, icone_url)')
                        .eq('faculte_id', user.faculte_id)
                        .eq('niveau_id', user.niveau_id);

                    if (modules) {
                        const uniqueModules = Array.from(
                            new Map(modules.map((m: any) => [m.modules.id, m.modules])).values()
                        );

                        // Calculate stats for each module
                        const modulePerformance = await Promise.all(
                            uniqueModules.map(async (module: any) => {
                                // Get quizzes for this module
                                const { data: moduleQuizzes } = await supabase
                                    .from('user_quizzes')
                                    .select('score, total_questions, config')
                                    .eq('user_id', user.id)
                                    .eq('status', 'completed');

                                // Filter quizzes by module (from config)
                                const filteredQuizzes = moduleQuizzes?.filter((q: any) => {
                                    try {
                                        const config = typeof q.config === 'string' ? JSON.parse(q.config) : q.config;
                                        return config?.moduleId === module.id;
                                    } catch {
                                        return false;
                                    }
                                }) || [];

                                const avgScore = filteredQuizzes.length > 0
                                    ? Math.round(
                                        filteredQuizzes.reduce((sum: number, q: any) =>
                                            sum + (q.score / q.total_questions) * 100, 0
                                        ) / filteredQuizzes.length
                                    )
                                    : 0;

                                return {
                                    module,
                                    score: avgScore,
                                    quizCount: filteredQuizzes.length
                                };
                            })
                        );

                        setModuleStats(modulePerformance.filter(m => m.quizCount > 0).sort((a, b) => b.score - a.score));
                    }
                }
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6 pb-8 rounded-b-3xl shadow-lg">
                <h1 className="text-2xl font-bold">📊 Mes Performances</h1>
                <p className="text-blue-100 text-sm mt-1">Suivez votre progression et vos résultats</p>
            </header>

            <main className="p-4 space-y-6 mt-2">
                {/* Stats Cards */}
                <section className="grid grid-cols-2 gap-3">
                    <StatCard
                        title="Quiz Complétés"
                        value={stats?.quizzes_completed || 0}
                        icon={AcademicCapIcon}
                        color="bg-blue-500"
                        trend={12}
                    />
                    <StatCard
                        title="Score Moyen"
                        value={`${stats?.average_score || 0}%`}
                        icon={ChartBarIcon}
                        color="bg-green-500"
                        trend={5}
                    />
                    <StatCard
                        title="Série Actuelle"
                        value="7 jours"
                        icon={FireIcon}
                        color="bg-orange-500"
                        subtitle="Continue comme ça !"
                    />
                    <StatCard
                        title="Points Totaux"
                        value={stats?.total_points || 0}
                        icon={TrophyIcon}
                        color="bg-yellow-500"
                    />
                </section>

                {/* Progress Chart */}
                {progressData.length > 0 && (
                    <ProgressChart
                        data={progressData}
                        title="Évolution de vos scores"
                    />
                )}

                {/* Module Performance */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5 text-purple-500" />
                        Performance par Module
                    </h2>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-gray-100 h-24 rounded-xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : moduleStats.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl text-center text-gray-500">
                            <p>Complétez des quiz pour voir vos performances par module</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {moduleStats.map((stat) => (
                                <ModulePerformanceBar
                                    key={stat.module.id}
                                    module={stat.module}
                                    score={stat.score}
                                    quizCount={stat.quizCount}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
