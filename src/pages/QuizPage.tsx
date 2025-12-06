import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QuizSelection } from '../components/quiz/QuizSelection';
import QuizPlayer from '../components/quiz/QuizPlayer';
import { supabase } from '../supabase';

interface Question {
    id: number;
    content: string;
    type: 'qcm' | 'qroc' | 'cas_clinique';
    points: number;
    image_url: string | null;
    numero: number;
    explanation: string | null;
    expected_answer: string | null;
    options?: any[];
}

const updateUserStats = async (score: number, total: number) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('user_stats')
            .upsert({
                user_id: user.id,
                quizzes_completed: 1,
                total_points: score,
                average_score: total > 0 ? (score / total) * 100 : 0,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        console.log('User stats updated:', data);
    } catch (err) {
        console.error('Error updating user stats:', err);
    }
};

export function QuizPage() {
    const { subjectId } = useParams<{ subjectId?: string }>();

    // Config state for the generator
    const [quizConfig, setQuizConfig] = useState<any | null>(null);

    // Persistent Quiz Session
    const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
    const [initialPlayerState, setInitialPlayerState] = useState<any>(null);

    // Derived state for legacy or config
    const [activeSubjectId, setActiveSubjectId] = useState<string | null>(subjectId || null);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);

    // Effect to handle URL params (Legacy direct link)
    useEffect(() => {
        if (subjectId) {
            setActiveSubjectId(subjectId);
            setQuizConfig(null);
            setQuizSessionId(null);
            setInitialPlayerState(null);
        }
    }, [subjectId]);

    // Main fetch effect
    useEffect(() => {
        if (!activeSubjectId && !quizConfig) {
            setQuestions([]);
            return;
        }

        const fetchQuestions = async () => {
            setLoading(true);
            try {
                // CASE 1: RESUME Existing Session
                if (quizConfig?.mode === 'resume' && quizConfig.quizId) {
                    const { data: sessionData, error: sessionError } = await supabase
                        .from('user_quizzes')
                        .select('*')
                        .eq('id', quizConfig.quizId)
                        .single();

                    if (sessionError) throw sessionError;

                    // Load questions from snapshot
                    setQuestions(sessionData.questions);
                    setQuizSessionId(sessionData.id);
                    setInitialPlayerState({
                        currentIndex: sessionData.current_question_index || 0,
                        answers: sessionData.answers?.answers || {}, // assuming answers stored as { answers: {...}, ... }
                        elapsedTime: sessionData.answers?.elapsedTime || 0, // TODO: refine structure
                        submittedQROC: sessionData.answers?.submittedQROC || {},
                        qrocSelfEval: sessionData.answers?.qrocSelfEval || {}
                        // If we stored simpler "answers" jsonb locally in Player, we map it back here.
                        // Let's assume we store the "player state object" inside the `answers` column for simplicity
                        // OR we map `answers` column to just `answers` map. 
                        // Plan: Store full state object in `answers` column for now to be easiest.
                    });
                    // Note: `sessionData.answers` might need to be cast if we change schema intent.
                    // For now, let's treat `answers` column as "Player State JSON".
                    if (sessionData.answers) {
                        setInitialPlayerState(sessionData.answers);
                    }

                    setLoading(false);
                    return;
                }

                // CASE 2: NEW QUIZ (Subject or Generator)
                let query = supabase.from('questions').select('*');

                if (activeSubjectId && !quizConfig) {
                    // LEGACY: Direct Subject Mode
                    query = query.eq('sujet_id', activeSubjectId);
                } else if (quizConfig) {
                    // GENERATOR MODE
                    if (quizConfig.mode === 'subject' && quizConfig.subjectId) {
                        query = query.eq('sujet_id', quizConfig.subjectId);
                    } else if (quizConfig.mode === 'generator' && quizConfig.moduleId) {
                        // 1. Find Subjects matching the filters
                        let subjectQuery = supabase.from('sujets').select('id').eq('module_id', quizConfig.moduleId);

                        if (quizConfig.universiteId) subjectQuery = subjectQuery.eq('universite_id', quizConfig.universiteId);
                        if (quizConfig.annee) subjectQuery = subjectQuery.eq('annee', quizConfig.annee);
                        if (quizConfig.session) subjectQuery = subjectQuery.eq('session', quizConfig.session);

                        const { data: subjects, error: subjError } = await subjectQuery;
                        if (subjError) throw subjError;
                        const subjectIds = subjects.map(s => s.id);

                        if (subjectIds.length === 0) {
                            setQuestions([]);
                            setLoading(false);
                            return;
                        }
                        query = query.in('sujet_id', subjectIds);
                    }

                    // Apply Type Filter
                    if (quizConfig.types && quizConfig.types.length > 0) {
                        query = query.in('type', quizConfig.types);
                    }
                }

                // Execute Query (Fetch pool for randomness, e.g. 100)
                const { data: questionsData, error: questionsError } = await query.order('numero').limit(100);
                if (questionsError) throw questionsError;

                if (!questionsData || questionsData.length === 0) {
                    setQuestions([]);
                    return;
                }

                // Fetch options
                const questionIds = questionsData.map(q => q.id);
                const { data: optionsData, error: optionsError } = await supabase
                    .from('options')
                    .select('*')
                    .in('question_id', questionIds);

                if (optionsError) throw optionsError;

                // Merge
                const questionsWithOptions = questionsData.map(q => ({
                    ...q,
                    options: optionsData?.filter(o => o.question_id === q.id) || []
                }));

                // Randomize if generator
                if (quizConfig && quizConfig.mode === 'generator') {
                    questionsWithOptions.sort(() => Math.random() - 0.5);
                }

                // Apply Question Count Limit
                const finalLimit = quizConfig?.questionCount || 50;
                setQuestions(questionsWithOptions.slice(0, finalLimit));
                setInitialPlayerState(null); // Reset state for new quiz

                // Create Session if we are in a "Logged In" context (user exists)
                // We'll require user auth for this feature.
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Generate Title
                    const dateStr = new Date().toLocaleDateString();
                    let title = "Quiz";
                    if (quizConfig?.mode === 'subject' || activeSubjectId) {
                        // We might want to fetch subject title if possible, but for now generic.
                        // Or if we have subjectId, we can query it? Too many queries.
                        title = `Quiz Chapitre - ${dateStr}`;
                    } else {
                        title = `Quiz Personnalisé - ${dateStr}`;
                    }

                    const { data: sessionData, error: createError } = await supabase
                        .from('user_quizzes')
                        .insert({
                            user_id: user.id,
                            title: title,
                            questions: questionsWithOptions, // Snapshot
                            total_questions: questionsWithOptions.length,
                            config: quizConfig || { mode: 'legacy', subjectId: activeSubjectId },
                            answers: {}, // Empty start state
                            status: 'in_progress'
                        })
                        .select()
                        .single();

                    if (!createError && sessionData) {
                        setQuizSessionId(sessionData.id);
                    }
                }

            } catch (err) {
                console.error('Error fetching questions:', err);
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [activeSubjectId, quizConfig]);

    const handlePlayerStateChange = async (state: any) => {
        if (!quizSessionId) return;

        // Calculate score for metadata
        // We might want to throttle this call (debounce)
        // For simplicity: Update DB.

        // Simple score calc for DB usage (approximate during play)
        // ... (complex calc not needed here, Player does it. We just save the state blob)
        // Actually, we should probably save 'score' in DB if we want to show it in list.
        // We can approximate it or trust Player to pass it if needed. 
        // For now, let's just save the answers blob.

        try {
            await supabase
                .from('user_quizzes')
                .update({
                    answers: state, // Save full player state
                    current_question_index: state.currentIndex,
                    status: state.isCompleted ? 'completed' : 'in_progress',
                    updated_at: new Date().toISOString()
                })
                .eq('id', quizSessionId);
        } catch (e) {
            console.error("Error auto-saving quiz", e);
        }
    };

    const handleStartQuiz = (config: any) => {
        setQuestions([]); // Clear prev
        setQuizSessionId(null);
        setQuizConfig(config);
    };

    const handleBack = () => {
        setQuizConfig(null);
        setActiveSubjectId(null);
        setQuestions([]);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Determine if we are playing
    const isPlaying = questions.length > 0;

    return (
        <>
            {isPlaying ? (
                <QuizPlayer
                    questions={questions}
                    onBack={handleBack}
                    mode="practice"
                    onComplete={(score, total) => updateUserStats(score, total)}
                    initialState={initialPlayerState}
                    onStateChange={handlePlayerStateChange}
                />
            ) : (
                // Show Generator if not playing and not loading (and no empty state message forced)
                <QuizSelection onStartQuiz={handleStartQuiz} />
            )}
        </>
    );
}
