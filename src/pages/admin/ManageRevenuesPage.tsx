import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { CurrencyDollarIcon, UserGroupIcon, ArchiveBoxArrowDownIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RevenueStats {
    premiumUsers: number;
    totalRevenue: number;
    monthlyRevenue: number;
}

const StatCard = ({ icon: Icon, title, value, formatAsCurrency = false }: { icon: React.ElementType, title: string, value: number, formatAsCurrency?: boolean }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
        <div className="bg-blue-100 p-3 rounded-full">
            <Icon className="w-8 h-8 text-blue-600" />
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800">
                {formatAsCurrency ? `${value.toLocaleString('fr-FR')} FCFA` : value}
            </p>
        </div>
    </div>
);

export function ManageRevenuesPage() {
    const [stats, setStats] = useState<RevenueStats>({ premiumUsers: 0, totalRevenue: 0, monthlyRevenue: 0 });
    const [allPremiumProfiles, setAllPremiumProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Utiliser localStorage pour la persistance, avec une valeur par défaut de 5000.
    const [subscriptionPrice, setSubscriptionPrice] = useState<number>(() => {
        const savedPrice = localStorage.getItem('subscriptionPrice');
        return savedPrice ? JSON.parse(savedPrice) : 5000;
    });

    // State for filtering
    const [filterPeriod, setFilterPeriod] = useState('current_month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');


    useEffect(() => {
        const fetchPremiumUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                // Récupérer les utilisateurs premium
                const { data: premiumProfiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, prenom, nom, subscription_start_date, active_code')
                    .eq('is_premium', true)
                    .order('subscription_start_date', { ascending: false });

                if (profilesError) throw profilesError;

                setAllPremiumProfiles(premiumProfiles || []);

            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.');
            } finally {
                setLoading(false);
            }
        };

        fetchPremiumUsers();
    }, []);

    // Sauvegarder le prix dans localStorage à chaque changement
    useEffect(() => {
        localStorage.setItem('subscriptionPrice', JSON.stringify(subscriptionPrice));
    }, [subscriptionPrice]);


    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = new Date();

        if (filterPeriod === 'current_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (filterPeriod === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (filterPeriod === 'current_year') {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
        } else if (filterPeriod === 'custom' && customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
        }

        const filteredProfiles = allPremiumProfiles.filter(p => {
            if (!p.subscription_start_date) return false;
            const subDate = new Date(p.subscription_start_date);
            if (startDate && subDate < startDate) return false;
            if (endDate && subDate > endDate) return false;
            return true;
        });

        // Update stats based on filtered profiles
        const totalRevenue = allPremiumProfiles.length * subscriptionPrice;
        const periodRevenue = filteredProfiles.length * subscriptionPrice;

        setStats({
            premiumUsers: allPremiumProfiles.length,
            totalRevenue,
            monthlyRevenue: periodRevenue, // Re-using this state for period revenue
        });

        return filteredProfiles.map(p => ({
            id: p.id,
            prenom: p.prenom,
            nom: p.nom,
            activated_at: p.subscription_start_date!,
            active_code: p.active_code,
        }));

    }, [allPremiumProfiles, subscriptionPrice, filterPeriod, customStartDate, customEndDate]);

    const revenueChartData = useMemo(() => {
        const monthlyData: { [key: string]: number } = {};

        allPremiumProfiles.forEach(profile => {
            if (profile.subscription_start_date) {
                const date = new Date(profile.subscription_start_date);
                const monthKey = format(date, 'yyyy-MM');
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + subscriptionPrice;
            }
        });

        return Object.keys(monthlyData)
            .sort()
            .map(monthKey => {
                const [year, month] = monthKey.split('-');
                return {
                    name: format(new Date(Number(year), Number(month) - 1), 'MMM yy', { locale: fr }),
                    revenus: monthlyData[monthKey],
                };
            });

    }, [allPremiumProfiles, subscriptionPrice]);

    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) return;

        const headers = ['Prénom', 'Nom', 'Code Activé', "Date d'activation"];
        const csvRows = filteredTransactions.map(tx =>
            [
                `"${tx.prenom.replace(/"/g, '""')}"`,
                `"${tx.nom.replace(/"/g, '""')}"`,
                `"${tx.active_code}"`,
                `"${format(new Date(tx.activated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}"`
            ].join(',')
        );

        const csvString = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for BOM to support special characters in Excel

        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="text-center p-8">Chargement des données de revenus...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Erreur: {error}</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Revenus et Abonnements</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-md">
                    <label htmlFor="subscriptionPrice" className="block text-sm font-medium text-gray-700">Prix de l'abonnement (FCFA)</label>
                    <input
                        type="text"
                        pattern="[0-9]*"
                        id="subscriptionPrice"
                        value={subscriptionPrice}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, ''); // Accepter uniquement les chiffres
                            setSubscriptionPrice(Number(value));
                        }}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md">
                    <label htmlFor="filterPeriod" className="block text-sm font-medium text-gray-700">Filtrer par période</label>
                    <select
                        id="filterPeriod"
                        value={filterPeriod}
                        onChange={(e) => setFilterPeriod(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="current_month">Ce mois-ci</option>
                        <option value="last_month">Le mois dernier</option>
                        <option value="current_year">Cette année</option>
                        <option value="all">Toutes les périodes</option>
                        <option value="custom">Personnalisé</option>
                    </select>
                    {filterPeriod === 'custom' && (
                        <div className="flex items-center space-x-2 mt-2">
                            <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard icon={UserGroupIcon} title="Utilisateurs Premium" value={stats.premiumUsers} />
                <StatCard icon={CalendarDaysIcon} title="Revenus sur la période" value={stats.monthlyRevenue} formatAsCurrency />
                <StatCard icon={CurrencyDollarIcon} title="Revenus totaux" value={stats.totalRevenue} formatAsCurrency />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Évolution des revenus</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                            formatter={(value: number) => [`${value.toLocaleString('fr-FR')} FCFA`, 'Revenus']}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="revenus" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Transactions ({filteredTransactions.length})</h2>
                    <button onClick={handleExportCSV} disabled={filteredTransactions.length === 0} className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50">
                        <ArchiveBoxArrowDownIcon className="w-5 h-5 mr-2" />
                        Exporter en CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="py-3 px-4 font-semibold text-gray-600">Utilisateur</th>
                                <th className="py-3 px-4 font-semibold text-gray-600">Code Activé</th>
                                <th className="py-3 px-4 font-semibold text-gray-600">Date d'activation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-800">{tx.prenom} {tx.nom}</td>
                                    <td className="py-3 px-4 text-gray-600 font-mono">{tx.active_code}</td>
                                    <td className="py-3 px-4 text-gray-500">
                                        {format(new Date(tx.activated_at), 'dd MMMM yyyy, HH:mm', { locale: fr })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}