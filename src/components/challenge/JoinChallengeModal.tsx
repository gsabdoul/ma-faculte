import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { XMarkIcon, QrCodeIcon, PencilIcon } from '@heroicons/react/24/outline';
import { QRScanner } from './QRScanner';

interface JoinChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function JoinChallengeModal({ isOpen, onClose }: JoinChallengeModalProps) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'code' | 'qr'>('code');
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoinWithCode = async (code: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            // Find challenge
            const { data: challenge, error: findError } = await supabase
                .from('challenges')
                .select('id, status')
                .eq('code', code.toUpperCase())
                .single();

            if (findError || !challenge) {
                throw new Error("Code invalide ou challenge introuvable.");
            }

            if (challenge.status !== 'waiting') {
                throw new Error("Ce challenge a déjà commencé ou est terminé.");
            }

            // Check if already joined
            const { data: existing } = await supabase
                .from('challenge_participants')
                .select('id')
                .eq('challenge_id', challenge.id)
                .eq('user_id', user.id)
                .single();

            if (!existing) {
                // Join challenge
                const { error: joinError } = await supabase
                    .from('challenge_participants')
                    .insert({
                        challenge_id: challenge.id,
                        user_id: user.id,
                        status: 'joined'
                    });

                if (joinError) throw joinError;
            }

            navigate(`/challenges/lobby/${challenge.id}`);
            onClose();
        } catch (err: any) {
            console.error('Error joining challenge:', err);
            setError(err.message || "Impossible de rejoindre le challenge.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.trim()) {
            handleJoinWithCode(joinCode.trim());
        }
    };

    const handleQRScan = (code: string) => {
        handleJoinWithCode(code);
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

                <h2 className="text-2xl font-bold text-gray-800 mb-6">Rejoindre un Challenge</h2>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('code')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${activeTab === 'code'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        <PencilIcon className="w-5 h-5" />
                        Saisir le code
                    </button>
                    <button
                        onClick={() => setActiveTab('qr')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${activeTab === 'qr'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        <QrCodeIcon className="w-5 h-5" />
                        Scanner QR
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Tab Content */}
                {activeTab === 'code' ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Code d'invitation
                            </label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="EX: A1B2C3"
                                maxLength={6}
                                className="w-full p-3 border-2 border-gray-200 rounded-lg text-center font-mono text-xl tracking-widest uppercase focus:border-purple-600 focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || joinCode.length < 3}
                            className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Connexion...' : 'Rejoindre'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <QRScanner onScan={handleQRScan} onError={setError} />
                        <p className="text-sm text-gray-500 text-center">
                            Scannez le QR code affiché dans le lobby du challenge
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
