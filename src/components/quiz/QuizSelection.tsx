import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useUser } from '../../context/UserContext';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

interface Subject {
    id: string;
    titre: string;
    module_id: string;
    universite_id: string;
    annee: number;
    modules?: {
        nom: string;
        icone_url: string | null;
    };
}

interface QuizSelectionProps {
    onSelectSubject: (subjectId: string) => void;
}

export function QuizSelection({ onSelectSubject }: QuizSelectionProps) {
    const { profile, loading: userLoading } = useUser();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchSubjects = async () => {
            if (userLoading) return;

            setLoading(true);
            try {
                let query = supabase
                    .from('sujets')
                    .select('id, titre, module_id, universite_id, annee, modules(nom, icone_url)')
                    .order('created_at', { ascending: false });

                // Filter by user's faculty and level if available
                if (profile?.faculte_id) {
                    query = query.eq('faculte_id', profile.faculte_id);
                }
                if (profile?.niveau_id) {
                    query = query.eq('niveau_id', profile.niveau_id);
                }

                const { data, error } = await query;

                if (error) throw error;

                // Transform data to match Subject interface
                const transformedData: Subject[] = (data || []).map((item: any) => ({
                    ...item,
                    modules: Array.isArray(item.modules) && item.modules.length > 0 ? item.modules[0] : item.modules
                }));

                // Fix type mismatch
                setSubjects(transformedData);
            } catch (err) {
                console.error('Error fetching subjects:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubjects();
    }, [profile, userLoading]);

    const filteredSubjects = subjects.filter(subject =>
        subject.titre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Choisir un sujet</h1>
                <div className="relative">
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

            <main className="p-4">
                {loading ? (
                    <div className="grid gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-gray-200 h-24 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredSubjects.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">Aucun sujet disponible</p>
                        <p className="text-gray-400 text-sm mt-2">Les sujets avec des questions apparaîtront ici</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredSubjects.map((subject) => (
                            <button
                                key={subject.id}
                                onClick={() => onSelectSubject(subject.id)}
                                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        {subject.modules?.icone_url ? (
                                            <img src={subject.modules.icone_url} alt="" className="w-6 h-6" />
                                        ) : (
                                            <span className="text-2xl">📝</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {subject.titre}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            {subject.modules?.nom && (
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                    {subject.modules.nom}
                                                </span>
                                            )}
                                            {subject.annee && (
                                                <span className="text-gray-400">{subject.annee}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
