import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, BookmarkIcon } from '@heroicons/react/24/solid';
import { AddToPlaylistModal } from '../playlist/AddToPlaylistModal';

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

interface QuizPlayerProps {
    questions: Question[];
    onBack: () => void;
    mode?: 'practice' | 'playlist' | 'challenge';
    onComplete?: (score: number, total: number) => void;
}

export default function QuizPlayer({ questions, onBack, mode = 'practice', onComplete }: QuizPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [submittedQROC, setSubmittedQROC] = useState<Record<number, boolean>>({});
    const [qrocSelfEval, setQrocSelfEval] = useState<Record<number, boolean>>({});
    const [showResults, setShowResults] = useState(false);
    const [showCorrection, setShowCorrection] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [timerActive, setTimerActive] = useState(true);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [selectedQuestionForPlaylist, setSelectedQuestionForPlaylist] = useState<number | null>(null);
    const [savedQuestionIds, setSavedQuestionIds] = useState<Set<number>>(new Set());

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
    }, [showResults, showCorrection, onComplete]);

    const currentQuestion = questions[currentIndex];

    const handleAnswerChange = (questionId: number, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
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

    const calculateScore = () => {
        let correctCount = 0;
        let totalPoints = 0;

        questions.forEach(q => {
            totalPoints += q.points || 1;
            const userAnswer = answers[q.id];

            if (q.type === 'qcm' && userAnswer !== undefined) {
                const correctOption = q.options?.find(o => o.is_correct);
                if (correctOption && userAnswer === correctOption.id) {
                    correctCount += (q.points || 1);
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
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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
                        onClick={onBack}
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
                                            setCurrentIndex(0);
                                            setAnswers({});
                                            setSubmittedQROC({});
                                            setQrocSelfEval({});
                                            setElapsedTime(0);
                                            setTimerActive(true);
                                        }}
                                        className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Recommencer
                                    </button>
                                    <button
                                        onClick={onBack}
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

                        if (question.type === 'qcm') {
                            const correctOption = question.options?.find(o => o.is_correct);
                            isCorrect = !!(correctOption && userAnswer === correctOption.id);
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
                                            const isUserAnswer = userAnswer === option.id;
                                            const isCorrectOption = option.is_correct === true;

                                            return (
                                                <div
                                                    key={option.id}
                                                    className={`p-3 rounded-lg border-2 ${isCorrectOption
                                                        ? 'bg-green-50 border-green-500'
                                                        : isUserAnswer
                                                            ? 'bg-red-50 border-red-500'
                                                            : 'bg-gray-50 border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800">{option.content}</span>
                                                        <div className="flex items-center gap-2">
                                                            {isUserAnswer && !isCorrectOption && (
                                                                <span className="text-red-600 text-sm font-medium">Votre réponse</span>
                                                            )}
                                                            {isCorrectOption && (
                                                                <span className="text-green-600 text-sm font-bold">✓ Bonne réponse</span>
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

                                {question.explanation && (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                        <p className="text-sm font-medium text-yellow-800 mb-1">💡 Explication :</p>
                                        <p className="text-gray-700 text-sm">{question.explanation}</p>
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
