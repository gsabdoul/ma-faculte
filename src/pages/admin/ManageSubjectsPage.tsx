import { useState, useMemo, useEffect, type ChangeEvent } from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import {
    PencilIcon,
    TrashIcon,
    DocumentPlusIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { Modal } from '../../components/ui/Modal';
import { useSubjectForm } from '../../hooks/useSubjectForm';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { SubjectInfo, Module, University } from '../../types';

type ModuleId = string;

// Helper function to transform Supabase subject data into SubjectInfo
const sujetToSubjectInfo = (
    s: any,
    mods: Module[],
    unis: University[]
): SubjectInfo => {
    const module = mods.find(m => m.id === s.module_id);
    const uni = unis.find(u => u.id === s.universite_id);
    // La jointure se fait maintenant sur `profiles`, qui a `nom` et `prenom`
    const creatorName = s.created_by ? `${s.created_by.prenom || ''} ${s.created_by.nom || ''}`.trim() : 'Inconnu';

    return {
        id: s.id,
        moduleId: s.module_id,
        moduleName: module?.name || '',
        universityId: s.universite_id,
        universityName: uni?.name || '',
        correction: s.correction ?? null,
        year: s.annee ?? null,
        session: s.session ?? 'Normale',
        creatorId: s.created_by?.id,
        creatorName: creatorName,
    };
};

export function ManageSubjectsPage() {
    const navigate = useNavigate();
    const { user } = useUser();

    // États pour la recherche, la pagination et les données
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedUniversity, setSelectedUniversity] = useState('');
    const [allSubjects, setAllSubjects] = useState<SubjectInfo[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);

    // Load modules, universites, faculties, and levels from Supabase on mount
    useEffect(() => {
        let cancelled = false;
        if (!user) return; // Attendre que l'utilisateur soit chargé

        const load = async () => {
            try {
                let sujetsQuery = supabase
                    .from('sujets')
                    .select('*, created_by (id, nom, prenom)');

                if (user.role === 'writer') {
                    sujetsQuery = sujetsQuery.eq('created_by', user.id);
                }

                const [modsRes, unisRes, sujetsRes] = await Promise.all([
                    supabase.from('modules').select('id, nom'),
                    supabase.from('universites').select('id, nom'),
                    sujetsQuery
                ]);

                if (cancelled) return;

                if (modsRes.error) throw modsRes.error;
                if (unisRes.error) throw unisRes.error;
                if (sujetsRes.error) throw sujetsRes.error;

                const mods: Module[] = (modsRes.data || []).map((m: any) => ({ id: m.id, name: m.nom }));
                const unis: University[] = (unisRes.data || []).map((u: any) => ({ id: u.id, name: u.nom }));

                const sujets = (sujetsRes.data || []).map(s =>
                    sujetToSubjectInfo(s, mods, unis)
                );

                setModules(mods);
                setUniversities(unis);
                setAllSubjects(sujets);
            } catch (_err) {
                console.error('Error loading data:', _err);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [user]);
    const [currentPage, setCurrentPage] = useState(1);
    const SUBJECTS_PER_PAGE = 10;

    // États pour la modale et le formulaire d'ajout
    const {
        isModalOpen: isFormModalOpen,
        activeSubject: formActiveSubject,
        setActiveSubject: setFormActiveSubject,
        formErrors,
        isSubmitting,
        handleSubmit: handleModalSubmit,
        openModal: openFormModal,
        closeModal: closeFormModal
    } = useSubjectForm(setAllSubjects, { modules, universities });

    // État pour la modale de suppression
    const [subjectToDelete, setSubjectToDelete] = useState<SubjectInfo | null>(null);
    const universitiesByModule: Record<string, University[]> = useMemo(() => {
        // In the current schema universites are not directly linked to modules,
        // so we expose the full list for every module to keep the UI working.
        const map: Record<string, University[]> = {};
        modules.forEach(m => { map[m.id] = universities; });
        return map;
    }, [modules, universities]);

    const filteredSubjects = useMemo(() => {
        return allSubjects.filter(subject => {
            const moduleMatch = !selectedModule || subject.moduleId === modules.find(m => m.id === selectedModule)?.id;
            const universityMatch = !selectedUniversity || subject.universityId === selectedUniversity;

            return moduleMatch && universityMatch;
        });
    }, [selectedModule, selectedUniversity, allSubjects]);

    const handleModuleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setSelectedModule(e.target.value);
        setSelectedUniversity(''); // Réinitialiser le filtre université
    };

    // Logique de pagination
    const indexOfLastSubject = currentPage * SUBJECTS_PER_PAGE;
    const indexOfFirstSubject = indexOfLastSubject - SUBJECTS_PER_PAGE;
    const currentSubjects = filteredSubjects.slice(indexOfFirstSubject, indexOfLastSubject);
    const totalPages = Math.ceil(filteredSubjects.length / SUBJECTS_PER_PAGE);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleDeleteSubject = async () => {
        if (!subjectToDelete) return;
        try {
            const delRes = await supabase.from('sujets').delete().eq('id', subjectToDelete.id);
            if (delRes.error) throw delRes.error;
            setAllSubjects(prev => prev.filter(s => s.id !== subjectToDelete.id));
        } catch (err: any) {
            // Optionally surface deletion errors in future UI
        } finally {
            setSubjectToDelete(null);
        }
    };

    const openSubjectDetails = (subjectId: string) => {
        navigate(`/admin/sujets/${subjectId}`); // Correction de la route
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer les sujets</h1>

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div className="w-full md:w-auto flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select onChange={handleModuleFilterChange} value={selectedModule} className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Tous les modules</option>
                        {modules.map(module => (
                            <option key={module.id} value={module.id}>{module.name}</option>
                        ))}
                    </select>
                    <select onChange={(e) => setSelectedUniversity(e.target.value)} value={selectedUniversity} disabled={!selectedModule} className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed">
                        <option value="">Toutes les universités</option>
                        {(universitiesByModule[selectedModule as ModuleId] || []).map(uni => (
                            <option key={uni.id} value={uni.id}>{uni.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => openFormModal()}
                    className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ml-4 flex-shrink-0"
                >
                    <DocumentPlusIcon className="h-5 w-5 mr-2" />
                    Ajouter un sujet
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-3 px-4 font-semibold text-gray-600">Sujet (ID)</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Module</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Université</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentSubjects.map((subject) => (
                            <tr key={subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <div>
                                        <span className="font-medium text-gray-800">
                                            {subject.session} {subject.year}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">Créé par : <span className="font-medium">{subject.creatorName}</span> (ID: {subject.creatorId})</p>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-gray-600">{subject.moduleName}</td>
                                <td className="py-3 px-4 text-gray-600">{subject.universityName}</td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <button
                                        onClick={() => openSubjectDetails(subject.id)}
                                        className="text-gray-500 hover:text-green-500 p-2"
                                        title="Voir le sujet"
                                    >
                                        <EyeIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => openFormModal(subject)} className="text-gray-500 hover:text-blue-500 p-2" title="Modifier"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => setSubjectToDelete(subject)} className="text-gray-500 hover:text-red-500 p-2" title="Supprimer"><TrashIcon className="h-5 w-5" /></button>
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

            <Modal
                isOpen={isFormModalOpen}
                onClose={closeFormModal}
                title={formActiveSubject.id ? "Modifier le sujet" : "Ajouter un nouveau sujet"}
            >
                <form onSubmit={handleModalSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700">Module</label>
                            <div className={`rounded-md shadow-sm ${formErrors.moduleId ? 'border border-red-500' : ''}`}>
                                <SearchableSelect
                                    options={modules}
                                    value={formActiveSubject.moduleName}
                                    onChange={(option: any) => {
                                        setFormActiveSubject(prev => ({ ...prev, moduleId: option?.id || '', moduleName: option?.name || '' }));
                                    }}
                                    placeholder="Rechercher un module..."
                                />
                            </div>
                            {formErrors.moduleId && <p className="text-red-500 text-xs mt-1">{formErrors.moduleId}</p>}
                        </div>
                        <div>
                            <label htmlFor="universityId" className="block text-sm font-medium text-gray-700">Université</label>
                            <div className={`rounded-md shadow-sm ${formErrors.universityId ? 'border border-red-500' : ''}`}>
                                <SearchableSelect
                                    options={universities}
                                    value={formActiveSubject.universityName}
                                    onChange={(option: any) => {
                                        setFormActiveSubject(prev => ({ ...prev, universityId: option?.id || '', universityName: option?.name || '' }));
                                    }}
                                    placeholder="Rechercher une université..."
                                />
                            </div>
                            {formErrors.universityId && <p className="text-red-500 text-xs mt-1">{formErrors.universityId}</p>}
                        </div>
                        <div>
                            <label htmlFor="year" className="block text-sm font-medium text-gray-700">Année</label>
                            <input
                                type="number"
                                name="year"
                                id="year"
                                value={formActiveSubject.year || ''}
                                onChange={(e) => {
                                    setFormActiveSubject(prev => ({ ...prev, year: e.target.value }));
                                }}
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${formErrors.year ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {formErrors.year && <p className="text-red-500 text-xs mt-1">{formErrors.year}</p>}
                        </div>
                        <div>
                            <label htmlFor="session" className="block text-sm font-medium text-gray-700">Session</label>
                            <select
                                name="session"
                                id="session"
                                value={formActiveSubject.session}
                                onChange={(e) => setFormActiveSubject(prev => ({ ...prev, session: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Normale">Normale</option>
                                <option value="Rattrapage">Rattrapage</option>
                                {/* Ajoutez d'autres types de session si nécessaire */}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="correction" className="block text-sm font-medium text-gray-700">Correction (HTML ou Texte)</label>
                            <textarea
                                name="correction"
                                id="correction"
                                rows={4}
                                value={formActiveSubject.correction || ''}
                                onChange={(e) => setFormActiveSubject(prev => ({ ...prev, correction: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {formActiveSubject.id ? 'Enregistrer' : 'Ajouter'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!subjectToDelete}
                onClose={() => setSubjectToDelete(null)}
                title="Confirmer la suppression"
            >
                <div>
                    <p className="text-gray-600 mb-4">
                        Êtes-vous sûr de vouloir supprimer le sujet suivant ? Cette action est irréversible.
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="font-bold text-gray-800">Sujet ID: {subjectToDelete?.id}</p>
                        <p className="text-sm text-gray-500">{subjectToDelete?.moduleName} - {subjectToDelete?.universityName}</p>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => setSubjectToDelete(null)}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleDeleteSubject}
                            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Supprimer
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}