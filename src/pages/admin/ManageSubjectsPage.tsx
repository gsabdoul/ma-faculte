import { useState, useMemo, useEffect, type ChangeEvent, type FormEvent } from 'react';
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
import { SearchableSelect } from '../../components/ui/SearchableSelect';

type ModuleId = string;

// Types for fetched data
// Simplified frontend shapes: we map DB fields to { id, name }
type Module = { id: string; name: string };
type University = { id: string; name: string };
type Faculty = { id: string; name: string };
type Level = { id: string; name: string };

// Aplatir/simplifier: we'll fetch sujets, modules and universites from Supabase

interface SubjectInfo {
    id: string;
    moduleId: string;
    moduleName: string;
    universityId: string;
    universityName: string;
    faculteId: string;
    faculteName: string;
    niveauId: string;
    niveauName: string;
    correction?: string | null;
    year?: number | null;
    session?: string;
    creatorId?: number;
    creatorName?: string;
}

const emptySubject = {
    id: null as string | null,
    moduleId: '',
    moduleName: '',
    universityId: '',
    universityName: '',
    correction: '' as string,
    year: '' as string | number | '',
    faculteId: '',
    faculteName: '',
    niveauId: '',
    niveauName: '',
    session: 'Normale', // Default value
};

// Helper function to transform Supabase subject data into SubjectInfo
const sujetToSubjectInfo = (
    s: any,
    mods: Module[],
    unis: University[],
    facs: Faculty[],
    lvls: Level[]
): SubjectInfo => {
    const module = mods.find(m => m.id === s.module_id);
    const uni = unis.find(u => u.id === s.universite_id);
    const fac = facs.find(f => f.id === s.faculte_id);
    const lvl = lvls.find(l => l.id === s.niveau_id);
    // La jointure se fait maintenant sur `profiles`, qui a `nom` et `prenom`
    const creatorName = s.created_by ? `${s.created_by.prenom || ''} ${s.created_by.nom || ''}`.trim() : 'Inconnu';

    return {
        id: s.id,
        moduleId: s.module_id,
        moduleName: module?.name || '',
        universityId: s.universite_id,
        universityName: uni?.name || '',
        faculteId: s.faculte_id,
        faculteName: fac?.name || '',
        niveauId: s.niveau_id,
        niveauName: lvl?.name || '',
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
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);

    // Load modules, universites, faculties, and levels from Supabase on mount
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [modsRes, unisRes, sujetsRes, facsRes, levelsRes] = await Promise.all([
                    supabase.from('modules').select('id, nom'),
                    supabase.from('universites').select('id, nom'),
                    // Maintenant que la FK pointe vers `profiles`, on peut faire la jointure
                    supabase.from('sujets').select('*, created_by (id, nom, prenom)'),
                    supabase.from('facultes').select('id, nom'),
                    supabase.from('niveaux').select('id, nom'),
                ]);

                if (cancelled) return;

                // console.log('Modules:', modsRes.data);
                // console.log('Universités:', unisRes.data);
                // console.log('Facultés:', facsRes.data);
                // console.log('Niveaux:', levelsRes.data);
                // console.log('Sujets:', sujetsRes.data);

                if (modsRes.error) throw modsRes.error;
                if (unisRes.error) throw unisRes.error;
                if (sujetsRes.error) throw sujetsRes.error;
                if (facsRes.error) throw facsRes.error;
                if (levelsRes.error) throw levelsRes.error;

                const mods: Module[] = (modsRes.data || []).map((m: any) => ({ id: m.id, name: m.nom }));
                const unis: University[] = (unisRes.data || []).map((u: any) => ({ id: u.id, name: u.nom }));
                const facs: Faculty[] = (facsRes.data || []).map((f: any) => ({ id: f.id, name: f.nom }));
                const lvls: Level[] = (levelsRes.data || []).map((l: any) => ({ id: l.id, name: l.nom }));

                const sujets = (sujetsRes.data || []).map(s => sujetToSubjectInfo(s, mods, unis, facs, lvls));

                setModules(mods);
                setUniversities(unis);
                setFaculties(facs);
                setLevels(lvls);
                setAllSubjects(sujets);
            } catch (_err) {
                console.error('Error loading data:', _err);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);
    const [currentPage, setCurrentPage] = useState(1);
    const SUBJECTS_PER_PAGE = 10;

    // États pour la modale et le formulaire d'ajout
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSubject, setActiveSubject] = useState(emptySubject);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!activeSubject.moduleId) errors.moduleId = 'Le module est requis.';
        if (!activeSubject.universityId) errors.universityId = 'L\'université est requise.';
        if (!activeSubject.faculteId) errors.faculteId = 'La faculté est requise.';
        if (!activeSubject.niveauId) errors.niveauId = 'Le niveau est requis.';
        if (!activeSubject.year) errors.year = 'L\'année est requise.';
        return errors;
    };

    const handleModalSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const errors = validateForm();
        setFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        try {
            setIsSubmitting(true);

            const payload: any = {
                module_id: activeSubject.moduleId,
                universite_id: activeSubject.universityId,
                faculte_id: activeSubject.faculteId,
                niveau_id: activeSubject.niveauId,
                correction: activeSubject.correction ? String(activeSubject.correction) : null,
                annee: activeSubject.year !== '' && activeSubject.year !== null ? Number(activeSubject.year) : null,
                session: activeSubject.session,
            };

            if (activeSubject.id) {
                // Mise à jour
                const updateRes = await supabase
                    .from('sujets')
                    .update(payload)
                    .eq('id', activeSubject.id);
                if (updateRes.error) throw updateRes.error;

                // Mettre à jour l'état local
                setAllSubjects(prevSubjects =>
                    prevSubjects.map(subject => {
                        if (subject.id === activeSubject.id) {
                            // Ensure the updated object matches the SubjectInfo interface
                            return {
                                ...subject,
                                moduleId: activeSubject.moduleId,
                                moduleName: activeSubject.moduleName,
                                universityId: activeSubject.universityId,
                                universityName: activeSubject.universityName,
                                faculteId: activeSubject.faculteId,
                                faculteName: activeSubject.faculteName,
                                niveauId: activeSubject.niveauId,
                                niveauName: activeSubject.niveauName,
                                correction: activeSubject.correction,
                                year: Number(activeSubject.year),
                                session: activeSubject.session,
                            };
                        }
                        return subject;
                    })
                );
            } else {
                // Ajout
                const insertRes = await supabase
                    .from('sujets')
                    .insert({ ...payload, created_by: user?.id })
                    // On récupère le nouvel objet avec les infos du profil
                    .select('*, created_by (id, nom, prenom)')
                    .single();
                if (insertRes.error) throw insertRes.error;

                // Ajouter le nouveau sujet à l'état local
                const newSubjectData = insertRes.data;
                const newSubjectInfo = sujetToSubjectInfo(newSubjectData, modules, universities, faculties, levels);
                setAllSubjects(prevSubjects => [newSubjectInfo, ...prevSubjects]);
            }

            setIsModalOpen(false);
        } catch (err: any) {
            alert(err?.message || 'Une erreur est survenue.');
        } finally {
            setIsSubmitting(false);
        }
    };

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

    const openModalForEdit = (subject: SubjectInfo) => {
        const module = modules.find(m => m.id === subject.moduleId);
        const university = universities.find(u => u.id === subject.universityId);
        const faculte = faculties.find(f => f.id === subject.faculteId);
        const niveau = levels.find(l => l.id === subject.niveauId);
        setActiveSubject({
            id: subject.id,
            moduleId: module?.id || '',
            moduleName: module?.name || subject.moduleName,
            universityId: university?.id || '',
            universityName: university?.name || subject.universityName,
            correction: subject.correction || '',
            year: subject.year ?? '',
            faculteId: faculte?.id || '',
            faculteName: faculte?.name || subject.faculteName,
            niveauId: niveau?.id || '',
            niveauName: niveau?.name || subject.niveauName,
            session: subject.session || 'Normale',
        });
        setIsModalOpen(true);
        setFormErrors({});
    };

    const openModalForAdd = () => {
        setActiveSubject(emptySubject);
        setIsModalOpen(true);
        setFormErrors({});
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
                    onClick={openModalForAdd}
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
                                    <button onClick={() => openModalForEdit(subject)} className="text-gray-500 hover:text-blue-500 p-2" title="Modifier"><PencilIcon className="h-5 w-5" /></button>
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
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setFormErrors({});
                }}
                title={activeSubject.id ? "Modifier le sujet" : "Ajouter un nouveau sujet"}
            >
                <form onSubmit={handleModalSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700">Module</label>
                            <div className={`rounded-md shadow-sm ${formErrors.moduleId ? 'border border-red-500' : ''}`}>
                                <SearchableSelect
                                    options={modules}
                                    value={activeSubject.moduleName}
                                    onChange={(option: any) => {
                                        setActiveSubject(prev => ({ ...prev, moduleId: option?.id || '', moduleName: option?.name || '' }));
                                        if (formErrors.moduleId) setFormErrors(prev => ({ ...prev, moduleId: '' }));
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
                                    value={activeSubject.universityName}
                                    onChange={(option: any) => {
                                        setActiveSubject(prev => ({ ...prev, universityId: option?.id || '', universityName: option?.name || '' }));
                                        if (formErrors.universityId) setFormErrors(prev => ({ ...prev, universityId: '' }));
                                    }}
                                    placeholder="Rechercher une université..."
                                />
                            </div>
                            {formErrors.universityId && <p className="text-red-500 text-xs mt-1">{formErrors.universityId}</p>}
                        </div>
                        <div>
                            <label htmlFor="faculteId" className="block text-sm font-medium text-gray-700">Faculté</label>
                            <div className={`rounded-md shadow-sm ${formErrors.faculteId ? 'border border-red-500' : ''}`}>
                                <SearchableSelect
                                    options={faculties}
                                    value={activeSubject.faculteName}
                                    onChange={(option: any) => {
                                        setActiveSubject(prev => ({ ...prev, faculteId: option?.id || '', faculteName: option?.name || '' }));
                                        if (formErrors.faculteId) setFormErrors(prev => ({ ...prev, faculteId: '' }));
                                    }}
                                    placeholder="Rechercher une faculté..."
                                />
                            </div>
                            {formErrors.faculteId && <p className="text-red-500 text-xs mt-1">{formErrors.faculteId}</p>}
                        </div>
                        <div>
                            <label htmlFor="niveauId" className="block text-sm font-medium text-gray-700">Niveau</label>
                            <div className={`rounded-md shadow-sm ${formErrors.niveauId ? 'border border-red-500' : ''}`}>
                                <SearchableSelect
                                    options={levels}
                                    value={activeSubject.niveauName}
                                    onChange={(option: any) => {
                                        setActiveSubject(prev => ({ ...prev, niveauId: option?.id || '', niveauName: option?.name || '' }));
                                        if (formErrors.niveauId) setFormErrors(prev => ({ ...prev, niveauId: '' }));
                                    }}
                                    placeholder="Rechercher un niveau..."
                                />
                            </div>
                            {formErrors.niveauId && <p className="text-red-500 text-xs mt-1">{formErrors.niveauId}</p>}
                        </div>
                        <div>
                            <label htmlFor="year" className="block text-sm font-medium text-gray-700">Année</label>
                            <input
                                type="number"
                                name="year"
                                id="year"
                                value={activeSubject.year || ''}
                                onChange={(e) => {
                                    setActiveSubject(prev => ({ ...prev, year: e.target.value }));
                                    if (formErrors.year) setFormErrors(prev => ({ ...prev, year: '' }));
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
                                value={activeSubject.session}
                                onChange={(e) => setActiveSubject(prev => ({ ...prev, session: e.target.value }))}
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
                                value={activeSubject.correction || ''}
                                onChange={(e) => setActiveSubject(prev => ({ ...prev, correction: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => {
                                setIsModalOpen(false);
                                setFormErrors({});
                            }}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {activeSubject.id ? 'Enregistrer' : 'Ajouter'}
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