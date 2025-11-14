import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Définition des types pour les données
interface Drive {
    id: string;
    titre: string;
    description: string;
    url: string;
    faculte_id: string;
    niveau_id: string;
    facultes: { nom: string };
    niveaux: { nom: string };
}

interface Faculte {
    id: string;
    nom: string;
}

interface Niveau {
    id: string;
    nom: string;
}

export function ManageDrivesPage() {
    const [drives, setDrives] = useState<Drive[]>([]);
    const [facultes, setFacultes] = useState<Faculte[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // États pour le formulaire (création/modification)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDrive, setCurrentDrive] = useState<Partial<Drive> | null>(null);

    // Récupération des données initiales
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: drivesData, error: drivesError } = await supabase
                    .from('drives')
                    .select(`*, facultes(nom), niveaux(nom)`);
                if (drivesError) throw drivesError;
                setDrives(drivesData || []);

                const { data: facultesData, error: facultesError } = await supabase.from('facultes').select('*');
                if (facultesError) throw facultesError;
                setFacultes(facultesData || []);

                const { data: niveauxData, error: niveauxError } = await supabase.from('niveaux').select('*');
                if (niveauxError) throw niveauxError;
                setNiveaux(niveauxData || []);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleOpenModal = (drive: Partial<Drive> | null = null) => {
        setCurrentDrive(drive);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentDrive(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const driveData = {
            titre: formData.get('titre') as string,
            description: formData.get('description') as string,
            url: formData.get('url') as string,
            faculte_id: formData.get('faculte_id') as string,
            niveau_id: formData.get('niveau_id') as string,
        };

        try {
            let error;
            if (currentDrive?.id) {
                // Mise à jour
                const { error: updateError } = await supabase.from('drives').update(driveData).eq('id', currentDrive.id);
                error = updateError;
            } else {
                // Création
                const { error: insertError } = await supabase.from('drives').insert(driveData);
                error = insertError;
            }

            if (error) throw error;

            // Recharger les données et fermer le modal
            const { data: drivesData } = await supabase.from('drives').select(`*, facultes(nom), niveaux(nom)`);
            setDrives(drivesData || []);
            handleCloseModal();

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (driveId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce drive ?")) {
            try {
                const { error } = await supabase.from('drives').delete().eq('id', driveId);
                if (error) throw error;
                setDrives(drives.filter(d => d.id !== driveId));
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    if (loading) return <div className="p-4">Chargement...</div>;
    if (error) return <div className="p-4 text-red-500">Erreur: {error}</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Gérer les Drives</h1>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 text-white p-2 rounded-lg flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter un Drive
                </button>
            </div>

            {/* Tableau des drives */}
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculté</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {drives.map((drive) => (
                            <tr key={drive.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{drive.titre}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{drive.facultes?.nom || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{drive.niveaux?.nom || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(drive)} className="text-indigo-600 hover:text-indigo-900">
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleDelete(drive.id)} className="text-red-600 hover:text-red-900 ml-4">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal pour ajouter/modifier */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            {currentDrive?.id ? 'Modifier le Drive' : 'Ajouter un Drive'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="titre" className="block text-sm font-medium text-gray-700">Titre</label>
                                    <input type="text" name="titre" id="titre" defaultValue={currentDrive?.titre || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea name="description" id="description" defaultValue={currentDrive?.description || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                                </div>
                                <div>
                                    <label htmlFor="url" className="block text-sm font-medium text-gray-700">URL</label>
                                    <input type="url" name="url" id="url" defaultValue={currentDrive?.url || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label htmlFor="faculte_id" className="block text-sm font-medium text-gray-700">Faculté</label>
                                    <select name="faculte_id" id="faculte_id" defaultValue={currentDrive?.faculte_id || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Sélectionner une faculté</option>
                                        {facultes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="niveau_id" className="block text-sm font-medium text-gray-700">Niveau</label>
                                    <select name="niveau_id" id="niveau_id" defaultValue={currentDrive?.niveau_id || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">Sélectionner un niveau</option>
                                        {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                                    Annuler
                                </button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                    {currentDrive?.id ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}