import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Modal } from '../../components/Modal';

interface Module {
    id: string;
    nom: string;
    description: string | null;
    icone_url: string | null;
}

export function ManageModulesPage() {
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentModule, setCurrentModule] = useState<Partial<Module> | null>(null);

    useEffect(() => {
        const fetchModules = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('modules').select('*').order('nom');
                if (error) throw error;
                setModules(data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchModules();
    }, []);

    const handleOpenModal = (module: Partial<Module> | null = null) => {
        setCurrentModule(module);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentModule(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const moduleData = {
            nom: formData.get('nom') as string,
            description: formData.get('description') as string,
            icone_url: formData.get('icone_url') as string,
        };

        try {
            if (currentModule?.id) {
                // Mise à jour
                const { error: updateError } = await supabase.from('modules').update(moduleData).eq('id', currentModule.id);
                if (updateError) throw updateError;
            } else {
                // Création
                const { error: insertError } = await supabase.from('modules').insert(moduleData);
                if (insertError) throw insertError;
            }

            // Recharger les données
            const { data } = await supabase.from('modules').select('*').order('nom');
            setModules(data || []);
            handleCloseModal();

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (moduleId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce module ?")) {
            try {
                const { error } = await supabase.from('modules').delete().eq('id', moduleId);
                if (error) throw error;
                setModules(modules.filter(m => m.id !== moduleId));
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    if (loading) return <div className="p-4">Chargement...</div>;
    if (error) return <div className="p-4 text-red-500">Erreur: {error}</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer les Modules</h1>
            <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal()} className="bg-blue-500 text-white p-2 rounded-lg flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter un Module
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Icône</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {modules.map((module) => (
                            <tr key={module.id}>
                                <td className="px-6 py-4"><img src={module.icone_url || undefined} alt={module.nom} className="h-10 w-10 object-contain" /></td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{module.nom}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{module.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(module)} className="text-indigo-600 hover:text-indigo-900"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => handleDelete(module.id)} className="text-red-600 hover:text-red-900 ml-4"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentModule?.id ? 'Modifier le Module' : 'Ajouter un Module'}>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="nom" className="block text-sm font-medium text-gray-700">Nom du module</label>
                            <input type="text" name="nom" id="nom" defaultValue={currentModule?.nom || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea name="description" id="description" defaultValue={currentModule?.description || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                        </div>
                        <div>
                            <label htmlFor="icone_url" className="block text-sm font-medium text-gray-700">URL de l'icône</label>
                            <input type="url" name="icone_url" id="icone_url" defaultValue={currentModule?.icone_url || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Annuler</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{currentModule?.id ? 'Enregistrer' : 'Créer'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}