import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Modal } from '../ui/Modal';
import { PlusIcon, CheckIcon } from '@heroicons/react/24/solid';

interface Playlist {
    id: string;
    nom: string;
    description: string | null;
}

interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    questionId: number;
}

export function AddToPlaylistModal({ isOpen, onClose, questionId }: AddToPlaylistModalProps) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchPlaylists();
        }
    }, [isOpen, questionId]);

    const fetchPlaylists = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Non authentifié');

            // Fetch user's playlists
            const { data: playlistsData, error: playlistsError } = await supabase
                .from('playlists')
                .select('id, nom, description')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (playlistsError) throw playlistsError;

            // Fetch which playlists already contain this question
            const { data: existingData, error: existingError } = await supabase
                .from('playlist_questions')
                .select('playlist_id')
                .eq('question_id', questionId);

            if (existingError) throw existingError;

            const existingIds = new Set(existingData?.map(item => item.playlist_id) || []);
            setSelectedPlaylistIds(existingIds);
            setPlaylists(playlistsData || []);
        } catch (err: any) {
            console.error('Error fetching playlists:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) {
            setError('Le nom de la playlist est requis');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Non authentifié');

            const { data, error: createError } = await supabase
                .from('playlists')
                .insert({
                    user_id: user.id,
                    nom: newPlaylistName.trim(),
                    description: newPlaylistDescription.trim() || null
                })
                .select()
                .single();

            if (createError) throw createError;

            // Add the question to the newly created playlist
            const { error: addError } = await supabase
                .from('playlist_questions')
                .insert({
                    playlist_id: data.id,
                    question_id: questionId
                });

            if (addError) throw addError;

            setPlaylists([data, ...playlists]);
            setSelectedPlaylistIds(new Set([...selectedPlaylistIds, data.id]));
            setNewPlaylistName('');
            setNewPlaylistDescription('');
            setShowCreateForm(false);
            setSuccessMessage('Playlist créée avec succès !');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Error creating playlist:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePlaylist = async (playlistId: string) => {
        const isCurrentlySelected = selectedPlaylistIds.has(playlistId);
        setSaving(true);
        setError(null);

        try {
            if (isCurrentlySelected) {
                // Remove from playlist
                const { error: deleteError } = await supabase
                    .from('playlist_questions')
                    .delete()
                    .eq('playlist_id', playlistId)
                    .eq('question_id', questionId);

                if (deleteError) throw deleteError;

                const newSet = new Set(selectedPlaylistIds);
                newSet.delete(playlistId);
                setSelectedPlaylistIds(newSet);
                setSuccessMessage('Question retirée de la playlist');
            } else {
                // Add to playlist
                const { error: insertError } = await supabase
                    .from('playlist_questions')
                    .insert({
                        playlist_id: playlistId,
                        question_id: questionId
                    });

                if (insertError) throw insertError;

                setSelectedPlaylistIds(new Set([...selectedPlaylistIds, playlistId]));
                setSuccessMessage('Question ajoutée à la playlist');
            }
            setTimeout(() => setSuccessMessage(null), 2000);
        } catch (err: any) {
            console.error('Error toggling playlist:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ajouter à une playlist">
            <div className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                        {successMessage}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {playlists.length === 0 && !showCreateForm ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 mb-4">Vous n'avez pas encore de playlist</p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Créer ma première playlist
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {playlists.map((playlist) => {
                                        const isSelected = selectedPlaylistIds.has(playlist.id);
                                        return (
                                            <button
                                                key={playlist.id}
                                                onClick={() => handleTogglePlaylist(playlist.id)}
                                                disabled={saving}
                                                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-200 hover:border-blue-300 bg-white'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-800">{playlist.nom}</h4>
                                                        {playlist.description && (
                                                            <p className="text-sm text-gray-500 mt-1">{playlist.description}</p>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <CheckIcon className="w-6 h-6 text-blue-600 ml-2 flex-shrink-0" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {!showCreateForm && (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Créer une nouvelle playlist
                                    </button>
                                )}
                            </>
                        )}

                        {showCreateForm && (
                            <div className="border-t pt-4 space-y-3">
                                <h4 className="font-medium text-gray-800">Nouvelle playlist</h4>
                                <input
                                    type="text"
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    placeholder="Nom de la playlist"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                                    disabled={saving}
                                />
                                <textarea
                                    value={newPlaylistDescription}
                                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                                    placeholder="Description (optionnelle)"
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                                    disabled={saving}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreatePlaylist}
                                        disabled={saving || !newPlaylistName.trim()}
                                        className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? 'Création...' : 'Créer'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setNewPlaylistName('');
                                            setNewPlaylistDescription('');
                                        }}
                                        disabled={saving}
                                        className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}
