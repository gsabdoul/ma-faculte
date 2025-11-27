import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    SparklesIcon,
    DocumentTextIcon,
    LinkIcon,
    DocumentIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { Modal } from '../../components/ui/Modal';

interface KnowledgeSource {
    id: string;
    title: string;
    description: string | null;
    type: 'text' | 'pdf' | 'url' | 'markdown';
    content: string | null;
    file_url: string | null;
    created_at: string;
}

const emptySource: Partial<KnowledgeSource> = {
    title: '',
    description: '',
    type: 'text',
    content: '',
    file_url: ''
};

export function ManageKnowledgePage() {
    const [sources, setSources] = useState<KnowledgeSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSource, setActiveSource] = useState<Partial<KnowledgeSource>>(emptySource);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        try {
            const { data, error } = await supabase
                .from('knowledge_sources')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSources(data || []);
        } catch (error) {
            console.error('Error fetching sources:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let fileUrl = activeSource.file_url;

            // Upload file if present and type is pdf or markdown
            if ((activeSource.type === 'pdf' || activeSource.type === 'markdown') && file) {
                const filename = `${Date.now()}_${file.name}`;
                const { error } = await supabase.storage
                    .from('sujets')
                    .upload(`knowledge/${filename}`, file);

                if (error) throw error;

                const { data: publicUrl } = supabase.storage
                    .from('sujets')
                    .getPublicUrl(`knowledge/${filename}`);

                fileUrl = publicUrl.publicUrl;
            }

            const payload = {
                title: activeSource.title,
                description: activeSource.description,
                type: activeSource.type,
                content: activeSource.type === 'text' ? activeSource.content : null,
                file_url: (activeSource.type === 'pdf' || activeSource.type === 'url' || activeSource.type === 'markdown') ? (activeSource.type === 'url' ? activeSource.content : fileUrl) : null
            };

            if (activeSource.type === 'url') {
                payload.file_url = activeSource.content;
                payload.content = null;
            }

            if (activeSource.id) {
                const { error } = await supabase
                    .from('knowledge_sources')
                    .update(payload)
                    .eq('id', activeSource.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('knowledge_sources')
                    .insert(payload);
                if (error) throw error;
            }

            await fetchSources();
            setIsModalOpen(false);
            setActiveSource(emptySource);
            setFile(null);
        } catch (error) {
            console.error('Error saving source:', error);
            alert('Erreur lors de l\'enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette source ?')) return;

        try {
            const { error } = await supabase
                .from('knowledge_sources')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSources(sources.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting source:', error);
            alert('Erreur lors de la suppression');
        }
    };

    const handleProcess = async (source: KnowledgeSource) => {
        if (!confirm(`Traiter la source "${source.title}" pour l'IA ?`)) return;

        setProcessingId(source.id);
        try {
            const { data, error } = await supabase.functions.invoke('process-document', {
                body: {
                    source_id: source.id,
                    type: source.type,
                    document_url: source.file_url,
                    content: source.content
                }
            });

            if (error) throw error;

            if (data && data.error) {
                throw new Error(data.error);
            }

            alert('Traitement lancé avec succès !');
        } catch (error: any) {
            console.error('Error processing:', error);
            const errorMessage = error?.message || error?.error || 'Erreur inconnue';
            alert(`Erreur lors du traitement: ${errorMessage}`);
        } finally {
            setProcessingId(null);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'pdf': return <DocumentIcon className="w-5 h-5 text-red-500" />;
            case 'url': return <LinkIcon className="w-5 h-5 text-blue-500" />;
            case 'markdown': return <DocumentTextIcon className="w-5 h-5 text-purple-500" />;
            default: return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Base de Connaissances IA</h1>
                <button
                    onClick={() => { setActiveSource(emptySource); setIsModalOpen(true); }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Ajouter une source
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre / Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sources.map((source) => (
                            <tr key={source.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        {getIcon(source.type)}
                                        <span className="ml-2 text-sm text-gray-600 uppercase">{source.type}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{source.title}</div>
                                    <div className="text-sm text-gray-500 truncate max-w-md">{source.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(source.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleProcess(source)}
                                        disabled={!!processingId}
                                        className={`text-purple-600 hover:text-purple-900 mr-4 ${processingId === source.id ? 'animate-spin' : ''}`}
                                        title="Traiter pour l'IA"
                                    >
                                        <SparklesIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => { setActiveSource(source); setIsModalOpen(true); }}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(source.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sources.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                    Aucune source de connaissance. Ajoutez-en une pour enrichir l'IA.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={activeSource.id ? "Modifier la source" : "Ajouter une source"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Titre</label>
                        <input
                            type="text"
                            required
                            value={activeSource.title}
                            onChange={e => setActiveSource({ ...activeSource, title: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            value={activeSource.description || ''}
                            onChange={e => setActiveSource({ ...activeSource, description: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <select
                            value={activeSource.type}
                            onChange={e => setActiveSource({ ...activeSource, type: e.target.value as any })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        >
                            <option value="text">Texte brut</option>
                            <option value="pdf">Document PDF</option>
                            <option value="markdown">Fichier Markdown</option>
                            <option value="url">Lien URL</option>
                        </select>
                    </div>

                    {activeSource.type === 'text' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contenu</label>
                            <textarea
                                required
                                value={activeSource.content || ''}
                                onChange={e => setActiveSource({ ...activeSource, content: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-mono text-sm"
                                rows={10}
                                placeholder="Collez le texte ici..."
                            />
                        </div>
                    )}

                    {activeSource.type === 'url' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">URL</label>
                            <input
                                type="url"
                                required
                                value={activeSource.content || ''}
                                onChange={e => setActiveSource({ ...activeSource, content: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                placeholder="https://..."
                            />
                        </div>
                    )}

                    {(activeSource.type === 'pdf' || activeSource.type === 'markdown') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                {activeSource.type === 'pdf' ? 'Fichier PDF' : 'Fichier Markdown'}
                            </label>
                            <input
                                type="file"
                                accept={activeSource.type === 'pdf' ? ".pdf" : ".md,.markdown"}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {activeSource.file_url && (
                                <p className="mt-2 text-sm text-gray-500">Fichier actuel: <a href={activeSource.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Voir le fichier</a></p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
