import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { SearchableSelect } from '../../components/SearchableSelect'; // Assuming this component exists and is reusable
import { useUser } from '../../context/UserContext'; // To get the current user's ID for created_by

type Module = { id: string; name: string };

export function AddBookPage() {
    const navigate = useNavigate();
    const { user } = useUser(); // Get current user for created_by
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedModuleName, setSelectedModuleName] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
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
                setModules(modulesData.map(m => ({ id: m.id, name: m.nom })));
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
        if (!title || !selectedModuleId || !pdfFile) {
            setError("Veuillez remplir le titre, sélectionner un module et un fichier PDF.");
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

            // 2. Upload du fichier PDF
            const pdfFilePath = `public/pdfs/${Date.now()}_${pdfFile.name.replace(/\s/g, '_')}`;
            const { error: pdfUploadError } = await supabase.storage.from('livres').upload(pdfFilePath, pdfFile);
            if (pdfUploadError) throw pdfUploadError;
            const pdfPublicUrl = supabase.storage.from('livres').getPublicUrl(pdfFilePath).data.publicUrl;

            // 3. Insérer le livre dans la base de données
            const { error: insertError } = await supabase.from('livres').insert({
                titre: title,
                auteur: author || null,
                module_id: selectedModuleId,
                couverture_url: couverture_url,
                fichier_url: pdfPublicUrl,
                taille_fichier: pdfFile.size,
                created_by: user.id, // Ajout de l'ID de l'utilisateur
                nombre_pages: numPages, // Assuming numPages is set elsewhere or removed if not needed
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
            setAuthor('');
            setSelectedModuleId('');
            setSelectedModuleName('');
            setCoverFile(null);
            setPdfFile(null);
            setNumPages(null);

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
                        <label htmlFor="author" className="block text-sm font-medium text-gray-700">Auteur</label>
                        <input
                            type="text"
                            name="author"
                            id="author"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700">Module</label>
                        <SearchableSelect
                            options={modules.map(m => ({ id: m.id, name: m.name }))}
                            value={selectedModuleName}
                            onChange={(option) => {
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
                        <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700">Fichier PDF</label>
                        <input
                            type="file"
                            name="pdfFile"
                            id="pdfFile"
                            accept="application/pdf"
                            onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                            required
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                    {/* You might want to add an input for numPages if you can extract it from the PDF */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting || !title || !selectedModuleId || !pdfFile}
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