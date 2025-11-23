import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface Module {
    id: string;
    name: string;
}

export function EditBookPage() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedModuleName, setSelectedModuleName] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState('');

    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '' });

    useEffect(() => {
        const fetchData = async () => {
            if (!bookId) {
                setError("ID de livre manquant.");
                setLoading(false);
                return;
            }
            try {
                const [bookRes, modsRes] = await Promise.all([
                    supabase.from('livres').select('*, modules(nom)').eq('id', bookId).single(),
                    supabase.from('modules').select('id, nom'),
                ]);

                if (bookRes.error) throw bookRes.error;
                if (modsRes.error) throw modsRes.error;

                const book = bookRes.data;
                setTitle(book.titre);
                setSelectedModuleId(book.module_id);
                setSelectedModuleName(book.modules?.nom || '');
                setFileUrl(book.fichier_url || '');

                setModules(modsRes.data.map((m: any) => ({ id: m.id, name: m.nom })));
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [bookId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const bookUpdate: any = {
                titre: title,
                module_id: selectedModuleId,
                fichier_url: fileUrl
            };

            if (coverFile) {
                const filePath = `public/covers/${Date.now()}_${coverFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('livres').upload(filePath, coverFile);
                if (uploadError) throw uploadError;
                bookUpdate.couverture_url = supabase.storage.from('livres').getPublicUrl(filePath).data.publicUrl;
            }

            const { error: updateError } = await supabase.from('livres').update(bookUpdate).eq('id', bookId);
            if (updateError) throw updateError;

            setModalState({
                isOpen: true,
                title: "Succès",
                message: "Le livre a été mis à jour avec succès !",
                onConfirm: () => navigate('/writer/dashboard')
            });

        } catch (err: any) {
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Modifier le Livre</h1>
            </header>

            <main className="p-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre</label>
                        <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Module</label>
                        <SearchableSelect
                            options={modules}
                            value={selectedModuleName}
                            onChange={(option: any) => {
                                setSelectedModuleId(option?.id || '');
                                setSelectedModuleName(option?.name || '');
                            }}
                        />
                    </div>
                    <div>
                        <label htmlFor="coverFile" className="block text-sm font-medium text-gray-700">Remplacer la couverture (optionnel)</label>
                        <input type="file" id="coverFile" accept="image/*" onChange={(e) => setCoverFile(e.target.files ? e.target.files[0] : null)} className="mt-1 block w-full text-sm" />
                    </div>
                    <div>
                        <label htmlFor="fileUrl" className="block text-sm font-medium text-gray-700">URL du fichier (PDF/Drive)</label>
                        <input type="text" id="fileUrl" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="https://..." />
                    </div>
                    <div className="pt-4">
                        <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                            {submitting ? 'Mise à jour...' : 'Enregistrer les modifications'}
                        </button>
                    </div>
                </form>
            </main>

            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
            />
        </div>
    );
}