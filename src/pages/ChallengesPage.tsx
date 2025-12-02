import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';
import {
    PlusIcon,
    UserGroupIcon,
    ChevronLeftIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { CreateChallengeModal } from '../components/challenge/CreateChallengeModal';
import { JoinChallengeModal } from '../components/challenge/JoinChallengeModal';

interface Challenge {
    id: string;
    code: string;
    status: string;
    created_at: string;
    subject: {
        titre: string;
    } | null;
    participant_count: number;
}

export default function ChallengesPage() {
    const navigate = useNavigate();
    const { user } = useUser();
    const [myChallenges, setMyChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchMyChallenges = async () => {
            try {
                // Fetch challenges created by the user
                const { data, error } = await supabase
                    .from('challenges')
                    .select(`
                        id,
                        code,
                        status,
                        created_at,
                        subject:subject_id(titre)
                    `)
                    .eq('creator_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Fetch participant count for each challenge
                const challengesWithCount = await Promise.all(
                    (data || []).map(async (challenge) => {
                        const { count } = await supabase
                            .from('challenge_participants')
                            .select('*', { count: 'exact', head: true })
                            .eq('challenge_id', challenge.id);

                        return {
                            ...challenge,
                            subject: Array.isArray(challenge.subject) && challenge.subject.length > 0 ? challenge.subject[0] : challenge.subject,
                            participant_count: count || 0
                        };
                    })
                );

                setMyChallenges(challengesWithCount as Challenge[]);
            } catch (err) {
                console.error('Error fetching challenges:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyChallenges();

        // Subscribe to real-time changes on challenges
        const challengesSubscription = supabase
            .channel('challenges-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'challenges',
                    filter: `creator_id=eq.${user.id}`
                },
                () => {
                    fetchMyChallenges();
                }
            )
            .subscribe();

        // Subscribe to real-time changes on participants
        const participantsSubscription = supabase
            .channel('participants-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'challenge_participants'
                },
                () => {
                    fetchMyChallenges();
                }
            )
            .subscribe();

        return () => {
            challengesSubscription.unsubscribe();
            participantsSubscription.unsubscribe();
        };
    }, [user]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'waiting':
                return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">🟡 En attente</span>;
            case 'active':
                return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">🟢 En cours</span>;
            case 'completed':
                return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">✅ Terminé</span>;
            default:
                return null;
        }
    };

    const handleCreateSuccess = (challengeId: string) => {
        navigate(`/challenges/lobby/${challengeId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
                <button
                    onClick={() => navigate('/home')}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                >
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Challenges</h1>
            </header>

            <main className="p-4 max-w-4xl mx-auto space-y-6">
                {/* Hero Section */}
                <div className="text-center py-6">
                    <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserGroupIcon className="w-10 h-10 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Mode Multijoueur</h2>
                    <p className="text-gray-600 mt-2">
                        Affrontez vos amis en temps réel sur des quiz !
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <div className="flex items-center gap-2 mb-2">
                                    <PlusIcon className="w-6 h-6" />
                                    <h3 className="text-lg font-bold">Créer un Challenge</h3>
                                </div>
                                <p className="text-blue-100 text-sm">
                                    Choisissez un sujet et invitez vos amis
                                </p>
                            </div>
                            <ArrowRightIcon className="w-6 h-6" />
                        </div>
                    </button>

                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserGroupIcon className="w-6 h-6" />
                                    <h3 className="text-lg font-bold">Rejoindre</h3>
                                </div>
                                <p className="text-purple-100 text-sm">
                                    Code ou QR code
                                </p>
                            </div>
                            <ArrowRightIcon className="w-6 h-6" />
                        </div>
                    </button>
                </div>

                {/* My Challenges Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">📚 Mes Challenges</h3>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        </div>
                    ) : myChallenges.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Vous n'avez pas encore créé de challenge</p>
                            <p className="text-sm mt-2">Cliquez sur "Créer un Challenge" pour commencer</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myChallenges.map((challenge) => (
                                <div
                                    key={challenge.id}
                                    className="border-2 border-gray-100 rounded-lg p-4 hover:border-purple-200 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 text-lg">
                                                {challenge.subject?.titre || 'Sujet non disponible'}
                                            </h4>
                                            {!challenge.subject && (
                                                <p className="text-xs text-orange-600 mt-1">
                                                    ⚠️ Le sujet associé n'est plus disponible
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                                                <span className="font-mono font-bold">Code: {challenge.code}</span>
                                                <span>👥 {challenge.participant_count} participant{challenge.participant_count > 1 ? 's' : ''}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Créé le {new Date(challenge.created_at).toLocaleDateString('fr-FR', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            {getStatusBadge(challenge.status)}
                                        </div>
                                    </div>

                                    {challenge.status !== 'completed' ? (
                                        <button
                                            onClick={() => navigate(`/challenges/lobby/${challenge.id}`)}
                                            className="w-full bg-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                                        >
                                            {challenge.status === 'waiting' ? 'Rejoindre le lobby' : 'Voir la partie'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate(`/challenges/lobby/${challenge.id}`)}
                                            className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Voir les résultats
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <CreateChallengeModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
            />
            <JoinChallengeModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
            />
        </div>
    );
}
