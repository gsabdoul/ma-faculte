import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';
import { ChevronLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface Note {
    id: string;
    content: string;
    created_at: string;
    question: {
        id: number;
        content: string;
        type: string;
    };
}

export function NotesPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    useEffect(() => {
        if (user) {
            fetchNotes();
        }
    }, [user]);

    const fetchNotes = async () => {
        try {
            const { data, error } = await supabase
                .from('user_notes')
                .select(`
                    id,
                    content,
                    created_at,
                    questions!inner (
                        id,
                        content,
                        type
                    )
                `)
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform the data to match our Note interface
            const transformedData = data?.map(item => ({
                id: item.id,
                content: item.content,
                created_at: item.created_at,
                question: Array.isArray(item.questions) ? item.questions[0] : item.questions
            })) || [];

            setNotes(transformedData);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return;

        try {
            const { error } = await supabase
                .from('user_notes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const startEdit = (note: Note) => {
        setEditingNote(note.id);
        setEditContent(note.content);
    };

    const saveEdit = async (id: string) => {
        try {
            const { error } = await supabase
                .from('user_notes')
                .update({ content: editContent })
                .eq('id', id);

            if (error) throw error;
            setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editContent } : n));
            setEditingNote(null);
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                >
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Mes Notes</h1>
            </header>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Chargement...</div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PencilIcon className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Aucune note</h3>
                        <p className="text-gray-500 mt-1">Ajoutez des notes lors de la correction de vos quiz.</p>
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="bg-white rounded-xl shadow-sm p-6">
                            <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${note.question.type === 'qcm' ? 'bg-blue-100 text-blue-700' :
                                    note.question.type === 'qroc' ? 'bg-purple-100 text-purple-700' :
                                        'bg-orange-100 text-orange-700'
                                    }`}>
                                    {note.question.type.toUpperCase()}
                                </span>
                                <p className="text-gray-800 text-sm font-medium line-clamp-2">{note.question.content}</p>
                            </div>

                            {editingNote === note.id ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingNote(null)}
                                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={() => saveEdit(note.id)}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                        >
                                            Enregistrer
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                        <span className="text-xs text-gray-400">
                                            {new Date(note.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEdit(note)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(note.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
