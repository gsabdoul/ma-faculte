import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { useUser } from '../context/UserContext';
import { supabase } from '../supabase';

// If ConfirmationModal is located elsewhere, update the path accordingly, for example:
import { ConfirmationModal } from '../components/ConfirmationModal';

// --- Composants et Types ---
// Composant réutilisable pour les champs de formulaire
const FormField = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

interface Option {
    id: string;
    nom: string;
}

export function EditProfilePage() {
    const navigate = useNavigate();
    const { profile, refreshProfile } = useUser();

    const [initialData, setInitialData] = useState({
        prenom: '',
        nom: '',
        universite_id: '',
        faculte_id: '',
        niveau_id: '',
    });
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        universite_id: '',
        faculte_id: '',
        niveau_id: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '' });

    // Données pour les listes déroulantes
    const [universities, setUniversities] = useState<Option[]>([]);
    const [facultes, setFacultes] = useState<Option[]>([]);
    const [niveaux, setNiveaux] = useState<Option[]>([]);

    // --- Effets de bord (Hooks) ---

    // Pré-remplir le formulaire avec les données du profil actuel
    useEffect(() => {
        if (profile) {
            const data = {
                prenom: profile.prenom || '',
                nom: profile.nom || '',
                universite_id: profile.universite_id || '',
                faculte_id: profile.faculte_id || '',
                niveau_id: profile.niveau_id || '',
            };
            setFormData(data);
            setInitialData(data);
        }
    }, [profile]);

    // Charger les universités et facultés
    useEffect(() => {
        const fetchData = async () => {
            const { data: uniData } = await supabase.from('universites').select('id, nom');
            const { data: facData } = await supabase.from('facultes').select('id, nom');
            setUniversities(uniData || []);
            setFacultes(facData || []);
        };
        fetchData();
    }, []);

    // Charger les niveaux en fonction de la faculté sélectionnée
    useEffect(() => {
        if (formData.faculte_id) {
            const fetchNiveaux = async () => {
                const { data: nivData } = await supabase
                    .from('niveaux')
                    .select('id, nom')
                    .eq('faculte_id', formData.faculte_id)
                    .order('ordre', { ascending: true });
                setNiveaux(nivData || []);
            };
            fetchNiveaux();
        }
    }, [formData.faculte_id]);

    // --- Gestionnaires d'événements ---

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setLoading(true);
        setError(null);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                nom: formData.nom,
                prenom: formData.prenom,
                universite_id: formData.universite_id,
                faculte_id: formData.faculte_id,
                niveau_id: formData.niveau_id,
            })
            .eq('id', profile.id);

        setLoading(false);

        if (updateError) {
            setError(updateError.message);
            console.error("Erreur de mise à jour:", updateError);
        } else {
            setModalState({
                isOpen: true,
                title: "Succès",
                message: "Votre profil a été mis à jour avec succès !",
                onConfirm: async () => {
                    await refreshProfile();
                    navigate('/profil');
                }
            });
        }
    };

    const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialData);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center">
                <button onClick={() => navigate('/profil')} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Modifier le profil</h1>
            </header>

            <main className="p-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
                    <FormField label="Prénom">
                        <input type="text" name="prenom" value={formData.prenom} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </FormField>

                    <FormField label="Nom">
                        <input type="text" name="nom" value={formData.nom} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </FormField>

                    <FormField label="Université">
                        <select name="universite_id" value={formData.universite_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Sélectionner une université</option>
                            {universities.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
                        </select>
                    </FormField>

                    <FormField label="Faculté / UFR">
                        <select name="faculte_id" value={formData.faculte_id} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Sélectionner une faculté</option>
                            {facultes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                        </select>
                    </FormField>

                    <FormField label="Niveau d'étude">
                        <select name="niveau_id" value={formData.niveau_id} onChange={handleChange} required disabled={!formData.faculte_id} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100">
                            <option value="">Sélectionner un niveau</option>
                            {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
                        </select>
                    </FormField>

                    <div className="pt-4">
                        <button type="submit" disabled={loading || !hasChanged} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed">
                            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
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