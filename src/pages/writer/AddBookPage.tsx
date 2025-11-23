import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useUser } from '../../hooks/useUser';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface Module {
    id: string;
    name: string;
}

export function AddBookPage() {
    const navigate = useNavigate();
    const { user } = useUser();
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
            try {
                const { data: modulesData, error: modulesError } = await supabase.from('modules').select('id, nom').order('nom');
                if (modulesError) throw modulesError;
                setModules(modulesData.map((m: any) => ({ id: m.id, name: m.nom })));
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("Vous devez être connecté pour ajouter un livre.");
            return;
        }
        if (!title || !selectedModuleId || !fileUrl) {
            setError("Veuillez remplir le titre, sélectionner un module et saisir l'URL du fichier.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            let couverture_url: string | null = null;
            // 1. Upload de la couverture (si présente)
            if (coverFile) {
                const filePath = `public/covers/${Date.now()}_${coverFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('livres').upload(filePath, coverFile);
                if (uploadError) throw uploadError;
                couverture_url = supabase.storage.from('livres').getPublicUrl(filePath).data.publicUrl;
            }

            // 2. Insérer le livre dans la base de données
            const { error: insertError } = await supabase.from('livres').insert({
                titre: title,
                module_id: selectedModuleId,
                couverture_url: couverture_url,
                fichier_url: fileUrl,
                created_by: user.id,
            });

            if (insertError) throw insertError;

            setModalState({
                isOpen: true,
                title: "Succès",
                message: "Le livre a été ajouté avec succès !",
                onConfirm: () => navigate('/writer/dashboard')
            });

            // Reset form
            setTitle('');
            setSelectedModuleId('');
            setSelectedModuleName('');
            setCoverFile(null);
            setFileUrl('');

        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'ajout du livre.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-gray-600">Chargement des données...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Ajouter un Livre</h1>
            </header>

            <main className="p-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre du livre</label>
                        <input
                            type="text"
                            name="title"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700">Module</label>
                        <SearchableSelect
                            options={modules.map(m => ({ id: m.id, name: m.name }))}
                            value={selectedModuleName}
                            onChange={(option: any) => {
                                setSelectedModuleId(option?.id || '');
                                setSelectedModuleName(option?.name || '');
                            }}
                            placeholder="Sélectionner un module..."
                        />
                    </div>
                    <div>
                        <label htmlFor="coverFile" className="block text-sm font-medium text-gray-700">Image de couverture (optionnel)</label>
                        <input
                            type="file"
                            name="coverFile"
                            id="coverFile"
                            accept="image/*"
                            onChange={(e) => setCoverFile(e.target.files ? e.target.files[0] : null)}
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                    <div>
                        <label htmlFor="fileUrl" className="block text-sm font-medium text-gray-700">URL du fichier (PDF/Drive)</label>
                        <input
                            type="text"
                            name="fileUrl"
                            id="fileUrl"
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            required
                            placeholder="https://..."
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting || !title || !selectedModuleId || !fileUrl}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Ajout en cours...' : 'Ajouter le Livre'}
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