import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';
import QuizPlayer from '../components/quiz/QuizPlayer';

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

export default function ChallengeGamePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || !user) return;

        const fetchQuestions = async () => {
            try {
                // Get challenge details
                const { data: challenge, error: challengeError } = await supabase
                    .from('challenges')
                    .select('questions')
                    .eq('id', id)
                    .single();

                if (challengeError) throw challengeError;

                const questionIds = challenge.questions || [];

                if (questionIds.length === 0) {
                    throw new Error("No questions in this challenge");
                }

                // Fetch questions
                const { data: questionsData, error: questionsError } = await supabase
                    .from('questions')
                    .select('*')
                    .in('id', questionIds);

                if (questionsError) throw questionsError;

                // Fetch options for QCM questions
                const { data: optionsData, error: optionsError } = await supabase
                    .from('options')
                    .select('*')
                    .in('question_id', questionIds);

                if (optionsError) throw optionsError;

                // Merge options with questions and maintain order
                const questionsWithOptions = questionIds.map((qid: number) => {
                    const q = questionsData.find(q => q.id === qid);
                    if (!q) return null;
                    return {
                        ...q,
                        options: optionsData?.filter(o => o.question_id === q.id) || []
                    };
                }).filter(Boolean) as Question[];

                setQuestions(questionsWithOptions);
            } catch (err) {
                console.error('Error fetching challenge questions:', err);
                navigate('/challenges');
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [id, user, navigate]);

    const handleComplete = async (score: number, _total: number) => {
        if (!id || !user) return;

        try {
            // Update participant score
            await supabase
                .from('challenge_participants')
                .update({
                    score: score,
                    status: 'finished'
                })
                .eq('challenge_id', id)
                .eq('user_id', user.id);

            // Check if all participants have finished
            const { data: participants } = await supabase
                .from('challenge_participants')
                .select('status')
                .eq('challenge_id', id);

            const allFinished = participants?.every(p => p.status === 'finished');

            if (allFinished) {
                // Update challenge status to completed
                await supabase
                    .from('challenges')
                    .update({ status: 'completed' })
                    .eq('id', id);
            }

            // Redirect to leaderboard (for now, just go back to lobby)
            setTimeout(() => {
                navigate(`/challenges/lobby/${id}`);
            }, 2000);
        } catch (err) {
            console.error('Error updating challenge score:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!id) {
        return <div>Challenge non trouvé.</div>;
    }

    return (
        <QuizPlayer
            questions={questions}
            onBack={() => navigate('/challenges')}
            mode="challenge"
            onComplete={handleComplete}
            quizId={id}
        />
    );
}
