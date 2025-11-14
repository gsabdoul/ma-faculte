import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { SearchableSelect } from '../../components/SearchableSelect'; // Assuming this component exists and is reusable
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useUser } from '../../context/UserContext'; // To get the current user's ID for created_by

type Module = { id: string; name: string };
type University = { id: string; name: string };

export function AddSubjectPage() {
    const navigate = useNavigate();
    const { user } = useUser(); // Get current user for created_by
    const [title, setTitle] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedModuleName, setSelectedModuleName] = useState('');
    const [selectedUniversityId, setSelectedUniversityId] = useState('');
    const [selectedUniversityName, setSelectedUniversityName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
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
                const [modsRes, unisRes] = await Promise.all([
                    supabase.from('modules').select('id, nom'),
                    supabase.from('universites').select('id, nom'),
                ]);

                if (modsRes.error) throw modsRes.error;
                if (unisRes.error) throw unisRes.error;

                setModules(modsRes.data.map(m => ({ id: m.id, name: m.nom })));
                setUniversities(unisRes.data.map(u => ({ id: u.id, name: u.nom })));
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
            setError("Vous devez être connecté pour ajouter un sujet.");
            return;
        }
        if (!title || !selectedModuleId || !selectedUniversityId || !file) {
            setError("Veuillez remplir tous les champs et sélectionner un fichier.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // 1. Upload du fichier PDF
            const filePath = `public/sujets/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('sujets').upload(filePath, file);
            if (uploadError) throw uploadError;
            const publicUrl = supabase.storage.from('sujets').getPublicUrl(filePath).data.publicUrl;

            // 2. Récupérer faculte_id et niveau_id du profil de l'utilisateur
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('faculte_id, niveau_id')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            if (!profileData) throw new Error("Profil utilisateur introuvable.");

            // 3. Insérer le sujet dans la base de données
            const { error: insertError } = await supabase.from('sujets').insert({
                titre: title,
                module_id: selectedModuleId,
                universite_id: selectedUniversityId,
                faculte_id: profileData.faculte_id,
                niveau_id: profileData.niveau_id,
                fichier_url: publicUrl,
                taille_fichier: file.size,
                created_by: user.id, // Ajout de l'ID de l'utilisateur
                // annee: ... (if you want to add an input for year)
            });

            if (insertError) throw insertError;

            setModalState({
                isOpen: true,
                title: "Succès",
                message: "Le sujet a été ajouté avec succès !",
                onConfirm: () => navigate('/writer/dashboard')
            });

            // Reset form
            setTitle('');
            setSelectedModuleId('');
            setSelectedModuleName('');
            setSelectedUniversityId('');
            setSelectedUniversityName('');
            setFile(null);

        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'ajout du sujet.");
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
                <h1 className="text-xl font-bold text-gray-800">Ajouter un Sujet</h1>
            </header>

            <main className="p-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre du sujet</label>
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
                            onChange={(option) => {
                                setSelectedModuleId(option?.id || '');
                                setSelectedModuleName(option?.name || '');
                            }}
                            placeholder="Sélectionner un module..."
                        />
                    </div>
                    <div>
                        <label htmlFor="universityId" className="block text-sm font-medium text-gray-700">Université</label>
                        <SearchableSelect
                            options={universities.map(u => ({ id: u.id, name: u.name }))}
                            value={selectedUniversityName}
                            onChange={(option) => {
                                setSelectedUniversityId(option?.id || '');
                                setSelectedUniversityName(option?.name || '');
                            }}
                            placeholder="Sélectionner une université..."
                        />
                    </div>
                    <div>
                        <label htmlFor="file" className="block text-sm font-medium text-gray-700">Fichier PDF</label>
                        <input
                            type="file"
                            name="file"
                            id="file"
                            accept="application/pdf"
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            required
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting || !title || !selectedModuleId || !selectedUniversityId || !file}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Ajout en cours...' : 'Ajouter le Sujet'}
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