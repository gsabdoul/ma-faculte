import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useUser } from '../../context/UserContext';
import { MagnifyingGlassIcon, FunnelIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';

interface Module {
    id: string;
    nom: string;
    icone_url: string | null;
}

interface University {
    id: string;
    nom: string;
}

interface Subject {
    id: string;
    module_id: string;
    modules?: {
        nom: string;
        icone_url: string | null;
    };
    annee?: number;
    session?: string;
    universites?: {
        nom: string;
    };
}

interface QuizSelectionProps {
    onStartQuiz: (config: any) => void;
}

export function QuizSelection({ onStartQuiz }: QuizSelectionProps) {
    const { profile } = useUser() as any; // TODO: Add 'profile' to UserContextType
    const [, setLoading] = useState(true);

    // Sessions Data

    const [userQuizzes, setUserQuizzes] = useState<any[]>([]);

    // List View Data
    const [, setSubjects] = useState<Subject[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Generator Modal Data
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [modules, setModules] = useState<Module[]>([]); // For the modal
    const [universities, setUniversities] = useState<University[]>([]); // For the modal
    const [years, setYears] = useState<number[]>([]); // For available years filtering

    // Generator Selection State
    const [genModule, setGenModule] = useState<{ id: string, name: string } | null>(null);
    const [genUniversity, setGenUniversity] = useState<{ id: string, name: string } | null>(null);
    const [genYear, setGenYear] = useState<string>('');
    const [genSession, setGenSession] = useState<string>(''); // 'Normale', 'Rattrapage'
    const [genTypes, setGenTypes] = useState<string[]>(['qcm', 'qroc', 'cas_clinique']); // Default all
    const [genQuestionCount, setGenQuestionCount] = useState<number>(20);

    // Dynamic Stats
    const [maxQuestions, setMaxQuestions] = useState<number>(0);
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);

    // 1. Fetch Initial Data (Subjects for list + Modules/Unis for modal)
    useEffect(() => {
        const fetchData = async () => {
            if (!profile) return;
            setLoading(true);
            try {
                // Fetch Subjects (Recent ones or all matching profile) for the list
                let subjectsQuery = supabase
                    .from('sujets')
                    .select('id, module_id, annee, session, modules(nom, icone_url), universites(nom)')
                    .order('created_at', { ascending: false });

                if (profile.faculte_id) subjectsQuery = subjectsQuery.eq('faculte_id', profile.faculte_id);
                if (profile.niveau_id) subjectsQuery = subjectsQuery.eq('niveau_id', profile.niveau_id);

                const { data: subjectsData, error: subjectsError } = await subjectsQuery;
                if (subjectsError) throw subjectsError;

                const formattedSubjects: Subject[] = (subjectsData || []).map((s: any) => ({
                    ...s,
                    modules: Array.isArray(s.modules) ? s.modules[0] : s.modules,
                    universites: Array.isArray(s.universites) ? s.universites[0] : s.universites
                }));
                setSubjects(formattedSubjects);

                // Extract unique modules, unis, years from subjects for the generator dropdowns
                const uniqueModules = new Map();
                const uniqueYears = new Set<number>();

                formattedSubjects.forEach(s => {
                    if (s.modules) uniqueModules.set(s.module_id, { id: s.module_id, nom: s.modules.nom, icone_url: s.modules.icone_url });
                    if (s.annee) uniqueYears.add(s.annee);
                });

                // Fetch Universites directly for complete list
                const { data: unisData } = await supabase.from('universites').select('id, nom');
                setUniversities(unisData || []);

                setModules(Array.from(uniqueModules.values()));
                setYears(Array.from(uniqueYears).sort((a, b) => b - a));

            } catch (err) {
                console.error("Error loading quiz selection data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile]);

    // 2. Fetch Dynamic Stats (Count + Types) when filters change
    useEffect(() => {
        const fetchStats = async () => {
            if (!genModule) {
                setMaxQuestions(0);
                setAvailableTypes([]);
                return;
            }

            setMaxQuestions(0);
            setAvailableTypes([]);
            try {
                // 1. Get Subject IDs
                let query = supabase.from('sujets').select('id');
                query = query.eq('module_id', genModule.id);
                if (genUniversity) query = query.eq('universite_id', genUniversity.id);
                if (genYear) query = query.eq('annee', parseInt(genYear));
                if (genSession) query = query.eq('session', genSession);

                const { data: subjectsData, error: subjError } = await query;
                if (subjError) throw subjError;

                const subjectIds = subjectsData.map(s => s.id);

                if (subjectIds.length === 0) {
                    setMaxQuestions(0);
                    setAvailableTypes([]);
                    setGenQuestionCount(0);
                    return;
                }

                // 2. Get Questions Stats
                const { data: questionsData, error: qError } = await supabase
                    .from('questions')
                    .select('type')
                    .in('sujet_id', subjectIds);

                if (qError) throw qError;

                // Available types (based on all questions)
                const types = Array.from(new Set(questionsData?.map(q => q.type))).filter(Boolean) as string[];
                setAvailableTypes(types);

                // Max questions (based on SELECTED types)
                const relevantQuestions = questionsData?.filter(q => genTypes.includes(q.type)) || [];
                const total = relevantQuestions.length;
                setMaxQuestions(total);

                // Adjust current selection if needed
                if (genQuestionCount > total) setGenQuestionCount(total);
                if (total > 0 && genQuestionCount === 0) setGenQuestionCount(Math.min(20, total));

            } catch (err) {
                console.error("Error calculating stats", err);
            }
        };

        const timer = setTimeout(fetchStats, 500); // Debounce
        return () => clearTimeout(timer);
    }, [genModule, genUniversity, genYear, genSession, genTypes]);

    // Fetch User Quizzes
    useEffect(() => {
        if (!profile) return;

        const fetchUserQuizzes = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('user_quizzes')
                    .select('*')
                    .eq('user_id', profile.id)
                    .order('updated_at', { ascending: false });

                if (error) throw error;
                setUserQuizzes(data || []);
            } catch (err) {
                console.error("Error loading user quizzes", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserQuizzes();
    }, [profile]);

    // Filter user quizzes for List View
    const filteredQuizzes = userQuizzes.filter(q =>
        (q.title || "Quiz").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleGenerate = () => {
        if (!genModule) {
            alert("Veuillez sélectionner un module.");
            return;
        }

        const config = {
            mode: 'generator',
            moduleId: genModule.id,
            universiteId: genUniversity?.id,
            annee: genYear ? Number(genYear) : undefined,
            session: genSession || undefined,
            types: genTypes,
            questionCount: genQuestionCount // Pass the count
        };
        onStartQuiz(config);
    };

    const toggleGenType = (type: string) => {
        setGenTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Voulez-vous vraiment supprimer ce quiz ?")) return;

        try {
            const { error } = await supabase.from('user_quizzes').delete().eq('id', id);
            if (error) throw error;
            setUserQuizzes(prev => prev.filter(q => q.id !== id));
        } catch (err) {
            console.error("Error deleting quiz", err);
            alert("Erreur lors de la suppression.");
        }
    };

    const handleResumeQuiz = (quiz: any) => {
        onStartQuiz({
            mode: 'resume',
            quizId: quiz.id,
            // We pass the config just in case, but Page will re-fetch details
            initialConfig: quiz.config
        });
    };

    // Rename & Restart Logic
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [quizToRename, setQuizToRename] = useState<{ id: string, title: string } | null>(null);
    const [newQuizTitle, setNewQuizTitle] = useState("");

    const handleRestartQuiz = (quiz: any, e: React.MouseEvent) => {
        e.stopPropagation();
        onStartQuiz(quiz.config); // Re-run generator/config
    };

    const openRenameModal = (quiz: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setQuizToRename(quiz);
        setNewQuizTitle(quiz.title || "");
        setRenameModalOpen(true);
    };

    const handleRenameSubmit = async () => {
        if (!quizToRename || !newQuizTitle.trim()) return;

        try {
            const { error } = await supabase.from("user_quizzes").update({ title: newQuizTitle }).eq("id", quizToRename.id);
            if (error) throw error;

            setUserQuizzes(prev => prev.map(q => q.id === quizToRename.id ? { ...q, title: newQuizTitle } : q));
            setRenameModalOpen(false);
        } catch (err) {
            console.error("Error renaming quiz", err);
            alert("Erreur lors du renommage.");
        }
    };

    // ... (keep existing render logic for loading)

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            {/* Header Area */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Mes Quiz</h1>
                    <p className="text-gray-500 text-sm">Gérez vos sessions et reprenez votre progression</p>
                </div>

                <button
                    onClick={() => setIsGeneratorOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 font-medium"
                >
                    <FunnelIcon className="w-5 h-5" />
                    <span>Nouveau Quiz</span>
                </button>
            </div>

            {/* Content Area */}
            {/* Content Area - User Quizzes List */}
            {/* Search Bar - Re-added for the new view */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Rechercher dans mes quiz..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                {/* List Logic - Replacing "History View" wrapper */}
                {filteredQuizzes.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PlayIcon className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Aucun quiz trouvé</h3>
                        <p className="text-gray-500 mt-1">Générez un nouveau quiz pour commencer.</p>
                    </div>
                ) : (


                    <div className="divide-y divide-gray-100">
                        {filteredQuizzes.map(quiz => (
                            <div key={quiz.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between group gap-4">
                                <div className="flex-1 cursor-pointer" onClick={() => handleResumeQuiz(quiz)}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {quiz.title || "Quiz Sans Titre"}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${quiz.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {quiz.status === 'completed' ? 'Terminé' : 'En cours'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                        <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{quiz.current_question_index} / {quiz.total_questions} questions</span>
                                        <span>•</span>
                                        <span>Score: {(quiz.score / (quiz.total_questions || 1) * 100).toFixed(0)}%</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full max-w-md bg-gray-200 rounded-full h-1.5">
                                        <div
                                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${(quiz.current_question_index / (quiz.total_questions || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-start md:self-center">
                                    <button
                                        onClick={(e) => openRenameModal(quiz, e)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        title="Renommer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => handleRestartQuiz(quiz, e)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        title="Recommencer (Nouveau)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Supprimer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleResumeQuiz(quiz)}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                    >
                                        Reprendre
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Rename Modal */}
                <Modal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)} title="Renommer le Quiz">
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={newQuizTitle}
                            onChange={(e) => setNewQuizTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nouveau titre..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRenameModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleRenameSubmit}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>

            {/* Generator Modal */}
            <Modal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} title="Générateur de Quiz">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                        <SearchableSelect
                            options={modules.map(m => ({ id: m.id, name: m.nom }))}
                            value={genModule?.name || ''}
                            onChange={(val) => setGenModule(val)}
                            placeholder="Sélectionner un module"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Université (Optionnel)</label>
                            <SearchableSelect
                                options={universities.map(u => ({ id: u.id, name: u.nom }))}
                                value={genUniversity?.name || ''}
                                onChange={(val) => setGenUniversity(val)}
                                placeholder="Toutes"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Année (Optionnel)</label>
                            <select
                                value={genYear}
                                onChange={(e) => setGenYear(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 border px-3"
                            >
                                <option value="">Toutes</option>
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                        <select
                            value={genSession}
                            onChange={(e) => setGenSession(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 border px-3"
                        >
                            <option value="">Peu importe</option>
                            <option value="Normale">Normale</option>
                            <option value="Rattrapage">Rattrapage</option>
                        </select>
                    </div>

                    {/* Question Types & Slider - Only show if we have questions */}
                    {maxQuestions > 0 && (
                        <>
                            {/* Question Types checkboxes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Types de questions</label>
                                <div className="flex gap-4">
                                    {[
                                        { id: 'qcm', label: 'QCM' },
                                        { id: 'qroc', label: 'QROC' },
                                        { id: 'cas_clinique', label: 'Cas Clinique' },
                                    ]
                                        .filter(t => availableTypes.includes(t.id)) // Filter unavailable types
                                        .map(t => (
                                            <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={genTypes.includes(t.id)}
                                                    onChange={() => toggleGenType(t.id)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                />
                                                <span className="text-sm text-gray-700">{t.label}</span>
                                            </label>
                                        ))}
                                </div>
                            </div>

                            {/* Question Count Slider */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre de questions: <span className="text-blue-600 font-bold">{genQuestionCount}</span>
                                    <span className="text-gray-400 text-xs ml-2">(Max: {maxQuestions})</span>
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max={Math.max(5, maxQuestions)}
                                    step="1"
                                    disabled={maxQuestions === 0}
                                    value={genQuestionCount}
                                    onChange={(e) => setGenQuestionCount(parseInt(e.target.value))}
                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${maxQuestions === 0 ? 'bg-gray-100' : 'bg-gray-200 accent-blue-600'}`}
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>5</span>
                                    <span>{maxQuestions}</span>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={handleGenerate}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            Lancer le Quiz
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
