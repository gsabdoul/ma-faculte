import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { supabase } from '../supabase';

interface Subject {
    id: string;
    titre: string;
    annee: number;
    created_at: string;
}

export function SubjectListPage() {
    const { moduleId, universityId } = useParams<{ moduleId: string; universityId: string }>();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleName, setModuleName] = useState('');
    const [universityName, setUniversityName] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch module name
                if (moduleId) {
                    const { data: moduleData } = await supabase
                        .from('modules')
                        .select('nom')
                        .eq('id', moduleId)
                        .single();
                    if (moduleData) setModuleName(moduleData.nom);
                }

                // Fetch university name
                if (universityId) {
                    const { data: uniData } = await supabase
                        .from('universites')
                        .select('nom')
                        .eq('id', universityId)
                        .single();
                    if (uniData) setUniversityName(uniData.nom);
                }

                // Fetch subjects
                const { data, error } = await supabase
                    .from('sujets')
                    .select('id, titre, annee, created_at')
                    .eq('module_id', moduleId)
                    .eq('universite_id', universityId)
                    .order('annee', { ascending: false });

                if (error) throw error;
                setSubjects(data || []);
            } catch (err) {
                console.error('Error fetching subjects:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [moduleId, universityId]);

    const filteredSubjects = subjects.filter(subject =>
        subject.titre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubjectClick = (subjectId: string) => {
        navigate(`/quiz/${subjectId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Retour"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Sujets disponibles</h1>
                </div>
                {moduleName && universityName && (
                    <p className="text-sm text-gray-500 mb-4">
                        {moduleName} - {universityName}
                    </p>
                )}
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
                    <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-gray-200 h-20 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredSubjects.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">Aucun sujet disponible</p>
                        <p className="text-gray-400 text-sm mt-2">
                            {searchTerm ? 'Aucun sujet ne correspond à votre recherche' : 'Aucun sujet trouvé pour cette combinaison'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredSubjects.map((subject) => (
                            <button
                                key={subject.id}
                                onClick={() => handleSubjectClick(subject.id)}
                                className="w-full bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                                            {subject.titre}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            {subject.annee && (
                                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                    {subject.annee}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-blue-600 group-hover:translate-x-1 transition-transform">
                                        <span className="text-sm font-medium">Quiz</span>
                                        <span className="text-xl">🎯</span>
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
