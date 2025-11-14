import { useState, useMemo, useEffect } from 'react';
import {
    PencilIcon,
    TrashIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { Modal } from '../../components/Modal';

interface University {
    id: string;
    nom: string;
    logo_url: string | null;
    subjectCount: number;
}

export function ManageUniversitiesPage() {
    const [allUniversities, setAllUniversities] = useState<University[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const UNIVERSITIES_PER_PAGE = 10;

    // États pour le modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUniversity, setCurrentUniversity] = useState<Partial<University> | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchUniversities = async () => {
            setLoading(true);
            try {
                // On compte les sujets liés à chaque université directement dans la requête
                const { data, error } = await supabase.from('universites').select('id, nom, logo_url, sujets(count)').order('nom');
                if (error) throw error;

                const universitiesWithCount = (data || []).map((u: any) => ({
                    id: u.id,
                    nom: u.nom,
                    logo_url: u.logo_url,
                    subjectCount: u.sujets[0]?.count || 0, // Le décompte est dans un tableau
                }));
                setAllUniversities(universitiesWithCount);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUniversities();
    }, []);

    const handleOpenModal = (university: Partial<University> | null = null) => {
        setCurrentUniversity(university);
        setLogoFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUniversity(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nom = formData.get('nom') as string;
        let logo_url = currentUniversity?.logo_url || null;

        try {
            // 1. Gérer l'upload du logo s'il y en a un nouveau
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `public/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('universites').upload(filePath, logoFile);
                if (uploadError) throw uploadError;

                // Obtenir l'URL publique
                const { data: urlData } = supabase.storage.from('universites').getPublicUrl(filePath);
                logo_url = urlData.publicUrl;
            }

            const universityData = { nom, logo_url };

            // 2. Insérer ou mettre à jour les données de l'université
            if (currentUniversity?.id) {
                const { error: updateError } = await supabase.from('universites').update(universityData).eq('id', currentUniversity.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('universites').insert(universityData);
                if (insertError) throw insertError;
            }

            // 3. Recharger les données et fermer le modal
            const { data } = await supabase.from('universites').select('id, nom, logo_url, sujets(count)').order('nom');
            const universitiesWithCount = (data || []).map((u: any) => ({
                id: u.id,
                nom: u.nom,
                logo_url: u.logo_url,
                subjectCount: u.sujets[0]?.count || 0,
            }));
            setAllUniversities(universitiesWithCount);

            handleCloseModal();

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (universityId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette université ?")) {
            try {
                const { error } = await supabase.from('universites').delete().eq('id', universityId);
                if (error) throw error;
                setAllUniversities(allUniversities.filter(u => u.id !== universityId));
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    const filteredUniversities = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        if (!lowercasedFilter) return allUniversities;

        return allUniversities.filter(uni =>
            uni.nom.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, allUniversities]);

    // Logique de pagination
    const indexOfLastUniversity = currentPage * UNIVERSITIES_PER_PAGE;
    const indexOfFirstUniversity = indexOfLastUniversity - UNIVERSITIES_PER_PAGE;
    const currentUniversities = filteredUniversities.slice(indexOfFirstUniversity, indexOfLastUniversity);
    const totalPages = Math.ceil(filteredUniversities.length / UNIVERSITIES_PER_PAGE);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    if (loading) return <div className="p-4">Chargement...</div>;
    if (error) return <div className="p-4 text-red-500">Erreur: {error}</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer les Universités</h1>

            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher une université..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 text-white p-2 rounded-lg flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter une université
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-3 px-4 font-semibold text-gray-600">Université</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 text-center">Sujets</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentUniversities.map((uni) => (
                            <tr key={uni.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 flex items-center">
                                    {uni.logo_url ? (
                                        <img src={uni.logo_url} alt={`Logo de ${uni.nom}`} className="h-10 w-10 object-contain rounded-md mr-4" />
                                    ) : (
                                        <BuildingOffice2Icon className="h-10 w-10 text-gray-300 mr-4" />
                                    )}
                                    <span className="font-medium text-gray-800">{uni.nom}</span>
                                </td>
                                <td className="py-3 px-4 text-gray-600 text-center">{uni.subjectCount}</td>
                                <td className="py-3 px-4 whitespace-nowrap text-right">
                                    <button onClick={() => handleOpenModal(uni)} className="text-gray-500 hover:text-blue-500 p-2" title="Modifier"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => handleDelete(uni.id)} className="text-gray-500 hover:text-red-500 p-2" title="Supprimer"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Contrôles de pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-600">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <div className="flex items-center">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentUniversity?.id ? 'Modifier l\'Université' : 'Ajouter une Université'}>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="nom" className="block text-sm font-medium text-gray-700">Nom de l'université</label>
                            <input type="text" name="nom" id="nom" defaultValue={currentUniversity?.nom || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label htmlFor="logo" className="block text-sm font-medium text-gray-700">
                                Logo {currentUniversity?.id && <span className="text-xs text-gray-500">(Optionnel: laisser vide pour ne pas changer)</span>}
                            </label>
                            <input
                                type="file" name="logo" id="logo" accept="image/*"
                                onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Annuler</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{currentUniversity?.id ? 'Enregistrer' : 'Créer'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}