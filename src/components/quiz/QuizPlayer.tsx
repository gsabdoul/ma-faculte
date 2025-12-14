import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, BookmarkIcon, PencilSquareIcon, FlagIcon, TrashIcon, XCircleIcon, CheckIcon, LightBulbIcon } from '@heroicons/react/24/solid';
import { AddToPlaylistModal } from '../playlist/AddToPlaylistModal';
import { Modal } from '../ui/Modal';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useUser } from '../../context/UserContext';
import { useDebounce } from '../../hooks/useDebounce';

interface Question {
    id: number;
    content: string;
    type: 'qcm' | 'qroc' | 'cas_clinique';
    points: number;
    image_url: string | null;
    numero: number;
    explanation: string | null;
    expected_answer: string | null;
    options?: Option[];
}

interface Option {
    id: number;
    content: string;
    is_correct: boolean;
}

const isMultipleChoice = (question: Question) => {
    return question.type === 'qcm' && (question.options?.filter(o => o.is_correct).length ?? 0) > 1;
};

interface QuizState {
    currentIndex: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    answers: Record<number, any>;
    elapsedTime: number;
    submittedQROC: Record<number, boolean>;
    qrocSelfEval: Record<number, boolean>;
}

interface QuizPlayerProps {
    questions: Question[];
    quizId: string; // Unique identifier for the quiz to use with localStorage
    onBack: () => void;
    mode?: 'practice' | 'playlist' | 'challenge';
    initialState?: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        answers: Record<number, any>;
        currentIndex: number;
        elapsedTime: number;
        submittedQROC?: Record<number, boolean>;
        qrocSelfEval?: Record<number, boolean>;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onStateChange?: (state: any) => void;
    onComplete?: (score: number, total: number) => void;
}

export default function QuizPlayer({ questions, quizId, onBack, mode = 'practice', onComplete, initialState: explicitInitialState, onStateChange }: QuizPlayerProps) {
    const getLocalStorageKey = useCallback(() => `quiz-progress-${quizId}`, [quizId]);
    const isOnline = useOnlineStatus();
    const { user } = useUser();

    const [isLoadingState, setIsLoadingState] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [showResults, setShowResults] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [timerActive, setTimerActive] = useState(true);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [selectedQuestionForPlaylist, setSelectedQuestionForPlaylist] = useState<number | null>(null);
    const [savedQuestionIds, setSavedQuestionIds] = useState<Set<number>>(new Set());
    const [submittedQROC, setSubmittedQROC] = useState<Record<number, boolean>>({});
    const [qrocSelfEval, setQrocSelfEval] = useState<Record<number, boolean>>({});
    const [showCorrection, setShowCorrection] = useState(false);
    const [explanationVisibility, setExplanationVisibility] = useState<Record<number, boolean>>({});

    // State for Notes and Reports in Correction View
    const [userNotes, setUserNotes] = useState<Record<number, { id: string, content: string }>>({});
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [currentNoteQuestionId, setCurrentNoteQuestionId] = useState<number | null>(null);
    const [currentNoteContent, setCurrentNoteContent] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);

    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [questionToReport, setQuestionToReport] = useState<Question | null>(null);
    const [reportDescription, setReportDescription] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    // Refs for accessibility
    const noteTriggerRef = useRef<HTMLButtonElement | null>(null);
    const reportTriggerRef = useRef<HTMLButtonElement | null>(null);

    const calculateScore = useCallback(() => {
        let correctCount = 0;
        let totalPoints = 0;

        questions.forEach(q => {
            totalPoints += q.points || 1;
            const userAnswer = answers[q.id];

            if (q.type === 'qcm' && userAnswer !== undefined && q.options) {
                const correctOptions = q.options.filter(o => o.is_correct).map(o => o.id);
                if (isMultipleChoice(q)) {
                    const userAnswerSet = new Set(userAnswer as number[]);
                    const correctOptionsSet = new Set(correctOptions);
                    if (userAnswerSet.size === correctOptionsSet.size && [...userAnswerSet].every(id => correctOptionsSet.has(id))) {
                        correctCount += (q.points || 1);
                    }
                } else {
                    const correctOption = q.options.find(o => o.is_correct);
                    if (correctOption && userAnswer === correctOption.id) {
                        correctCount += (q.points || 1);
                    }
                }
            } else if (q.type === 'qroc' && qrocSelfEval[q.id] === true) {
                correctCount += (q.points || 1);
            }
        });

        return {
            score: correctCount,
            total: totalPoints,
            percentage: totalPoints > 0 ? Math.round((correctCount / totalPoints) * 100) : 0
        };
    }, [questions, answers, qrocSelfEval]);

    const currentState: QuizState = useMemo(() => ({
        currentIndex,
        answers,
        elapsedTime,
        submittedQROC,
        qrocSelfEval,
    }), [currentIndex, answers, elapsedTime, submittedQROC, qrocSelfEval]);

    const debouncedState = useDebounce(currentState, 1000); // Debounce state for 1 second

    const setStateFromLoadedData = (state: Partial<QuizState> | null) => {
        setCurrentIndex(state?.currentIndex || 0);
        setAnswers(state?.answers || {});
        setElapsedTime(state?.elapsedTime || 0);
        setSubmittedQROC(state?.submittedQROC || {});
        setQrocSelfEval(state?.qrocSelfEval || {});
    };

    // Load initial state from server or localStorage
    useEffect(() => {
        const loadInitialState = async () => {
            setIsLoadingState(true);
            if (explicitInitialState) {
                setStateFromLoadedData(explicitInitialState);
                setIsLoadingState(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            let remoteState: { state: QuizState, updated_at: string } | null = null;

            if (user && isOnline) {
                try {
                    const { data } = await supabase
                        .from('quiz_progress')
                        .select('state, updated_at')
                        .eq('user_id', user.id)
                        .eq('quiz_id', quizId)
                        .single();
                    if (data && typeof data.state === 'string') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        remoteState = { ...data, state: JSON.parse(data.state) } as any;
                    } else {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        remoteState = data as any;
                    }
                } catch (err) { console.error("Error fetching remote progress:", err); }
            }

            let localState: (QuizState & { updated_at: string }) | null = null;
            try {
                const saved = localStorage.getItem(getLocalStorageKey());
                if (saved) localState = JSON.parse(saved);
            } catch (err) { console.error("Error fetching local progress:", err); }

            // Logic to decide which state to use
            if (remoteState && localState) {
                // Use the most recent state
                if (new Date(remoteState.updated_at) > new Date(localState.updated_at)) {
                    setStateFromLoadedData(remoteState.state);
                } else {
                    setStateFromLoadedData(localState);
                }
            } else if (remoteState) {
                setStateFromLoadedData(remoteState.state);
            } else if (localState) {
                setStateFromLoadedData(localState);
            }

            setIsLoadingState(false);
        };

        loadInitialState();
    }, [quizId, isOnline, explicitInitialState, getLocalStorageKey]);

    // Effect for saving state (debounced)
    useEffect(() => {
        if (isLoadingState || showResults) return;

        const saveState = async () => {
            const stateWithTimestamp = { ...debouncedState, updated_at: new Date().toISOString() };

            if (isOnline) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('quiz_progress').upsert({
                        user_id: user.id,
                        quiz_id: quizId,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        state: debouncedState as any,
                        updated_at: stateWithTimestamp.updated_at,
                    }, { onConflict: 'user_id, quiz_id' });
                }
            }
            // Always save to localStorage for offline access and resilience
            localStorage.setItem(getLocalStorageKey(), JSON.stringify(stateWithTimestamp));
        };

        saveState();

        if (onStateChange) {
            onStateChange({ ...debouncedState, isCompleted: showResults });
        }
    }, [debouncedState, isOnline, quizId, isLoadingState, showResults, onStateChange, getLocalStorageKey]);

    // Effect to sync local changes when coming back online
    useEffect(() => {
        if (isOnline) {
            const syncOfflineProgress = async () => {
                const localData = localStorage.getItem(getLocalStorageKey());
                if (!localData) return;

                const localState = JSON.parse(localData);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Simple sync: just push local state to remote.
                // A more robust solution would compare timestamps.
                try {
                    await supabase.from('quiz_progress').upsert({
                        user_id: user.id,
                        quiz_id: quizId,
                        state: {
                            currentIndex: localState.currentIndex,
                            answers: localState.answers,
                            elapsedTime: localState.elapsedTime,
                            submittedQROC: localState.submittedQROC,
                            qrocSelfEval: localState.qrocSelfEval,
                        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                        updated_at: localState.updated_at,
                    }, { onConflict: 'user_id, quiz_id' });
                } catch (error) {
                    console.error("Failed to sync offline progress:", error);
                }
            };
            syncOfflineProgress();
        }
    }, [isOnline, quizId, getLocalStorageKey]);

    // Notify state changes (for parent components that need immediate feedback)
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                ...currentState,
                isCompleted: showResults
            });
        }
    }, [currentIndex, answers, elapsedTime, submittedQROC, qrocSelfEval, showResults, onStateChange, currentState]);

    useEffect(() => {
        const fetchSavedQuestions = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const questionIds = questions.map(q => q.id);
                const { data, error } = await supabase
                    .from('playlist_questions')
                    .select('question_id, playlists!inner(user_id)')
                    .eq('playlists.user_id', user.id)
                    .in('question_id', questionIds);

                if (error) throw error;

                const savedIds = new Set(data?.map(item => item.question_id) || []);
                setSavedQuestionIds(savedIds);
            } catch (err) {
                console.error('Error fetching saved questions:', err);
            }
        };

        if (questions.length > 0) {
            fetchSavedQuestions();
        }
    }, [questions]);

    // Fetch Notes when showing correction
    useEffect(() => {
        if (!showCorrection) return;

        const fetchNotes = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const qIds = questions.map(q => q.id);
                const { data, error } = await supabase
                    .from('user_notes')
                    .select('id, question_id, content')
                    .eq('user_id', user.id)
                    .in('question_id', qIds);

                if (error) throw error;

                const notesMap: Record<number, { id: string, content: string }> = {};
                data?.forEach(n => {
                    notesMap[n.question_id] = { id: n.id, content: n.content };
                });
                setUserNotes(notesMap);
            } catch (err) {
                console.error("Error fetching notes", err);
            }
        };
        fetchNotes();
    }, [showCorrection, questions]);


    const openNoteModal = (questionId: number, trigger: HTMLButtonElement) => {
        noteTriggerRef.current = trigger;
        setCurrentNoteQuestionId(questionId);
        setCurrentNoteContent(userNotes[questionId]?.content || "");
        setNoteModalOpen(true);
    };

    const closeNoteModal = () => {
        setNoteModalOpen(false);
        setCurrentNoteQuestionId(null);
        setCurrentNoteContent('');
        noteTriggerRef.current?.focus();
    };

    const handleSaveNote = async () => {
        if (!currentNoteQuestionId || !user) return;
        setIsSavingNote(true);
        try {
            const trimmed = currentNoteContent.trim();
            const { data, error } = await supabase
                .from('user_notes')
                .upsert({
                    user_id: user.id,
                    question_id: currentNoteQuestionId,
                    content: trimmed,
                }, { onConflict: 'user_id, question_id' })
                .select()
                .single();

            if (error) throw error;

            setUserNotes(prev => ({ ...prev, [currentNoteQuestionId]: { id: data!.id, content: data!.content } }));
            closeNoteModal();
        } catch (err) {
            console.error("Error saving note", err);
            alert("Erreur lors de l'enregistrement de la note");
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleDeleteNote = async () => {
        if (!currentNoteQuestionId || !userNotes[currentNoteQuestionId]) return;
        if (!window.confirm("Voulez-vous vraiment supprimer cette note ?")) return;

        try {
            const { error } = await supabase.from('user_notes').delete().eq('id', userNotes[currentNoteQuestionId].id);
            if (error) throw error;

            setUserNotes(prev => {
                const newNotes = { ...prev };
                delete newNotes[currentNoteQuestionId];
                return newNotes;
            });
            closeNoteModal();
        } catch {
            alert("Erreur lors de la suppression de la note.");
        }
    };

    const openReportModal = (question: Question, trigger: HTMLButtonElement) => {
        reportTriggerRef.current = trigger;
        setQuestionToReport(question);
        setReportModalOpen(true);
    };

    const closeReportModal = () => {
        setReportModalOpen(false);
        setQuestionToReport(null);
        setReportDescription('');
        reportTriggerRef.current?.focus();
    };

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!questionToReport || !user || !reportDescription.trim()) return;

        setIsSubmittingReport(true);
        try {
            const { error: insertError } = await supabase
                .from('signalements')
                .insert({
                    user_id: user.id,
                    item_id: quizId,
                    type: 'sujet_correction', // Using 'sujet_correction' as we are reporting context of a subject/quiz
                    description: `[Question #${questionToReport.id}] ${reportDescription.trim()}`,
                });

            if (insertError) throw insertError;

            alert('Votre signalement a été envoyé avec succès. Merci !');
            closeReportModal();
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(`Erreur lors de l'envoi du signalement : ${err.message}`);
        } finally {
            setIsSubmittingReport(false);
        }
    };

    // Timer effect
    useEffect(() => {
        let interval: number;
        if (timerActive && !showResults) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerActive, showResults]);

    // Call onComplete when results are shown (for Challenge mode)
    useEffect(() => {
        if (showResults && !showCorrection && onComplete) {
            const { score, total } = calculateScore();
            onComplete(score, total);
        }
    }, [showResults, showCorrection, onComplete, calculateScore]);

    const currentQuestion = questions[currentIndex];

    // isMultipleChoice moved outside

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAnswerChange = (questionId: number, answer: any) => {
        const question = questions.find(q => q.id === questionId);
        if (question && isMultipleChoice(question)) {
            setAnswers(prev => {
                const existingAnswers = Array.isArray(prev[questionId]) ? prev[questionId] : [];
                const newAnswers = existingAnswers.includes(answer)
                    ? existingAnswers.filter(a => a !== answer)
                    : [...existingAnswers, answer];
                return { ...prev, [questionId]: newAnswers };
            });
        } else {
            setAnswers(prev => ({ ...prev, [questionId]: answer }));
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleSubmit = () => {
        setShowResults(true);
        setTimerActive(false);
    };

    const handleExit = async () => {
        // Clear saved progress on explicit exit
        localStorage.removeItem(getLocalStorageKey());
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('quiz_progress').delete().match({ user_id: user.id, quiz_id: quizId });
        }
        onBack();
    };

    // calculateScore moved up

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoadingState) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <header className="bg-white p-4 shadow-sm">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Retour"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-gray-600 text-lg">Aucune question disponible</p>
                    <p className="text-gray-400 text-sm mt-2">Revenez plus tard</p>
                </div>
            </div>
        );
    }

    if (showResults && !showCorrection) {
        const { score, total, percentage } = calculateScore();



        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <header className="bg-white p-4 shadow-sm flex items-center gap-3">
                    <button
                        onClick={handleExit}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Retour aux sujets"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <span className="font-medium text-gray-600">Retour aux sujets</span>
                </header>
                <div className="p-4 max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <CheckCircleIcon className="w-16 h-16 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Terminé !</h2>
                        <p className="text-gray-600 mb-8">Voici vos résultats</p>

                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
                            <div className="text-6xl font-bold text-blue-600 mb-2">{percentage}%</div>
                            <p className="text-gray-700 text-lg">{score} / {total} points</p>
                            <p className="text-gray-500 text-sm mt-2">Temps écoulé : {formatTime(elapsedTime)}</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setShowCorrection(true)}
                                className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                📝 Voir la correction
                            </button>

                            {mode !== 'challenge' && (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowResults(false);
                                            setShowCorrection(false);
                                            setStateFromLoadedData(null); // Reset state
                                            setTimerActive(true);
                                            handleExit(); // Clear stored progress
                                        }}
                                        className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Recommencer
                                    </button>
                                    <button
                                        onClick={handleExit}
                                        className="w-full bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Choisir un autre sujet
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (showCorrection) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
                    <button
                        onClick={() => setShowCorrection(false)}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Retour aux résultats"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">Correction détaillée</h2>
                </header>

                <main className="p-4 max-w-4xl mx-auto space-y-4">
                    {questions.map((question, index) => {
                        const userAnswer = answers[question.id];
                        let isCorrect = false;

                        if (question.type === 'qcm' && question.options) {
                            if (isMultipleChoice(question)) {
                                const correctIds = new Set(question.options.filter(o => o.is_correct).map(o => o.id));
                                const answerIds = new Set(userAnswer as number[] || []);
                                isCorrect = correctIds.size === answerIds.size && [...correctIds].every(id => answerIds.has(id));
                            } else {
                                const correctOption = question.options.find(o => o.is_correct);
                                isCorrect = !!(correctOption && userAnswer === correctOption.id);
                            }
                        }

                        return (
                            <div key={question.id} className="bg-white rounded-xl shadow-md p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                                Question {index + 1}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${question.type === 'qcm'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                {question.type === 'qcm' ? 'QCM' : question.type === 'qroc' ? 'QROC' : 'Cas Clinique'}
                                            </span>
                                            {question.type === 'qcm' && (
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">{question.content}</h3>
                                    </div>
                                </div>

                                {question.type === 'qcm' && question.options && (
                                    <div className="space-y-2 mb-4">
                                        {question.options.map((option) => {
                                            const isUserAnswer = isMultipleChoice(question)
                                                ? Array.isArray(answers[question.id]) && answers[question.id].includes(option.id)
                                                : userAnswer === option.id;

                                            const isCorrectOption = option.is_correct;

                                            let optionClass = 'bg-gray-50 border-gray-200'; // Non choisi, incorrect (défaut)
                                            if (isCorrectOption && isUserAnswer) {
                                                optionClass = 'bg-green-50 border-green-500'; // Trouvé: choisi et correct
                                            } else if (isCorrectOption && !isUserAnswer) {
                                                optionClass = 'bg-yellow-50 border-yellow-500'; // Manqué: non choisi mais correct
                                            } else if (!isCorrectOption && isUserAnswer) {
                                                optionClass = 'bg-red-50 border-red-500'; // Erreur: choisi mais incorrect
                                            }

                                            return (
                                                <div
                                                    key={option.id}
                                                    className={`p-3 rounded-lg border-2 ${optionClass}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800">{option.content}</span>
                                                        <div className="flex items-center gap-2">
                                                            {isUserAnswer && !isCorrectOption && ( // Erreur
                                                                <span className="text-red-600 text-sm font-medium flex items-center gap-1"><XCircleIcon className="w-4 h-4" /> Votre réponse</span>
                                                            )}
                                                            {isCorrectOption && isUserAnswer && ( // Trouvé
                                                                <span className="text-green-600 text-sm font-bold flex items-center gap-1"><CheckCircleIcon className="w-4 h-4" /> Trouvé</span>
                                                            )}
                                                            {isCorrectOption && !isUserAnswer && ( // Manqué
                                                                <span className="text-yellow-700 text-sm font-bold flex items-center gap-1"><CheckIcon className="w-4 h-4" /> Bonne réponse</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {question.type === 'qroc' && (
                                    <div className="space-y-3 mb-4">
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                            <p className="text-sm font-medium text-blue-700 mb-1">Votre réponse :</p>
                                            <p className="text-gray-800">{userAnswer || <span className="text-gray-400 italic">Non répondu</span>}</p>
                                        </div>
                                        {question.expected_answer && (
                                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                                                <p className="text-sm font-medium text-green-700 mb-1">Réponse attendue :</p>
                                                <p className="text-gray-800">{question.expected_answer}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {explanationVisibility[question.id] && question.explanation && (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                        <p className="text-sm font-medium text-yellow-800 mb-1">💡 Explication :</p>
                                        <p className="text-gray-700 text-sm">{question.explanation}</p>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end items-center gap-1">
                                    {question.explanation && (
                                        <button onClick={() => setExplanationVisibility(prev => ({ ...prev, [question.id]: !prev[question.id] }))} className={`p-2 rounded-full transition-colors ${explanationVisibility[question.id] ? 'text-yellow-600 bg-yellow-100' : 'text-gray-400 hover:bg-gray-200'}`} title="Afficher/Masquer l'explication">
                                            <LightBulbIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => openNoteModal(question.id, e.currentTarget)}
                                        className={`p-2 rounded-full transition-colors ${userNotes[question.id] ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:bg-gray-200'}`}
                                        title="Ajouter/Modifier une note"
                                    >
                                        <PencilSquareIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={(e) => openReportModal(question, e.currentTarget)}
                                        className="p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                        title="Signaler une erreur sur cette question"
                                    >
                                        <FlagIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                {userNotes[question.id]?.content && (
                                    <div className="mt-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                        <p className="text-xs font-bold text-yellow-800 mb-1">Ma Note :</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{userNotes[question.id].content}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <button
                        onClick={() => setShowCorrection(false)}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Retour aux résultats
                    </button>
                </main>

                <Modal isOpen={noteModalOpen} onClose={closeNoteModal} title="Note sur la question">
                    <div className="space-y-4">
                        <p className="bg-gray-100 p-3 rounded-md text-sm font-medium text-gray-600">
                            {questions.find(q => q.id === currentNoteQuestionId)?.content}
                        </p>
                        <textarea
                            value={currentNoteContent}
                            onChange={(e) => setCurrentNoteContent(e.target.value)}
                            className="w-full h-40 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Écrivez vos notes personnelles ici..."
                            autoFocus
                        ></textarea>
                        <div className="mt-6 flex justify-between items-center">
                            <div>
                                {userNotes[currentNoteQuestionId!] && (
                                    <button type="button" onClick={handleDeleteNote} className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1">
                                        <TrashIcon className="w-4 h-4" />
                                        Supprimer
                                    </button>
                                )}
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={closeNoteModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Annuler
                                </button>
                                <button type="button" onClick={handleSaveNote} disabled={isSavingNote} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                                    {isSavingNote ? 'Sauvegarde...' : 'Sauvegarder'}
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={reportModalOpen} onClose={closeReportModal} title="Signaler une erreur">
                    <form onSubmit={handleReportSubmit}>
                        <p className="bg-gray-100 p-3 rounded-md text-sm font-medium text-gray-600 mb-4">
                            {questionToReport?.content}
                        </p>
                        <p className="text-sm text-gray-600 mb-3">
                            Aidez-nous à améliorer la qualité des questions. Décrivez l'erreur que vous avez trouvée.
                        </p>
                        <textarea
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Votre description de l'erreur..."
                            required
                        ></textarea>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={closeReportModal}
                                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Annuler
                            </button>
                            <button type="submit" disabled={isSubmittingReport} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                                {isSubmittingReport ? 'Envoi...' : 'Envoyer le signalement'}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-3">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Retour"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <div className="flex-1 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">
                            Question {currentIndex + 1} / {questions.length}
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                                <span className="text-blue-600 font-mono font-bold">{formatTime(elapsedTime)}</span>
                                <span className="text-xs text-blue-500">⏱️</span>
                            </div>
                            <span className="text-sm text-gray-500">
                                {Object.keys(answers).length} / {questions.length} répondu(es)
                            </span>
                        </div>
                    </div>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </header>

            <main className="p-4 max-w-2xl mx-auto">
                <div className="bg-white rounded-xl shadow-md p-6 mb-4">
                    <div className="mb-4">
                        <div className="flex justify-between items-start mb-3">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                                {currentQuestion.type === 'qcm' ? 'QCM' : currentQuestion.type === 'qroc' ? 'QROC' : 'Cas Clinique'}
                            </span>
                            <button
                                onClick={() => {
                                    setSelectedQuestionForPlaylist(currentQuestion.id);
                                    setShowPlaylistModal(true);
                                }}
                                className={`transition-colors p-1 ${savedQuestionIds.has(currentQuestion.id)
                                    ? 'text-blue-600 hover:text-blue-700'
                                    : 'text-gray-400 hover:text-blue-600'
                                    }`}
                                title={savedQuestionIds.has(currentQuestion.id) ? "Gérer les playlists (Déjà ajouté)" : "Ajouter à une playlist"}
                            >
                                <BookmarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{currentQuestion.content}</h3>
                        {currentQuestion.image_url && (
                            <img
                                src={currentQuestion.image_url}
                                alt="Question"
                                className="w-full rounded-lg my-4"
                            />
                        )}
                    </div>

                    {currentQuestion.type === 'qcm' && currentQuestion.options && (
                        <div className="space-y-3">
                            {currentQuestion.options.map((option) => (
                                isMultipleChoice(currentQuestion) ? (
                                    <label
                                        key={option.id}
                                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(option.id)
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            name={`question-${currentQuestion.id}`}
                                            value={option.id}
                                            checked={Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(option.id)}
                                            onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                                            className="mr-3 rounded"
                                        />
                                        <span className="text-gray-800">{option.content}</span>
                                    </label>
                                ) : (
                                    <label
                                        key={option.id}
                                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${answers[currentQuestion.id] === option.id
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${currentQuestion.id}`}
                                            value={option.id}
                                            checked={answers[currentQuestion.id] === option.id}
                                            onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                                            className="mr-3"
                                        />
                                        <span className="text-gray-800">{option.content}</span>
                                    </label>
                                )
                            ))}
                        </div>
                    )}

                    {currentQuestion.type === 'qroc' && (
                        <div className="space-y-4">
                            <textarea
                                value={answers[currentQuestion.id] || ''}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                placeholder="Votre réponse..."
                                disabled={submittedQROC[currentQuestion.id]}
                                className={`w-full p-4 border-2 rounded-lg focus:outline-none min-h-32 ${submittedQROC[currentQuestion.id]
                                    ? 'bg-gray-100 border-gray-300'
                                    : 'border-gray-200 focus:border-blue-600'
                                    }`}
                            />

                            {!submittedQROC[currentQuestion.id] ? (
                                <button
                                    onClick={() => setSubmittedQROC(prev => ({ ...prev, [currentQuestion.id]: true }))}
                                    disabled={!answers[currentQuestion.id]?.trim()}
                                    className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ✓ Soumettre la réponse
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                                        <p className="text-sm font-medium text-green-700 mb-2">📗 Réponse attendue :</p>
                                        <p className="text-gray-800">
                                            {currentQuestion.expected_answer || "Aucune réponse attendue n'a été définie pour cette question."}
                                        </p>
                                    </div>

                                    <p className="text-center text-gray-700 font-medium">Avez-vous bien répondu ?</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setQrocSelfEval(prev => ({ ...prev, [currentQuestion.id]: true }))}
                                            className={`py-3 px-6 rounded-lg font-bold transition-colors ${qrocSelfEval[currentQuestion.id] === true
                                                ? 'bg-green-600 text-white'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}
                                        >
                                            ✓ Oui, j'ai trouvé
                                        </button>
                                        <button
                                            onClick={() => setQrocSelfEval(prev => ({ ...prev, [currentQuestion.id]: false }))}
                                            className={`py-3 px-6 rounded-lg font-bold transition-colors ${qrocSelfEval[currentQuestion.id] === false
                                                ? 'bg-red-600 text-white'
                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                }`}
                                        >
                                            ✗ Non, je me suis trompé
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between gap-3">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                        Précédent
                    </button>

                    {currentIndex === questions.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                            Terminer
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Suivant
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </main>

            {
                selectedQuestionForPlaylist && (
                    <AddToPlaylistModal
                        isOpen={showPlaylistModal}
                        onClose={() => {
                            setShowPlaylistModal(false);
                            // Refresh saved status
                            if (questions.length > 0) {
                                const fetchSavedQuestions = async () => {
                                    try {
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (!user) return;

                                        const questionIds = questions.map(q => q.id);
                                        const { data, error } = await supabase
                                            .from('playlist_questions')
                                            .select('question_id, playlists!inner(user_id)')
                                            .eq('playlists.user_id', user.id)
                                            .in('question_id', questionIds);

                                        if (error) throw error;

                                        const savedIds = new Set(data?.map(item => item.question_id) || []);
                                        setSavedQuestionIds(savedIds);
                                    } catch (err) {
                                        console.error('Error fetching saved questions:', err);
                                    }
                                };
                                fetchSavedQuestions();
                            }
                        }}
                        questionId={selectedQuestionForPlaylist}
                    />
                )
            }
        </div>
    );
}
