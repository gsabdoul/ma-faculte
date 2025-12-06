import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';
import {
    UserGroupIcon,
    PlayIcon,
    ClipboardDocumentIcon,
    CheckIcon
} from '@heroicons/react/24/outline';

interface Participant {
    id: string;
    user_id: string;
    status: string;
    score: number;
    user: {
        email: string;
    };
}

interface Challenge {
    id: string;
    code: string;
    creator_id: string;
    status: string;
    quiz_id: string | null;
    quiz?: {
        title: string;
        questions: any[];
    };
}

export default function ChallengeLobbyPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!id || !user) return;

        // Fetch initial data
        const fetchData = async () => {
            try {
                // Get challenge details with quiz info
                const { data: challengeData, error: challengeError } = await supabase
                    .from('challenges')
                    .select(`
                        *,
                        user_quizzes:quiz_id (title, questions)
                    `)
                    .eq('id', id)
                    .single();

                if (challengeError) throw challengeError;
                setChallenge({
                    ...challengeData,
                    quiz: challengeData.user_quizzes
                });

                // Get participants with user profile data
                const { data: participantsData, error: participantsError } = await supabase
                    .from('challenge_participants')
                    .select(`
                        *,
                        profiles:user_id (
                            id,
                            nom,
                            prenom
                        )
                    `)
                    .eq('challenge_id', id);

                if (participantsError) throw participantsError;

                // Transform to include email-like display name
                const transformedParticipants = participantsData?.map(p => ({
                    ...p,
                    user: {
                        email: p.profiles ? `${p.profiles.prenom} ${p.profiles.nom}` : 'Utilisateur'
                    }
                })) || [];

                setParticipants(transformedParticipants);

            } catch (err) {
                console.error('Error fetching lobby data:', err);
                navigate('/challenges');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Subscribe to realtime updates
        const channel = supabase
            .channel(`lobby:${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'challenge_participants',
                    filter: `challenge_id=eq.${id}`
                },
                async () => {
                    // Re-fetch participants when someone joins
                    const { data: participantsData } = await supabase
                        .from('challenge_participants')
                        .select(`
                            *,
                            profiles:user_id (
                                id,
                                nom,
                                prenom
                            )
                        `)
                        .eq('challenge_id', id);

                    if (participantsData) {
                        const transformedParticipants = participantsData.map(p => ({
                            ...p,
                            user: {
                                email: p.profiles ? `${p.profiles.prenom} ${p.profiles.nom}` : 'Utilisateur'
                            }
                        }));
                        setParticipants(transformedParticipants);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'challenges',
                    filter: `id=eq.${id}`
                },
                (payload) => {
                    if (payload.new.status === 'active') {
                        navigate(`/challenges/game/${id}`);
                    }
                    // Update challenge status
                    setChallenge(prev => ({ ...prev!, status: payload.new.status }));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'challenge_participants',
                    filter: `challenge_id=eq.${id}`
                },
                async () => {
                    // Re-fetch participants to get updated scores
                    const { data: participantsData } = await supabase
                        .from('challenge_participants')
                        .select(`
                            *,
                            profiles:user_id (
                                id,
                                nom,
                                prenom
                            )
                        `)
                        .eq('challenge_id', id);

                    if (participantsData) {
                        const transformedParticipants = participantsData.map(p => ({
                            ...p,
                            user: {
                                email: p.profiles ? `${p.profiles.prenom} ${p.profiles.nom}` : 'Utilisateur'
                            }
                        }));
                        setParticipants(transformedParticipants);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, user, navigate]);

    const copyCode = () => {
        if (challenge?.code) {
            navigator.clipboard.writeText(challenge.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleStartGame = async () => {
        if (!challenge) return;

        try {
            // Get questions from the quiz
            if (!challenge.quiz || !challenge.quiz.questions || challenge.quiz.questions.length === 0) {
                alert("Aucune question disponible pour ce quiz");
                return;
            }

            // Use the questions from the quiz (they're already stored in the quiz)
            const quizQuestions = challenge.quiz.questions;

            // Shuffle and select questions (limit to 10 for the challenge)
            const shuffled = [...quizQuestions].sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffled.slice(0, Math.min(10, shuffled.length));

            // Update challenge with questions and status
            const { error } = await supabase
                .from('challenges')
                .update({
                    status: 'active',
                    questions: selectedQuestions
                })
                .eq('id', challenge.id);

            if (error) throw error;
            // Navigation will happen automatically via realtime subscription
        } catch (err) {
            console.error('Error starting game:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!challenge) return null;

    const isHost = user?.id === challenge.creator_id;
    const isCompleted = challenge.status === 'completed';

    // Sort participants by score for leaderboard
    const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className={`${isCompleted ? 'bg-green-600' : 'bg-purple-600'} p-6 text-center text-white`}>
                    <h1 className="text-2xl font-bold mb-2">
                        {isCompleted ? '🏆 Challenge Terminé !' : 'Lobby du Challenge'}
                    </h1>
                    {challenge.quiz && (
                        <p className="text-sm opacity-90 mb-1">
                            📝 {challenge.quiz.title}
                        </p>
                    )}
                    <p className="opacity-90">
                        {isCompleted ? 'Classement final' : 'En attente des joueurs...'}
                    </p>
                </div>

                <div className="p-6 space-y-8">
                    {/* Code Section */}
                    {!isCompleted && (
                        <div className="text-center">
                            <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-purple-100 inline-block mb-4">
                                <QRCodeSVG value={challenge.code} size={150} />
                            </div>

                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-gray-500 text-sm font-medium">CODE D'INVITATION</span>
                            </div>
                            <button
                                onClick={copyCode}
                                className="flex items-center justify-center gap-2 text-4xl font-mono font-bold text-purple-600 tracking-widest hover:opacity-80 transition-opacity mx-auto"
                            >
                                {challenge.code}
                                {copied ? (
                                    <CheckIcon className="w-6 h-6 text-green-500" />
                                ) : (
                                    <ClipboardDocumentIcon className="w-6 h-6 text-gray-400" />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Participants/Leaderboard */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <UserGroupIcon className="w-5 h-5 text-purple-600" />
                                {isCompleted ? 'Classement' : `Joueurs (${participants.length})`}
                            </h3>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto space-y-3">
                            {(isCompleted ? sortedParticipants : participants).map((p, index) => {
                                let rankStyle = "bg-white border-gray-100";
                                let rankIcon = null;
                                let rankBadge = null;

                                if (isCompleted) {
                                    if (index === 0) {
                                        rankStyle = "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 shadow-yellow-100";
                                        rankIcon = <span className="text-2xl">🏆</span>;
                                        rankBadge = <div className="w-8 h-8 rounded-full bg-yellow-400 text-white flex items-center justify-center font-bold shadow-sm">1</div>;
                                    } else if (index === 1) {
                                        rankStyle = "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 shadow-gray-100";
                                        rankIcon = <span className="text-2xl">🥈</span>;
                                        rankBadge = <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold shadow-sm">2</div>;
                                    } else if (index === 2) {
                                        rankStyle = "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300 shadow-orange-100";
                                        rankIcon = <span className="text-2xl">🥉</span>;
                                        rankBadge = <div className="w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center font-bold shadow-sm">3</div>;
                                    } else {
                                        rankBadge = <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm">{index + 1}</div>;
                                    }
                                }

                                return (
                                    <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 shadow-sm transition-all ${rankStyle}`}>
                                        {isCompleted ? (
                                            <div className="flex-shrink-0">
                                                {rankBadge}
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                {p.user?.email?.[0].toUpperCase() || '?'}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold truncate block ${index < 3 && isCompleted ? 'text-gray-900 text-lg' : 'text-gray-700'}`}>
                                                    {p.user?.email?.split('@')[0] || 'Utilisateur inconnu'}
                                                </span>
                                                {p.user_id === challenge.creator_id && (
                                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-purple-200">
                                                        Hôte
                                                    </span>
                                                )}
                                            </div>
                                            {isCompleted && (
                                                <div className="flex items-center gap-1 text-sm font-medium text-gray-500">
                                                    <span>Score:</span>
                                                    <span className={`font-bold ${index === 0 ? 'text-yellow-600' : index === 1 ? 'text-gray-600' : index === 2 ? 'text-orange-600' : 'text-gray-700'}`}>
                                                        {p.score || 0} pts
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {isCompleted && rankIcon && (
                                            <div className="flex-shrink-0 animate-bounce">
                                                {rankIcon}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    {!isCompleted && isHost ? (
                        <button
                            onClick={handleStartGame}
                            className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                        >
                            <PlayIcon className="w-6 h-6" />
                            Lancer la partie
                        </button>
                    ) : !isCompleted ? (
                        <div className="text-center p-4 bg-blue-50 text-blue-700 rounded-xl animate-pulse">
                            En attente de l'hôte pour lancer la partie...
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate('/challenges')}
                            className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Retour aux Challenges
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
