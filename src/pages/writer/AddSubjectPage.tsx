import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { useUser } from '../../hooks/useUser';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface Module {
    id: string;
    name: string;
}

interface University {
    id: string;
    name: string;
}

export function AddSubjectPage() {
    const navigate = useNavigate();
    const { user } = useUser();

    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedModuleName, setSelectedModuleName] = useState('');
    const [selectedUniversityId, setSelectedUniversityId] = useState('');
    const [selectedUniversityName, setSelectedUniversityName] = useState('');
    const [year, setYear] = useState<string>('');
    const [session, setSession] = useState<'Normale' | 'Rattrapage'>('Normale');
    const [correction, setCorrection] = useState('');

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

                setModules(modsRes.data.map((m: any) => ({ id: m.id, name: m.nom })));
                setUniversities(unisRes.data.map((u: any) => ({ id: u.id, name: u.nom })));
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
        if (!selectedModuleId || !selectedUniversityId) {
            setError("Veuillez sélectionner un module et une université.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Récupérer faculte_id et niveau_id du profil de l'utilisateur
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('faculte_id, niveau_id')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            if (!profileData) throw new Error("Profil utilisateur introuvable.");

            // Insérer le sujet dans la base de données
            const { error: insertError } = await supabase.from('sujets').insert({
                module_id: selectedModuleId,
                universite_id: selectedUniversityId,
                faculte_id: profileData.faculte_id,
                niveau_id: profileData.niveau_id,
                created_by: user.id,
                annee: year ? Number(year) : null,
                session: session,
                correction: correction || null,
            });

            if (insertError) throw insertError;

            setModalState({
                isOpen: true,
                title: "Succès",
                message: "Le sujet a été ajouté avec succès !",
                onConfirm: () => navigate('/writer/dashboard')
            });

            // Reset form
            setSelectedModuleId('');
            setSelectedModuleName('');
            setSelectedUniversityId('');
            setSelectedUniversityName('');
            setYear('');
            setSession('Normale');
            setCorrection('');

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
                        <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700 mb-2">
                            Module <span className="text-red-500">*</span>
                        </label>
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
                        <label htmlFor="universityId" className="block text-sm font-medium text-gray-700 mb-2">
                            Université <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            options={universities.map(u => ({ id: u.id, name: u.name }))}
                            value={selectedUniversityName}
                            onChange={(option: any) => {
                                setSelectedUniversityId(option?.id || '');
                                setSelectedUniversityName(option?.name || '');
                            }}
                            placeholder="Sélectionner une université..."
                        />
                    </div>

                    <div>
                        <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                            Année
                        </label>
                        <input
                            type="number"
                            name="year"
                            id="year"
                            min="1900"
                            max="2100"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            placeholder="Ex: 2023"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-2">
                            Session <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="session"
                            id="session"
                            value={session}
                            onChange={(e) => setSession(e.target.value as 'Normale' | 'Rattrapage')}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="Normale">Normale</option>
                            <option value="Rattrapage">Rattrapage</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="correction" className="block text-sm font-medium text-gray-700 mb-2">
                            Correction (optionnel)
                        </label>
                        <textarea
                            name="correction"
                            id="correction"
                            rows={4}
                            value={correction}
                            onChange={(e) => setCorrection(e.target.value)}
                            placeholder="Entrez la correction ou des indices ici..."
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting || !selectedModuleId || !selectedUniversityId}
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