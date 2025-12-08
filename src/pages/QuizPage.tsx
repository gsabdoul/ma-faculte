import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

    // Persistent Quiz Session
    const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
    const [initialPlayerState, setInitialPlayerState] = useState<any>(null);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    // Main fetch effect
    useEffect(() => {
        const fetchQuizSession = async () => {
            if (!subjectId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { data: sessionData, error: sessionError } = await supabase
                    .from('user_quizzes')
                    .select('*')
                    .eq('id', subjectId)
                    .single();

                if (sessionError) throw sessionError;

                // Load questions and state from the fetched session
                setQuestions(sessionData.questions || []);
                setQuizSessionId(sessionData.id);
                setInitialPlayerState(sessionData.answers || null);

            } catch (err) {
                console.error('Error fetching questions:', err);
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizSession();
    }, [subjectId]);

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

    const handleBack = () => {
        window.history.back(); // Simple back navigation
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Determine if we are playing
    const isPlaying = !loading && questions.length > 0 && quizSessionId;

    return (
        <>
            {isPlaying ? (
                <QuizPlayer
                    questions={questions}
                    onBack={handleBack}
                    mode="practice"
                    onComplete={(score, total) => updateUserStats(score, total)}
                    initialState={initialPlayerState}
                    quizId={quizSessionId}
                    onStateChange={handlePlayerStateChange}
                />
            ) : (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center">
                    <h2 className="text-xl text-gray-600">Chargement du quiz...</h2>
                    <p className="text-gray-400">Si le chargement persiste, le quiz est peut-être introuvable.</p>
                </div>
            )}
        </>
    );
}
