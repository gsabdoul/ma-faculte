import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CreateChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (challengeId: string) => void;
}

interface Quiz {
    id: string;
    title: string;
    status: string;
    total_questions: number;
    config: any;
    created_at: string;
}

export function CreateChallengeModal({ isOpen, onClose, onSuccess }: CreateChallengeModalProps) {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch user's quizzes on mount
    useEffect(() => {
        const fetchQuizzes = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_quizzes')
                .select('id, title, status, total_questions, config, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setQuizzes(data);
            }
        };

        if (isOpen) {
            fetchQuizzes();
        }
    }, [isOpen]);

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleCreate = async () => {
        if (!selectedQuiz) {
            setError("Veuillez sélectionner un quiz");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            const code = generateCode();

            // Create challenge
            const { data: challenge, error: createError } = await supabase
                .from('challenges')
                .insert({
                    creator_id: user.id,
                    quiz_id: selectedQuiz,
                    code: code,
                    status: 'waiting'
                })
                .select()
                .single();

            if (createError) throw createError;

            // Add creator as participant
            const { error: joinError } = await supabase
                .from('challenge_participants')
                .insert({
                    challenge_id: challenge.id,
                    user_id: user.id,
                    status: 'joined'
                });

            if (joinError) throw joinError;

            onSuccess(challenge.id);
            onClose();
        } catch (err: any) {
            console.error('Error creating challenge:', err);
            setError(err.message || "Impossible de créer le challenge");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-6">Créer un Challenge</h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Quiz Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sélectionnez un quiz
                        </label>
                        {quizzes.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                                <p>Vous n'avez pas encore de quiz généré</p>
                                <p className="text-sm mt-2">Créez d'abord un quiz pour pouvoir créer un challenge</p>
                            </div>
                        ) : (
                            <select
                                value={selectedQuiz || ''}
                                onChange={(e) => setSelectedQuiz(e.target.value || null)}
                                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
                            >
                                <option value="">Choisissez un quiz</option>
                                {quizzes.map(quiz => (
                                    <option key={quiz.id} value={quiz.id}>
                                        {quiz.title || 'Quiz sans titre'} - {quiz.total_questions} questions ({quiz.status === 'completed' ? '✅ Complété' : '⏳ En cours'})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={loading || !selectedQuiz}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Création...' : 'Créer le Challenge'}
                    </button>
                </div>
            </div>
        </div>
    );
}
