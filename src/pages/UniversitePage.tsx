import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { supabase } from '../supabase';

export function UniversitePage() {
    const { moduleId } = useParams<{ moduleId?: string }>();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [module, setModule] = useState<any | null>(null);
    const [universities, setUniversities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch module and universities from Supabase
    useEffect(() => {
        if (!moduleId) {
            setModule(null);
            setUniversities([]);
            setLoading(false);
            return;
        }

        let cancel = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                // Try to resolve module by id first
                let modRes = await supabase.from('modules').select('*').eq('id', moduleId).maybeSingle();
                let resolvedModule = modRes.data || null;

                // If not found by id, try to resolve by name/slug (case-insensitive starts with)
                if (!resolvedModule) {
                    const byName = await supabase.from('modules').select('*').ilike('nom', `${moduleId}%`).limit(1).maybeSingle();
                    resolvedModule = byName.data || null;
                }

                if (cancel) return;

                setModule(resolvedModule);

                if (!resolvedModule) {
                    setUniversities([]);
                    setLoading(false);
                    return;
                }

                // Get universities and count their subjects in a single query
                const unisRes = await supabase
                    .from('universites')
                    .select(`
                        *,
                        sujets:sujets(count),
                        sujet_preview:sujets(*)
                    `)
                    .eq('sujets.module_id', resolvedModule.id) as any;

                if (unisRes && unisRes.error) throw unisRes.error;

                // Filter universities that have subjects and add count
                const universitiesWithSubjects = (unisRes.data || [])
                    .filter((uni: any) => uni.sujets && uni.sujets[0] && uni.sujets[0].count > 0)
                    .map((uni: any) => ({
                        ...uni,
                        subjectCount: uni.sujets[0].count
                    }));

                if (universitiesWithSubjects.length === 0) {
                    setUniversities([]);
                    setLoading(false);
                    return;
                }

                if (cancel) return;
                setUniversities(universitiesWithSubjects);
            } catch (err: any) {
                setError(err?.message || String(err));
                setUniversities([]);
            } finally {
                if (!cancel) setLoading(false);
            }
        };

        load();
        return () => { cancel = true; };
    }, [moduleId]);

    const filteredUniversities = useMemo(() => {
        if (!searchTerm) return universities;
        return universities.filter(uni => uni.nom.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, universities]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-gray-600">Chargement des universités...</div>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Erreur : {error}</div>;
    }

    if (!module) {
        return <div className="p-4 text-center text-red-500">Module non trouvé.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                        <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Universités pour "{module?.nom || module?.name || ''}"</h1>
                </div>
                <div className="relative mt-4">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Rechercher une université..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </header>

            <main className="p-4 space-y-3">
                {filteredUniversities.length > 0 ? (
                    filteredUniversities.map(uni => (
                        <Link
                            key={uni.id}
                            to={`/modules/${moduleId}/universites/${uni.id}/sujets`}
                            className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        >
                            <img src={uni.logo_url || 'https://via.placeholder.com/100'} alt={`Logo de ${uni.nom || uni.name}`} className="w-12 h-12 rounded-md mr-4 object-cover bg-gray-200" />
                            <div className="flex-grow">
                                <h2 className="font-semibold text-gray-800">{uni.nom || uni.name}</h2>
                                <p className="text-sm text-gray-500">
                                    {uni.subjectCount} {uni.subjectCount > 1 ? 'sujets disponibles' : 'sujet disponible'}
                                </p>
                            </div>
                            <ChevronLeftIcon className="w-5 h-5 text-gray-400 transform -rotate-180" />
                        </Link>
                    ))
                ) : (
                    <p className="text-center text-gray-500 mt-8">
                        {searchTerm ? "Aucune université ne correspond à votre recherche." : "Aucune université n'a de sujets pour ce module."}
                    </p>
                )}
            </main>
        </div>
    );
}