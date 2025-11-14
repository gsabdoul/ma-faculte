import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatsCards } from '../../../StatsCards';
import { supabase } from '../../supabase';

interface AdminDashboardStats {
    totalUsers: number;
    totalSubjects: number;
    totalBooks: number;
    totalDrives: number;
}

interface ChartData {
    name: string;
    utilisateurs?: number;
    sujets?: number;
}

export function AdminDashboard() {
    const [stats, setStats] = useState<AdminDashboardStats>({ totalUsers: 0, totalSubjects: 0, totalBooks: 0, totalDrives: 0 });
    const [userSignupsData, setUserSignupsData] = useState<ChartData[]>([]);
    const [subjectsDistributionData, setSubjectsDistributionData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Fetch stats cards data
                const [
                    { count: usersCount, error: usersError },
                    { count: subjectsCount, error: subjectsError },
                    { count: booksCount, error: booksError },
                    { count: drivesCount, error: drivesError },
                ] = await Promise.all([
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('sujets').select('*', { count: 'exact', head: true }),
                    supabase.from('livres').select('*', { count: 'exact', head: true }),
                    supabase.from('drives').select('*', { count: 'exact', head: true }),
                ]);

                if (usersError || subjectsError || booksError || drivesError) {
                    throw usersError || subjectsError || booksError || drivesError;
                }

                setStats({
                    totalUsers: usersCount ?? 0,
                    totalSubjects: subjectsCount ?? 0,
                    totalBooks: booksCount ?? 0,
                    totalDrives: drivesCount ?? 0,
                });

                // 2. Fetch user signups chart data for last 6 months
                const { data: signupsData, error: signupsError } = await supabase
                    .from('profiles')
                    .select('created_at')
                    .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

                if (signupsError) throw signupsError;

                // Process signup data to group by month
                const monthlySignups = (signupsData || []).reduce((acc: Record<string, number>, profile: any) => {
                    const date = new Date(profile.created_at);
                    const monthName = new Intl.DateTimeFormat('fr', { month: 'long' }).format(date);
                    acc[monthName] = (acc[monthName] || 0) + 1;
                    return acc;
                }, {});

                setUserSignupsData(Object.entries(monthlySignups)
                    .map(([month, count]) => ({ name: month, utilisateurs: count }))
                    .sort((a, b) => {
                        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
                        return months.indexOf(a.name.toLowerCase()) - months.indexOf(b.name.toLowerCase());
                    }));

                // 3. Fetch subjects distribution by module
                const { data: subjectsData, error: subjectsDistError } = await supabase
                    .from('sujets')
                    .select(`
                        module_id,
                        modules:modules (nom)
                    `);

                if (subjectsDistError) throw subjectsDistError;

                // Process subjects data to group by module
                const moduleDistribution = (subjectsData || []).reduce((acc: Record<string, number>, subject: any) => {
                    const moduleName = subject.modules?.nom || 'Non catégorisé';
                    acc[moduleName] = (acc[moduleName] || 0) + 1;
                    return acc;
                }, {});

                setSubjectsDistributionData(Object.entries(moduleDistribution)
                    .map(([module, count]) => ({ name: module, sujets: count })));

            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue lors du chargement des données.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div className="text-center p-8">Chargement du tableau de bord...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Erreur: {error}</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Tableau de bord</h1>

            {/* Cartes de statistiques */}
            <StatsCards stats={stats} />

            {/* Section des graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graphique des nouveaux utilisateurs */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Nouveaux utilisateurs (6 derniers mois)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={userSignupsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="utilisateurs" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Graphique de répartition des sujets */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Répartition des sujets par module</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={subjectsDistributionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="sujets" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}