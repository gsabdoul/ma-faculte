import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import { supabase } from '../supabase';
import { useCachedStatus } from '../hooks/useCachedStatus';

const DownloadButton: React.FC<{ url?: string | null }> = ({ url }) => {
    const cached = useCachedStatus(url);
    if (!url || cached) return null;
    return (
        <button
            onClick={async (e) => {
                e.preventDefault();
                if (!url || typeof caches === 'undefined') return;
                try {
                    const cache = await caches.open('offline-pdfs');
                    await cache.add(url);
                } catch (err) {
                    // Silencieux: si l'ajout échoue, rien ne se passe
                }
            }}
            className="p-2 rounded-full hover:bg-blue-50"
            title="Enregistrer pour lecture hors ligne"
        >
            <DocumentArrowDownIcon className="w-6 h-6 text-blue-600" />
        </button>
    );
};

export function SujetPage() {
    const { moduleId, universityId } = useParams<{ moduleId?: string, universityId?: string }>();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const [module, setModule] = useState<any | null>(null);
    const [university, setUniversity] = useState<any | null>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!moduleId || !universityId) {
            setModule(null);
            setUniversity(null);
            setSubjects([]);
            setLoading(false);
            return;
        }

        let cancel = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                // Resolve module by id or by name (nom)
                let modRes = await supabase.from('modules').select('*').eq('id', moduleId).maybeSingle();
                let resolvedModule = modRes.data || null;
                if (!resolvedModule) {
                    const byName = await supabase.from('modules').select('*').ilike('nom', `${moduleId}%`).limit(1).maybeSingle();
                    resolvedModule = byName.data || null;
                }

                if (cancel) return;
                setModule(resolvedModule);

                // Resolve university by id or name
                let uniRes = await supabase.from('universites').select('*').eq('id', universityId).maybeSingle();
                let resolvedUni = uniRes.data || null;
                if (!resolvedUni) {
                    const byNameU = await supabase.from('universites').select('*').ilike('nom', `${universityId}%`).limit(1).maybeSingle();
                    resolvedUni = byNameU.data || null;
                }

                if (cancel) return;
                setUniversity(resolvedUni);

                if (!resolvedModule || !resolvedUni) {
                    setSubjects([]);
                    setLoading(false);
                    return;
                }

                // Fetch sujets matching module and universite
                const sujetsRes = await supabase.from('sujets').select('*').eq('module_id', resolvedModule.id).eq('universite_id', resolvedUni.id);
                if (sujetsRes.error) throw sujetsRes.error;

                if (cancel) return;
                // resolve google drive links for each subject
                const resolveDriveUrl = (url: string | null | undefined) => {
                    if (!url) return url;
                    const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                    const id = m1?.[1] || m2?.[1];
                    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
                    return url;
                };

                const enriched = (sujetsRes.data || []).map((s: any) => ({
                    ...s,
                    pdfUrlResolved: resolveDriveUrl(s.fichier_url || s.pdfUrl)
                }));

                setSubjects(enriched);
            } catch (err: any) {
                setError(err?.message || String(err));
                setSubjects([]);
            } finally {
                if (!cancel) setLoading(false);
            }
        };

        load();
        return () => { cancel = true; };
    }, [moduleId, universityId]);

    const filteredSubjects = useMemo(() => {
        if (!searchTerm) return subjects;
        return subjects.filter(s => (s.titre || s.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, subjects]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-gray-600">Chargement des sujets...</div>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Erreur : {error}</div>;
    }

    if (!module || !university) {
        return <div className="p-4 text-center text-red-500">Module ou université non trouvé.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                        <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                    </button>
                    <div className='flex-grow'>
                        <h1 className="text-xl font-bold text-gray-800 truncate">{university.nom || university.name}</h1>
                        <p className="text-sm text-gray-500">{module.nom || module.name}</p>
                    </div>
                </div>
                <div className="relative mt-4">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Rechercher un sujet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </header>

            <main className="p-4 space-y-3">
                {filteredSubjects.length > 0 ? (
                    filteredSubjects.map(sujet => (
                        <Link
                            key={sujet.id}
                            to={`/sujets/${sujet.id}`}
                            className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                            onClick={async () => {
                                const url = sujet.pdfUrlResolved || sujet.fichier_url || sujet.pdfUrl;
                                if (!url || typeof caches === 'undefined') return;
                                try {
                                    const cache = await caches.open('offline-pdfs');
                                    await cache.add(url);
                                } catch {}
                            }}
                        >
                            <DocumentTextIcon className="w-10 h-10 text-blue-500 mr-4" />
                            <div className="flex-grow">
                                <h2 className="font-semibold text-gray-800 leading-tight">{sujet.titre || sujet.title}</h2>
                                <p className="text-sm text-gray-500">{sujet.annee ? `Année ${sujet.annee}` : ''}</p>
                            </div>
                            <DownloadButton url={sujet.pdfUrlResolved || sujet.fichier_url || sujet.pdfUrl} />
                        </Link>
                    ))
                ) : (
                    <p className="text-center text-gray-500 mt-8">
                        {searchTerm ? "Aucun sujet ne correspond à votre recherche." : "Aucun sujet disponible pour le moment."}
                    </p>
                )}
            </main>
        </div>
    );
}