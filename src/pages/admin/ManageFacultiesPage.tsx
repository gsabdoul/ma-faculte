import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Modal } from '../../components/ui/Modal';

interface Faculte {
    id: string;
    nom: string;
}

export function ManageFacultiesPage() {
    const [facultes, setFacultes] = useState<Faculte[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentFaculte, setCurrentFaculte] = useState<Partial<Faculte> | null>(null);
    const [nom, setNom] = useState('');

    useEffect(() => {
        const fetchFacultes = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('facultes').select('*').order('nom');
                if (error) throw error;
                setFacultes(data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchFacultes();
    }, []);

    const handleOpenModal = (faculte: Partial<Faculte> | null = null) => {
        setCurrentFaculte(faculte);
        setNom(faculte?.nom || '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentFaculte(null);
        setNom('');
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!nom) return;

        try {
            let result;
            if (currentFaculte?.id) {
                // Mise à jour
                result = await supabase.from('facultes').update({ nom }).eq('id', currentFaculte.id).select().single();
            } else {
                // Création
                result = await supabase.from('facultes').insert({ nom }).select().single();
            }

            const { error: submissionError } = result;
            if (submissionError) throw submissionError;

            // Recharger les données
            const { data: allFacultes } = await supabase.from('facultes').select('*').order('nom');
            setFacultes(allFacultes || []);
            handleCloseModal();

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (faculteId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette faculté ?")) {
            try {
                const { error } = await supabase.from('facultes').delete().eq('id', faculteId);
                if (error) throw error;
                setFacultes(facultes.filter(f => f.id !== faculteId));
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    if (loading) return <div className="p-4">Chargement...</div>;
    if (error) return <div className="p-4 text-red-500">Erreur: {error}</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer les Facultés</h1>
            <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal()} className="bg-blue-500 text-white p-2 rounded-lg flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter une Faculté
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {facultes.map((faculte) => (
                            <tr key={faculte.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{faculte.nom}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(faculte)} className="text-indigo-600 hover:text-indigo-900"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => handleDelete(faculte.id)} className="text-red-600 hover:text-red-900 ml-4"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentFaculte?.id ? 'Modifier la Faculté' : 'Ajouter une Faculté'}>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="nom" className="block text-sm font-medium text-gray-700">Nom de la faculté</label>
                            <input type="text" name="nom" id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Annuler</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{currentFaculte?.id ? 'Enregistrer' : 'Créer'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}