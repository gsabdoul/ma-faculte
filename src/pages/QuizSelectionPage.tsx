import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../context/UserContext';
import { MagnifyingGlassIcon, FunnelIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Modal } from '../components/ui/Modal';
import { QuizListItemSkeleton } from '../components/ui/QuizListItemSkeleton';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useNavigate } from 'react-router-dom';

interface Module {
    id: string;
    nom: string;
}

interface University {
    id: string;
    name: string;
}

interface UserQuiz {
    id: string;
    title: string | null;
    status: string;
    score: number;
    total_questions: number;
    current_question_index: number;
    created_at: string;
    config: any;
}

export function QuizSelectionPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [renameModalOpen, setRenameModalOpen] = useState(false);

    // Sessions Data
    const { data: userQuizzes = [], isLoading: isLoadingQuizzes, refetch: refetchUserQuizzes } = useQuery({
        queryKey: ['userQuizzes', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('user_quizzes')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });
            if (error) throw error;
            return (data as UserQuiz[]) || [];
        },
        enabled: !!user,
    });

    // Generator Modal Data
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [modules, setModules] = useState<Module[]>([]);
    const [availableUniversities, setAvailableUniversities] = useState<University[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [availableSessions, setAvailableSessions] = useState<string[]>([]);

    // Generator Selection State
    const [genModule, setGenModule] = useState<{ id: string, name: string } | null>(null);
    const [genUniversity, setGenUniversity] = useState<{ id: string, name: string } | null>(null);
    const [genYear, setGenYear] = useState<string>('');
    const [genSession, setGenSession] = useState<string>('');
    const [genTypes, setGenTypes] = useState<string[]>(['qcm', 'qroc', 'cas_clinique']);
    const [genQuestionCount, setGenQuestionCount] = useState<number>(20);

    const [quizToRename, setQuizToRename] = useState<UserQuiz | null>(null);
    const [newQuizTitle, setNewQuizTitle] = useState("");
    // Dynamic Stats
    const [maxQuestions, setMaxQuestions] = useState<number>(0);
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);

    // Fetch data for generator modal
    useEffect(() => {
        const fetchGeneratorData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Filtrer les modules en fonction du profil de l'utilisateur
                if (user.faculte_id && user.niveau_id) {
                    const { data: moduleLinks, error: linkError } = await supabase
                        .from('module_faculte_niveau')
                        .select('modules(id, nom)')
                        .eq('faculte_id', user.faculte_id)
                        .eq('niveau_id', user.niveau_id);

                    if (linkError) throw linkError;

                    const userModules = moduleLinks.map((link: any) => link.modules).filter(Boolean);
                    const uniqueModules = Array.from(new Map(userModules.map(m => [m.id, m])).values());
                    setModules(uniqueModules);
                } else {
                    // Fallback pour les admins ou si le profil est incomplet
                    const { data: modulesData, error: modulesError } = await supabase.from('modules').select('id, nom');
                    if (modulesError) throw modulesError;
                    setModules(modulesData || []);
                }

                // Pré-remplir l'université de l'utilisateur
                if (user.universite_id && user.universite_nom) {
                    setGenUniversity({ id: user.universite_id, name: user.universite_nom }); // 'name' correspond maintenant à l'interface University
                }

            } catch (err) {
                console.error("Error loading generator data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGeneratorData();
    }, [user]);

    // Fetch available universities when module changes
    useEffect(() => {
        const fetchAvailableUniversities = async () => {
            if (!genModule) {
                setAvailableUniversities([]);
                setGenUniversity(null); // Reset selected university
                return;
            }

            try {
                const { data: subjects, error } = await supabase
                    .from('sujets')
                    .select('universites(id, nom)')
                    .eq('module_id', genModule.id);

                if (error) throw error;

                const uniqueUniversities = Array.from(
                    new Map(subjects.map((s: any) => s.universites).filter(Boolean).map((u: any) => [u.id, u]))
                ).map(([, u]) => ({ id: (u as any).id, name: (u as any).nom }));

                setAvailableUniversities(uniqueUniversities);
            } catch (err) {
                console.error("Error fetching available universities", err);
            }
        };
        fetchAvailableUniversities();
    }, [genModule]);

    // Fetch available years and sessions based on module and university
    useEffect(() => {
        const fetchSubFilters = async () => {
            if (!genModule) {
                setAvailableYears([]);
                setAvailableSessions([]);
                setGenYear('');
                setGenSession('');
                return;
            }

            try {
                // Fetch Years
                let yearsQuery = supabase
                    .from('sujets')
                    .select('annee')
                    .eq('module_id', genModule.id)
                    .not('annee', 'is', null);

                if (genUniversity) {
                    yearsQuery = yearsQuery.eq('universite_id', genUniversity.id);
                }

                const { data: yearsData, error: yearsError } = await yearsQuery;
                if (yearsError) throw yearsError;

                const uniqueYears = Array.from(new Set(yearsData.map(y => y.annee))).sort((a, b) => b - a);
                setAvailableYears(uniqueYears);
                if (genYear && !uniqueYears.includes(Number(genYear))) setGenYear('');

                // Fetch Sessions
                let sessionsQuery = supabase
                    .from('sujets')
                    .select('session')
                    .eq('module_id', genModule.id)
                    .not('session', 'is', null);

                if (genUniversity) sessionsQuery = sessionsQuery.eq('universite_id', genUniversity.id);
                if (genYear) sessionsQuery = sessionsQuery.eq('annee', Number(genYear));

                const { data: sessionsData, error: sessionsError } = await sessionsQuery;
                if (sessionsError) throw sessionsError;

                const uniqueSessions = Array.from(new Set(sessionsData.map(s => s.session)));
                setAvailableSessions(uniqueSessions);
                if (genSession && !uniqueSessions.includes(genSession)) setGenSession('');

            } catch (err) {
                console.error("Error fetching sub-filters", err);
            }
        };

        fetchSubFilters();
    }, [genModule, genUniversity, genYear]); // Re-run when year changes to update sessions

    // Fetch Dynamic Stats when filters change
    useEffect(() => {
        const fetchStats = async () => {
            if (!genModule) {
                setIsCalculatingStats(false);
                setMaxQuestions(0);
                setAvailableTypes([]);
                return;
            }
            try {
                setIsCalculatingStats(true);
                let query = supabase.from('sujets').select('id').eq('module_id', genModule.id);
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

                const { data: questionsData, error: qError } = await supabase.from('questions').select('type').in('sujet_id', subjectIds) as { data: { type: string }[] | null, error: any };
                if (qError) throw qError;

                const types = Array.from(new Set(questionsData?.map(q => q.type))).filter(Boolean) as string[];
                setAvailableTypes(types);

                const relevantQuestions = questionsData?.filter(q => q.type && genTypes.includes(q.type)) || [];
                const total = relevantQuestions.length;
                setMaxQuestions(total);

                if (genQuestionCount > total) setGenQuestionCount(total);
                if (total > 0 && genQuestionCount === 0) setGenQuestionCount(Math.min(20, total));

            } catch (err) {
                console.error("Error calculating stats", err);
            } finally {
                setIsCalculatingStats(false);
            }
        };
        const timer = setTimeout(fetchStats, 500);
        return () => clearTimeout(timer);
    }, [genModule, genUniversity, genYear, genSession, genTypes]);

    const onStartQuiz = (config: any) => {
        // This function will now navigate to the QuizPage with the config
        navigate(`/quiz/${config.quizId}`);
    };

    const handleGenerate = () => {
        if (!genModule) {
            alert("Veuillez sélectionner un module.");
            return;
        }

        const createAndStartQuiz = async () => {
            if (!user) {
                alert("Vous devez être connecté pour créer un quiz.");
                return;
            }

            try {
                // 1. Find Subjects matching the filters
                let subjectQuery = supabase.from('sujets').select('id').eq('module_id', genModule!.id);
                if (genUniversity) subjectQuery = subjectQuery.eq('universite_id', genUniversity.id);
                if (genYear) subjectQuery = subjectQuery.eq('annee', Number(genYear));
                if (genSession) subjectQuery = subjectQuery.eq('session', genSession);

                const { data: subjects, error: subjError } = await subjectQuery;
                if (subjError) throw subjError;
                const subjectIds = subjects.map(s => s.id);

                if (subjectIds.length === 0) {
                    alert("Aucun sujet trouvé pour ces filtres.");
                    return;
                }

                // 2. Fetch questions
                let questionsQuery = supabase.from('questions').select('*, options(*)').in('sujet_id', subjectIds);
                if (genTypes.length > 0) {
                    questionsQuery = questionsQuery.in('type', genTypes);
                }
                const { data: questionsData, error: qError } = await questionsQuery.limit(100); // Fetch a pool
                if (qError) throw qError;

                // 3. Randomize and slice
                const finalQuestions = questionsData.sort(() => Math.random() - 0.5).slice(0, genQuestionCount);

                // 4. Create quiz session
                const dateStr = new Date().toLocaleDateString();
                const title = `Quiz Personnalisé - ${dateStr}`;
                const config = { mode: 'generator', moduleId: genModule!.id, universiteId: genUniversity?.id, annee: genYear ? Number(genYear) : undefined, session: genSession || undefined, types: genTypes, questionCount: genQuestionCount };

                const { data: sessionData, error: createError } = await supabase
                    .from('user_quizzes')
                    .insert({ user_id: user.id, title: title, questions: finalQuestions, total_questions: finalQuestions.length, config: config, answers: {}, status: 'in_progress' })
                    .select()
                    .single();

                if (createError) throw createError;

                // 5. Navigate to the player
                navigate(`/quiz/${sessionData.id}`);

            } catch (err: any) {
                console.error("Erreur lors de la génération du quiz:", err);
                alert(`Une erreur est survenue: ${err.message}`);
            }
        };

        createAndStartQuiz();
    };

    const toggleGenType = (type: string) => {
        setGenTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleRestartQuiz = (quiz: UserQuiz, e: React.MouseEvent) => {
        e.stopPropagation();
        if (quiz.config) {
            onStartQuiz(quiz.config); // Re-run generator/config
        } else {
            alert("Impossible de redémarrer ce quiz, la configuration est manquante.");
        }
    };

    const openRenameModal = (quiz: UserQuiz, e: React.MouseEvent) => {
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
            refetchUserQuizzes();
            setRenameModalOpen(false);
        } catch (err) {
            console.error("Error renaming quiz", err);
            alert("Erreur lors du renommage.");
        }
    };
    const handleResumeQuiz = (quiz: UserQuiz) => {
        navigate(`/quiz/${quiz.id}`, { state: { resume: true } });
    };

    const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Voulez-vous vraiment supprimer ce quiz ?")) return;
        try {
            const { error } = await supabase.from('user_quizzes').delete().eq('id', id);
            if (error) throw error;
            refetchUserQuizzes(); // Re-fetch the list
        } catch (err) {
            console.error("Error deleting quiz", err);
            alert("Erreur lors de la suppression.");
        }
    };

    // Filter user quizzes for List View
    const filteredQuizzes = userQuizzes.filter(q =>
        (q.title || "Quiz").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedQuizzes = useMemo(() => {
        const modulesMap = new Map(modules.map(m => [m.id, m.nom]));
        return filteredQuizzes.reduce((acc, quiz) => {
            const group = quiz.status === 'completed' ? 'completed' : 'in_progress';
            const moduleName = modulesMap.get(quiz.config?.moduleId) || 'Module inconnu';
            const quizWithModule = { ...quiz, moduleName };
            if (!acc[group]) acc[group] = [];
            acc[group].push(quizWithModule);
            return acc;
        }, {} as Record<string, (UserQuiz & { moduleName: string })[]>);
    }, [filteredQuizzes, modules]);

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

            {/* User Quizzes List */}
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

                {isLoadingQuizzes ? (
                    <div>
                        {/* Affiche 3 squelettes pendant le chargement */}
                        <QuizListItemSkeleton />
                        <QuizListItemSkeleton />
                        <QuizListItemSkeleton />
                    </div>
                ) :
                    filteredQuizzes.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PlayIcon className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Aucun quiz trouvé</h3>
                            <p className="text-gray-500 mt-1">Générez un nouveau quiz pour commencer.</p>
                        </div>
                    ) : (
                        <div>
                            {Object.entries(groupedQuizzes).map(([status, quizzes]) => (
                                <div key={status}>
                                    <h2 className="px-6 py-3 text-sm font-semibold text-gray-500 bg-gray-50 border-b border-t">
                                        {status === 'in_progress' ? 'En cours' : 'Terminés'}
                                    </h2>
                                    <div className="divide-y divide-gray-100">
                                        {quizzes.map(quiz => (
                                            <div key={quiz.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between group gap-4">
                                                <div className="flex-1 cursor-pointer" onClick={() => handleResumeQuiz(quiz)}>
                                                    <p className="text-sm font-semibold text-blue-600 mb-1">{quiz.moduleName}</p>
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
                                                    <div className="w-full max-w-md bg-gray-200 rounded-full h-1.5">
                                                        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(quiz.current_question_index / (quiz.total_questions || 1)) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
                                                    <button onClick={(e) => openRenameModal(quiz, e)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Renommer">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                                                    </button>
                                                    <button onClick={(e) => handleRestartQuiz(quiz, e)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Recommencer (Nouveau)">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                                                    </button>
                                                    <button onClick={(e) => handleDeleteQuiz(quiz.id, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Supprimer">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                                    </button>
                                                    <button onClick={() => handleResumeQuiz(quiz)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                                        Reprendre
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
            </div>

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
                        <button onClick={() => setRenameModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            Annuler
                        </button>
                        <button onClick={handleRenameSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Enregistrer
                        </button>
                    </div>
                </div>
            </Modal>

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
                                options={availableUniversities} // Directement compatible maintenant
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
                                disabled={availableYears.length === 0}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 border px-3 disabled:bg-gray-100"
                            >
                                <option value="">Toutes</option>
                                {availableYears.map(y => (
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
                            disabled={availableSessions.length === 0}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 border px-3 disabled:bg-gray-100"
                        >
                            <option value="">Peu importe</option>
                            {availableSessions.includes('Normale') && <option value="Normale">Normale</option>}
                            {availableSessions.includes('Rattrapage') && <option value="Rattrapage">Rattrapage</option>}
                        </select>
                    </div>

                    {maxQuestions > 0 && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Types de questions</label>
                                <div className="flex gap-4">
                                    {[{ id: 'qcm', label: 'QCM' }, { id: 'qroc', label: 'QROC' }, { id: 'cas_clinique', label: 'Cas Clinique' }]
                                        .filter(t => availableTypes.includes(t.id))
                                        .map(t => (
                                            <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={genTypes.includes(t.id)} onChange={() => toggleGenType(t.id)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                                                <span className="text-sm text-gray-700">{t.label}</span>
                                            </label>
                                        ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de questions: <span className="text-blue-600 font-bold">{genQuestionCount}</span><span className="text-gray-400 text-xs ml-2">(Max: {maxQuestions})</span></label>
                                <input type="range" min="5" max={Math.max(5, maxQuestions)} step="1" disabled={maxQuestions === 0} value={genQuestionCount} onChange={(e) => setGenQuestionCount(parseInt(e.target.value))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${maxQuestions === 0 ? 'bg-gray-100' : 'bg-gray-200 accent-blue-600'}`} />
                                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5</span><span>{maxQuestions}</span></div>
                            </div>
                        </>
                    )}

                    {genModule && maxQuestions === 0 && !isCalculatingStats && (
                        <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                            <p className="text-sm font-medium">Aucune question n'a été trouvée pour les filtres sélectionnés. Essayez d'élargir votre recherche.</p>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={handleGenerate}
                            disabled={!genModule || maxQuestions === 0}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            Lancer le Quiz
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}