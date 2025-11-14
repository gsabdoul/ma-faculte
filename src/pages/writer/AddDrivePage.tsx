import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { SearchableSelect } from '../../components/SearchableSelect'; // Assuming this component exists and is reusable
import { useUser } from '../../context/UserContext'; // To get the current user's ID for created_by

type Faculty = { id: string; name: string };
type Niveau = { id: string; name: string };

export function AddDrivePage() {
    const navigate = useNavigate();
    const { user } = useUser(); // Get current user for created_by
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [selectedFacultyId, setSelectedFacultyId] = useState('');
    const [selectedFacultyName, setSelectedFacultyName] = useState('');
    const [selectedNiveauId, setSelectedNiveauId] = useState('');
    const [selectedNiveauName, setSelectedNiveauName] = useState('');
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);
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
                const [facRes, nivRes] = await Promise.all([
                    supabase.from('facultes').select('id, nom').order('nom'),
                    supabase.from('niveaux').select('id, nom').order('nom'),
                ]);

                if (facRes.error) throw facRes.error;
                if (nivRes.error) throw nivRes.error;

                setFaculties(facRes.data.map(f => ({ id: f.id, name: f.nom })));
                setNiveaux(nivRes.data.map(n => ({ id: n.id, name: n.nom })));
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
            setError("Vous devez être connecté pour ajouter un drive.");
            return;
        }
        if (!title || !url || !selectedFacultyId || !selectedNiveauId) {
            setError("Veuillez remplir tous les champs obligatoires.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase.from('drives').insert({
                titre: title,
                description: description || null,
                url: url,
                faculte_id: selectedFacultyId,
                niveau_id: selectedNiveauId,
                created_by: user.id, // Ajout de l'ID de l'utilisateur
            });

            if (insertError) throw insertError;

            setModalState({
                isOpen: true,
                title: "Succès",
                message: "Le drive a été ajouté avec succès !",
                onConfirm: () => navigate('/writer/dashboard')
            });

            // Reset form
            setTitle('');
            setDescription('');
            setUrl('');
            setSelectedFacultyId('');
            setSelectedFacultyName('');
            setSelectedNiveauId('');
            setSelectedNiveauName('');

        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'ajout du drive.");
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
                <h1 className="text-xl font-bold text-gray-800">Ajouter un Drive</h1>
            </header>

            <main className="p-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre du drive</label>
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
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (optionnel)</label>
                        <textarea
                            name="description"
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        ></textarea>
                    </div>
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700">URL du drive</label>
                        <input
                            type="url"
                            name="url"
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="facultyId" className="block text-sm font-medium text-gray-700">Faculté</label>
                        <SearchableSelect
                            options={faculties.map(f => ({ id: f.id, name: f.name }))}
                            value={selectedFacultyName}
                            onChange={(option) => {
                                setSelectedFacultyId(option?.id || '');
                                setSelectedFacultyName(option?.name || '');
                            }}
                            placeholder="Sélectionner une faculté..."
                        />
                    </div>
                    <div>
                        <label htmlFor="niveauId" className="block text-sm font-medium text-gray-700">Niveau</label>
                        <SearchableSelect
                            options={niveaux.map(n => ({ id: n.id, name: n.name }))}
                            value={selectedNiveauName}
                            onChange={(option) => {
                                setSelectedNiveauId(option?.id || '');
                                setSelectedNiveauName(option?.name || '');
                            }}
                            placeholder="Sélectionner un niveau..."
                        />
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting || !title || !url || !selectedFacultyId || !selectedNiveauId}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Ajout en cours...' : 'Ajouter le Drive'}
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