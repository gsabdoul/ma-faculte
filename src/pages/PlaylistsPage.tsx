import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { PlusIcon, TrashIcon, PlayIcon, BookOpenIcon } from '@heroicons/react/24/solid';
import { Modal } from '../components/ui/Modal';

interface Playlist {
    id: string;
    nom: string;
    description: string | null;
    question_count: number;
    created_at: string;
}

export function PlaylistsPage() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchPlaylists();
    }, []);

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('playlists')
                .select(`
                    *,
                    playlist_questions (count)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedPlaylists = data.map(p => ({
                ...p,
                question_count: p.playlist_questions[0]?.count || 0
            }));

            setPlaylists(formattedPlaylists);
        } catch (error) {
            console.error('Error fetching playlists:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;

        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('playlists')
                .insert({
                    user_id: user.id,
                    nom: newPlaylistName.trim(),
                    description: newPlaylistDescription.trim() || null
                })
                .select()
                .single();

            if (error) throw error;

            setPlaylists([{ ...data, question_count: 0 }, ...playlists]);
            setIsCreateModalOpen(false);
            setNewPlaylistName('');
            setNewPlaylistDescription('');
        } catch (error) {
            console.error('Error creating playlist:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette playlist ?')) return;

        try {
            const { error } = await supabase
                .from('playlists')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setPlaylists(playlists.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting playlist:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Mes Playlists</h1>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Nouvelle Playlist</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4">
                {playlists.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpenIcon className="w-12 h-12 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Aucune playlist</h3>
                        <p className="text-gray-500 mb-6">Créez votre première playlist pour organiser vos questions favorites.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Créer une playlist
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {playlists.map((playlist) => (
                            <Link
                                key={playlist.id}
                                to={`/playlists/${playlist.id}`}
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100 group relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-blue-100 p-3 rounded-lg">
                                        <BookOpenIcon className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <button
                                        onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                                        className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Supprimer la playlist"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-1">{playlist.nom}</h3>
                                {playlist.description && (
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{playlist.description}</p>
                                )}
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        {playlist.question_count} question{playlist.question_count !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Voir <PlayIcon className="w-4 h-4" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Nouvelle Playlist"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                        <input
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                            placeholder="Ex: Cardiologie - Révisions"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnelle)</label>
                        <textarea
                            value={newPlaylistDescription}
                            onChange={(e) => setNewPlaylistDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                            rows={3}
                            placeholder="Pour mes examens de fin d'année..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleCreatePlaylist}
                            disabled={!newPlaylistName.trim() || creating}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {creating ? 'Création...' : 'Créer'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
